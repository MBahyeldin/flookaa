# WWW-94 — Frontend: community page as hero + sections

Eighth ticket of epic WWW-86, on top of WWW-82 (`Hero`, `Cover`, section nav), WWW-93 (`ChannelTile`), WWW-88 (states) and WWW-80 (theme, cover, logo). Frontend, plus one field on the community response.

Same route (`/communities/:slug`), same file (`pages/(dashboard)/communities/[slug]/index.tsx`), new layout on the existing services and hooks: `getCommunityBySlug`/`getCommunity`, `getChannels({communityId})`, `subscribeToCommunityEvents`, the notification-version refetch, `MembersSheet`, `SuggestChannelDialog`, `CommunityRulesDialog`, `CommunityForm`. Realtime and access unchanged.

Design: "Flookaa v2", Community Desktop `20:1038` · Tablet `20:1517` · Mobile `20:1903`; Patterns `Hero` `14:257` (Community), `Section Header` `15:115`, `Tile` `15:309`, `About Block` `15:334`, `People Strip` `15:310`. Pulled read-only on 2026-10-22.

## Decisions (user agreed, 2026-10-22)

1. **One page, as Figma**, not tabs: Channels, then About and People (side by side from `lg`, stacked below). The section nav jumps to a section and highlights the one in view. Unlike the channel page, there is no `?tab=`.
2. **"See all"**: the grid shows the first 6 tiles; "See all n" reveals the rest in place (the same one fetch of up to 100 as today). The link only appears when there are more than 6.
3. **Manager controls**: the hero's `⋯` menu holds them. Pending counts go on one notice line under the hero, for managers only.

## Backend

| Change | Detail |
|---|---|
| Community response gains `created_at` | `db.Community.CreatedAt` is already on every row `build` gets; add `CreatedAt string \`json:"created_at"\`` (RFC 3339, UTC) and set it in `build`. No query or codegen change. `types/community.ts` gains `created_at: string`. |

## Shared pieces

| Piece | Spec |
|---|---|
| `components/people-strip/PeopleStrip` (new, moved out of `ChannelPeople`) | `{people, total, moderators}`. The overline "People", up to 6 avatars (40 px, overlapping `-me-2`, anonymous ones dashed with `GeneratedAvatarFallback`, each a `PersonaLink`), then "+n members" (`formatCount`), then the "Moderators" line (24 px avatar + name each). Person shape = `{persona_id, first_name, last_name, thumbnail, anonymous}` (both member types already fit `PersonRow`'s). `ChannelPeople` uses it, with its full list underneath unchanged. |
| `SectionNav` in jump mode | No component change: `SectionNav` (Radix Tabs root) is controlled, with no `SectionNavContent`. Clicking a tab calls `scrollIntoView` on `#channels` / `#about` / `#people` (sections get `scroll-mt-28 md:scroll-mt-14` so the sticky nav doesn't cover their heading). An `IntersectionObserver` sets the active tab to the topmost section in view. If the page opens with one of these hashes, it scrolls there once the community has loaded. Clicking updates the hash with `replace`, so a link to `#about` can be shared without adding history entries. |

## Community page

Wrapper: `<div data-theme={community.theme} className="min-h-full bg-background text-foreground">`. The page content takes the community's palette; the sidebar and the mobile header keep the viewer's. Each `ChannelTile` keeps its own channel's accent (WWW-93). A theme or cover change arrives as `info.update` → refetch, as today.

**Hero (Community)** via `Hero` + `Cover pattern={community.cover_pattern}`. The old `banner` image is no longer shown; photo covers are WWW-92.
- Media: `Logo` from `thumbnail` (lg on mobile, xl from `md`), initials fallback.
- Tags: `Badge` Public (`Globe`) / Private (`Lock`), and `AgeBadge`.
- Name; tagline = description (clamped, full text under About).
- Facts: "640 members · 1.1k followers · 6 channels" (`formatCount`; followers left out on a private community). "n members" opens `MembersSheet` when `canSeeInside`.
- Actions, using the same states as `CommunityTile`:
  - none: `Join community` (primary), or `Request to join` when private. Rules → `CommunityRulesDialog` first, as today.
  - joined: `✓ Joined` (secondary); clicking it confirms "Leave X?". The owner gets no join button.
  - pending: `🕒 Requested` (outline); clicking it confirms and cancels.
  - rejected: `Request declined` (outline, disabled).
  - `Follow` / `Following` (outline), public only.
  - `⋯` (dropdown): Copy link; Suggest a channel (when `canSuggest`, as today); for managers: Edit community (the existing sheet), Create channel (`/channels/create?community=<id>`), Members & requests (`MembersSheet` on Members).
  - Buttons use `loading`. There are no success toasts, but failures toast with today's messages (`cannot_follow_private`, `recently_rejected`).
- **Notice line** (managers, only when a count is > 0), under the hero: "3 requests to join · 1 channel wants to join". Each count is a link-style button that opens `MembersSheet` on Requests or Channels. Counts come from today's two fetches, refreshed on the same events.
- The declined note ("Your request was declined. You can ask again on <date>.") sits under the facts while `membership_status = rejected`, as today.

**Section nav**: Channels · About · People, sticky (`top-14 md:top-0`), in the content column's padding (`px-4 md:px-8 xl:px-16`).

**Channels** (`#channels`)
- Section header: overline "Channels", title "In this community" (`text-h3`), and "See all n ›" (ghost, end) when there are more than 6.
- `grid gap-4 sm:grid-cols-2 lg:grid-cols-3` of `ChannelTile`s, the first 6 until "See all". Managers keep "Remove from community" under each tile, as today.
- Loading: `SkeletonList` in the grid. Failed: `ErrorState` with retry. Empty: `EmptyState` "No channels in this community yet" with Create channel (managers) or Suggest a channel, as today.
- Not `canSeeInside` (private, not a member): `EmptyState` with `Lock`, "Members only", "Join to see this community's channels." The action is Request to join when the status is none. Pending shows "Your request is waiting for approval." and rejected shows the declined note, with no action in either case.

**About** (`#about`): the About Block (`bg-surface-sunken rounded-lg p-6`, no border).
- Overline "About", full description (pre-line), `InterestChips`.
- Facts with icons: `Globe`/`Lock` "Public · anyone can read and join" / "Private · members see inside; joining takes a request"; `Clock` "Created <Month YYYY> by <owner>" (owner via `PersonaLink`, anonymous stays anonymous; left out when the owner is gone, keeping the date); `ShieldCheck` "<n>+".
- **Rules** (when set), after a divider: overline "Rules", then an ordered list built from the text's non-empty lines. A leading `1.` / `1)` / `-` / `•` is dropped from each line, so rules written either way number cleanly. The first 5 show; "Show all n rules ⌄" / "Show fewer ⌃" toggles the rest. A single paragraph becomes rule 1. Nothing about storage changes.
- `ChannelAbout` and the community About share the overline/fact-row markup through a small `components/about-block` (`AboutBlock`, `AboutFact`), so they stay identical.

**People** (`#people`)
- `canSeeInside`: `PeopleStrip` from `listCommunityMembers(id, 50)`. Owner and moderators sort first server-side, so one page covers the moderators line. `total` = `members_count`. Clicking "+n members" opens `MembersSheet`. Refetched on `counts` and `moderator` events (today's `membersKey`). While loading it shows a strip-shaped skeleton; a failure shows `ErrorState compact`.
- Not `canSeeInside`: just "640 members", with no avatars, since the server refuses the list.
- `MembersSheet` stays as it is until WWW-105.

**Layout**: content column `max-w-[1064px]`, `px-4 md:px-8 xl:px-16`, sections `gap-12`. From `lg`, About and People sit side by side (About about 7/12, People 5/12), as in `20:1038`; below `lg` they stack (About, then People), as in `20:1903`. On mobile the hero buttons share the row (`flex-1`, with the `⋯` icon button).

**Loading / errors**: a hero-shaped skeleton (cover band, logo, two lines). Missing → `NotFound`, as today. Failed → `ErrorState` with retry (replacing the bare "Please reload" line).

**Realtime**: unchanged. `info`, `channels`, `counts`, `join_request`, `channel_request` and `moderator` keep their handlers, `canManage` still resubscribes, and the pending viewer still refetches on a notification.

## Steps

1. Backend `created_at`; `go build ./...` in `backend/`.
2. `PeopleStrip` and `AboutBlock`; switch `ChannelPeople`/`ChannelAbout` to them (no visual change).
3. Community page: wrapper, hero, actions and `⋯` menu, notice line.
4. Section nav in jump mode with scroll-spy and hash.
5. Channels section (6 + See all), About (rules list), People.
6. Loading/error states. CLAUDE.md: one line under Communities "Pages" (one page, sections, no `?tab=`) and `created_at` on `Community` responses.

## Verification

- `go build ./...` in `backend/`; `pnpm build` and `pnpm lint` in `front-end/`.
- Browser (dev server against lxd-development-app) at 1440, 834 and 390:
  - Hero, sections and About/People columns match `20:1038` / `20:1517` / `20:1903`. Try communities in two palettes, dark mode and every cover pattern.
  - Nav: clicking scrolls, the active tab follows scrolling, the sticky nav sits under the mobile header, and opening `#people` lands there.
  - Join, leave, request, cancel and follow, on public and private communities, as owner, manager, member and stranger. Rules dialog before joining. A second browser approves a request live.
  - More than 6 channels → See all. Rules with more than 5 lines → Show all; numbered and plain text both list cleanly.
  - Private community as a stranger: locked channels, member count only, About visible.
  - Manager: `⋯` items, notice counts update live, `?members=requests` (notification link) still opens the sheet.
  - The channel page's About and People look unchanged.

## Out of scope

- Members and requests sheet redesign (WWW-105), create/edit form redesign (WWW-104), photo covers (WWW-92), share (WWW-108).
- Community posts feed (communities have no posts of their own).
