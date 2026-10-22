# WWW-82 — Frontend: hero, section nav and channel page

Seventh ticket of epic WWW-86, on top of WWW-80 (theme, cover, logo), WWW-87 (primitives), WWW-85 (shell), WWW-88 (states) and WWW-93 (tiles). Mostly frontend, with two small backend changes (below).

Same route (`/channels/:id`), same file (`pages/(dashboard)/channels/[id]/index.tsx`), new layout on the existing hooks: `useGetChannelQuery`, the posts store, `subscribeToChannelEvents`, `ModerationSheet`, `PostDialog`, `PostCreator`. Realtime and access unchanged.

Design: "Flookaa v2", Channel Desktop `17:2` · Tablet `17:518` · Mobile `17:812`; Patterns `Hero` `14:257`, `Cover` `13:36`, `Section Nav` `10:88`, `About Block` `15:334`, `People Strip` `15:310`, `Composer` `16:496` (Collapsed); palette switch `28:4368` / `28:4455` / `28:4542`. Pulled read-only on 2026-10-22.

## Decisions (user agreed, 2026-10-22)

1. **Who sees the People tab**: the channel's readers (every persona on a public channel, active members on a private one), like a community's member list. Today `GET /channels/:id/members` is moderators only. Names still go through `anonymize`, so private personas show their anonymous name.
2. **People tab content**: the strip (6 avatars + "+n members"), the moderators line, then the full member list as `PersonRow`s (the strip alone has nothing to click).
3. **Hero menu (⋯)**: "Copy link" for everyone, plus "Manage channel" for moderators. Share proper is WWW-108.

## Backend

| Change | Detail |
|---|---|
| GraphQL `Channel` gains `isPrivate: Boolean!`, `isPending: Boolean!`, `isOwner: Boolean!` | `GetChannelRow` already has `visibility`, `is_pending`, `is_owner`; the resolver just maps them. Removes the page's "pending only lasts this view" workaround. `make generate-models`, then `pnpm codegen`. |
| `GET /channels/:channel_id/members` → `CanRead` | New `requireReader` beside `requireModerator` (404 for non-readers, as everywhere). Same response; `ModerationSheet` keeps using it. Remove stays moderator only. |

CLAUDE.md: the channel access line about moderators listing members becomes "readers list members, moderators remove them".

## Shared pieces (new)

| Piece | Spec |
|---|---|
| `components/cover/Cover` | `{pattern, className}`. The four Figma patterns (Horizon, Waves, Hills, Stripes) as inline SVG, `viewBox 0 0 1200 300`, `preserveAspectRatio="xMidYMid slice"`, fills from tokens (`fill-accent`, `fill-primary` with the Figma opacities, `fill-card` for the Hills sun), so it recolours with the palette and in dark mode. `aria-hidden`. |
| `components/hero/Hero` | Anatomy only, variants by props, not by type: `cover` (node), `media` (logo or avatar node), `tags`, `name`, `tagline`, `facts`, `actions`. Full width, on `bg-background`, not a card. Cover band `h-[150px]` mobile / `h-[280px]` from `md`, overflow hidden. Identity row overlaps it by 40 / 56 px: mobile is a column (`px-4 gap-3`, logo `lg` 80, actions full width with equal `flex-1` buttons); from `md` a row (`px-16 gap-6`, logo `xl` 112, text and actions with `pt-[68px]` so they start below the cover). Name `text-display` semibold, tagline `text-lead` light muted (`line-clamp-2`), facts 14 muted. Bottom padding 20 / 32. Text never sits on the cover. Community (WWW-94) and Persona (WWW-113) use the same component. |
| `Tag` | Hero tags are `Badge` (the Figma Tag): "Public" with `Globe` / "Private" with `Lock`, and `AgeBadge`. |
| `SectionNav` | Exists (WWW-87). Sticky offset: `top-14 md:top-0`, so it sits under the mobile header. |

## Channel page

Wrapper: `<div data-theme={channel.theme} className="min-h-full bg-background text-foreground">`. Everything inside (hero, nav, composer, posts) takes the channel's palette; the sidebar and mobile header keep the viewer's. A theme or cover change arrives as `info.update` → refetch, as today.

**Hero (Channel)**
- Cover: `Cover pattern={channel.coverPattern}` (photo covers are WWW-92). Logo: `Logo size="xl"` (lg on mobile) from `thumbnailUrl`, initials fallback.
- Tags: Public/Private, age.
- Name, tagline = description (clamped; full text under About).
- Facts: "1.2k members · 340 followers · Part of <community>" (`formatCount`; the community a link to `/communities/:slug`; left out when none).
- Actions, same states as `ChannelTile`:
  - none: `Join channel` (primary) or `Request to join` (private).
  - joined: `✓ Joined` (secondary), click confirms "Leave X?".
  - pending: `🕒 Requested` (outline), click cancels the request.
  - owner: no join button (the owner can't leave).
  - `Follow` / `Following` (outline).
  - `⋯` icon button (dropdown): Copy link; Manage channel (moderators, opens `ModerationSheet`).
  - Buttons use `loading`; no success toasts (the button is the feedback); failures toast.
- The breadcrumb goes (the shell's sidebar marks Channels; the Figma frame has none).

**Section nav**: Posts · About · People, with `?tab=about|people` in the URL (Posts is the default and has no param), so the browser back button and shared links work. `?post=` (PostDialog) is untouched.

**Posts tab** (`max-w-[1064px]` column, `px-4 md:px-16`, as in Figma revision 4: no aside)
- Readers who can write (active members): the slim composer bar (`Card` `p-3`, persona avatar, "Write in <channel>…", image and mic icon buttons). Clicking anywhere on it expands the existing `PostCreator` in place (with the editor focused); "Cancel"/a successful post collapses it. The full v2 composer and the mobile full-screen sheet are WWW-109. Non-members get no bar (hide inactive).
- "N new posts" button, then the posts with the existing `Post` card. The Canvas preview is WWW-83, which swaps the card everywhere at once.
- Empty: `EmptyState` "No posts yet" (as today). A private channel the viewer can't read: `EmptyState` with `Lock`, "Members only", "Join to read and post here." and the same Join/Request action (only when not pending).
- Load more and its skeleton unchanged.

**About tab** (the About Block at full width: `bg-surface-sunken rounded-lg p-6`, no border)
- Overline "About", the full description (16, pre-line).
- Interests (`InterestChips`, all of them).
- Facts with icons: `Globe`/`Lock` "Public · anyone can read and join" / "Private · members read and post; joining takes a request"; `Clock` "Created <Month YYYY> by <owner>" (owner via `PersonaLink`, so anonymous owners stay anonymous); `ShieldCheck` "<n>+".
- Community: "Part of <community>" with its link. Channels have no rules, so the Figma Rules part is not shown.

**People tab** (readers only; a non-reader sees the "Members only" state)
- Overline "People", the strip: first 6 members as 40 px avatars overlapping by 8, anonymous ones dashed (`GeneratedAvatarFallback`, `border-dashed bg-muted`), then "+n members".
- "Moderators" line: owner and moderators as 24 px avatars + names.
- Then every member as a `PersonRow` (opens the persona card).
- `SkeletonList` while loading, `ErrorState compact` with retry, `EmptyState` never (the owner is always a member).
- Refetched on `member.*` events while the tab is open.

**Loading / errors**: a hero-shaped skeleton (cover band, logo, two lines) instead of "Loading channel…". Not found → `components/not-found` ("Page not found"), so a hidden channel reads like any missing page. Other errors → `ErrorState` with retry (refetch).

**Realtime** (unchanged subscriptions):
- `member`/`follower` counts as today.
- `join_request.delete` for me with reason `rejected` clears `isPending` (today nothing tracks it).
- `info.update` refetches (theme, cover, age, now also name/logo through `PATCH`).

## Mobile / tablet

- < 768: hero column layout, buttons share the row (`flex-1` + icon button), nav scrolls sideways under the mobile header, column `px-4`.
- 768–1439: row hero with `px-8`, column full width.
- RTL is WWW-91; nothing here uses physical left/right except the overlapping avatars (`-me-2`).

## Steps

1. Backend: GraphQL fields + resolver, `requireReader` on members; `make generate-models`, `pnpm codegen`.
2. `Cover`, `Hero`.
3. Channel page: wrapper, hero, actions, nav with `?tab`.
4. Posts tab (composer bar, locked state), About tab, People tab.
5. Loading/not-found/error states, realtime rejection.
6. CLAUDE.md (members access; one line on `Hero`/`Cover` in Frontend conventions).

## Verification

- `go build ./...` in `backend/` and `shared/`; `pnpm build` and `pnpm lint` in `front-end/`.
- Browser (dev server against lxd-development-app) at 1440, 834, 390:
  - Hero matches `17:2` / `17:518` / `17:812`; channels in Forest, Ember, Plum and one inheriting its community's theme; dark mode; each cover pattern.
  - Join/leave/request/cancel/follow on public and private channels, as owner, member and stranger; a second browser approves and rejects a request live.
  - Tabs: URL updates, back button, sticky nav under the mobile header, `?post=` dialog still opens.
  - People: anonymous members dashed and anonymous; a non-member of a private channel gets "Members only" on Posts and People, About works.
  - Composer bar only for members; expands, posts, collapses.

## Out of scope

- Canvas post preview (WWW-83), the v2 composer and its mobile sheet (WWW-109), share (WWW-108), photo covers (WWW-92).
- The community page (WWW-94) and persona profile (WWW-113), which reuse `Hero` and `Cover`.
- Channel rules.
