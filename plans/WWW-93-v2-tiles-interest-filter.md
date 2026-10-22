# WWW-93 — Frontend: channel and community tiles, interest filter row

Sixth ticket of epic WWW-86, on top of WWW-87 (primitives), WWW-88 (list states) and WWW-80 (theme, cover, logo on list items). Frontend only.

One tile for channels and communities replaces `ChannelCard` / `ChannelCardBody` / `CommunityCard` / `CommunityCardBody` everywhere they're used. The interest filter becomes one scrolling row plus an "All interests" sheet. Same routes, new layout, existing services.

Design: "Flookaa v2", Patterns `Tile` `15:309` (Channel/Community × None/Joined/Pending), `Interest Filter` `16:497`, Components `Chip` `9:227`. In context: Channels Desktop `84:2183` · Tablet `84:2540` · Mobile `84:2827`, Communities `84:3010` · `84:3363` · `84:3650`, states `84:3833` / `84:4023` / `84:4176`, community grid `20:1038`, onboarding `26:417` / `26:604` / `26:1645`. Pulled read-only on 2026-10-22.

## Decisions (user, 2026-10-22)

- **The first filter chip is "All"**, not Figma's "For you": it means no filter, as today. "For you" stays a Discover idea (WWW-84).
- **Channel facts line = followers** ("340 followers"); private channels show "Members only", as in Figma. No weekly post count (no backend for it).

## Tile

`components/tile/` (new):

| Piece | Spec |
|---|---|
| `Tile` | Anatomy only. `Card` `h-full flex flex-col`, `overflow-hidden`, no padding at the top: a 4px accent edge (`bg-primary` inside `data-theme={theme}`), then `p-5 gap-3`. Header: `Logo size="md"` (also inside the theme scope), name (`text-h4` medium, one line, a `Link` when `href` is given), meta line (12, muted). Description (14, muted, `line-clamp-3`; grows, so short ones don't leave a gap above the chips). `InterestChips limit={3}`. Facts line (12, muted). Action row `mt-auto pt-1 flex gap-2`, children. |
| `ChannelTile` | `{channel, onChange?, linked = true}`. Meta "Public · 1.2k members" / "Private · 89 members", plus `AgeBadge`. Facts: "N followers" or "Members only". Actions below. |
| `CommunityTile` | `{community, onChange?}`. Meta "Public · 3.1k members", plus `AgeBadge`. Facts "4 channels". Actions below. Rules dialog (`CommunityRulesDialog`) before joining one with rules. |

Only the logo and the accent edge take the entity's theme (`plans/WWW-77-redesign.md` §3: "lists stay calm"). Buttons and chips keep the page's palette.

**Actions** (same for both, from the Tile set):

| State | Primary (flex-1) | Follow |
|---|---|---|
| none | `Join` (primary); private: "Request to join" | `Follow` / `Following` (outline) |
| joined | `✓ Joined` (secondary); click asks "Leave X?" and leaves | same |
| pending | `🕒 Requested` (outline); click cancels the request | same |

- Follow is not rendered on a private community (`cannot_follow_private`, per the WWW-118 note). Channels have no such rule.
- A community in its rejection cooldown shows "Ask again on <date>" (muted text) instead of Join: nothing to press until then (hide inactive buttons).
- Buttons use `loading` while their request runs; the tile's other button is disabled meanwhile.
- No success toasts (the button state is the feedback); failures toast as today.
- The tiles own the join/leave/follow calls and keep their item's state. `onChange(patch)` tells the parent about the new `is_member` / `is_pending` / `is_follower` / counts (channels) or `membership_status` / `following` / `members_count` (communities). The onboarding steps use it for "n selected"; lists don't pass it. This removes the copied action code in both steps.
- A community owner's "Joined" (list items carry no `is_owner`) leaves through the server, which refuses; the error toasts. Not worth a field.

**Dropped from the old cards**: the banner/thumbnail image header, the "Private" overlay badge (the meta line says it), and the channel's "Part of <community>" link (the Figma list frames show visibility there; the channel page shows its community, WWW-82).

**Numbers**: `formatCount` in `lib/format.ts` (new, `Intl.NumberFormat` compact, `1.2k`), with singular/plural words.

**Skeleton**: lists keep `SkeletonList variant="post"` (WWW-88 made `SkeletonPost` the tile skeleton too, as on Channels · Loading).

## Grid

`grid gap-4 sm:grid-cols-2 lg:grid-cols-3` everywhere tiles are listed. Grid items stretch, and the tile is `h-full` with the action row pinned to the bottom, so a row's tiles share their height and their buttons one baseline.

## Interest filter

`components/interests/InterestFilter.tsx` rewritten; same props (`value` slug, `onChange`), plus it reports the selected interest's name for the empty state (`onSelectedName?`).

- Data: `GET /persona/:persona_id/interests` for the current persona (one call gives the catalogue groups and the persona's ids).
- Row: `All` chip, then the persona's interests in catalogue order, as `Chip kind="filter"`, in one line that scrolls sideways (`overflow-x-auto`, scrollbar hidden). If the selected interest isn't one of the persona's (from the sheet or a shared URL), it's shown right after `All`. "All interests" is an outline `Button size="sm"` with `SlidersHorizontal`, outside the scroller, pinned right.
- Sheet: `Sheet` (right on desktop, bottom on mobile), title "All interests", the groups with their headings and filter chips (as in the onboarding Interests step, single select). Picking one sets the filter and closes the sheet; picking the selected one clears it.
- A persona with no interests gets just `All` + "All interests".
- If the interests call fails, the row shows `All` + "All interests" and the sheet shows an `ErrorState compact` with retry.

## Pages

| Where | Change |
|---|---|
| `/channels` | Header as Figma: `h1` "Channels", subtitle "Every channel you can see. Public ones open at once; private ones take a request.", "Create channel" button under it. The non-working search input goes (hide inactive). Filter row, then the tile grid. Filtered empty state: "No channels for <interest> yet" · "Try another interest, or start the first one." · Show all. |
| `/communities` | Same header pattern: "Communities", "Groups of channels around one place or passion. Join to take part, follow to keep up.", "Create community". Tiles now carry Join/Follow (today the card is only a link; the name links to the page). Filtered empty state with the interest name. |
| `/communities/:slug` channels grid | `ChannelTile` in the new grid. Managers keep "Remove from community" under each tile. The rest of that page is WWW-94. |
| Onboarding Communities / Channels steps | `CommunityTile` / `ChannelTile linked={false}` with `onChange` updating the step's items. Grouping, footer and "n selected" unchanged. |

`ChannelCard.tsx` and `CommunityCard.tsx` are deleted.

## Types

`Channel` gains `theme: PaletteId`, `own_theme: PaletteId | null`, `cover_pattern: CoverPattern`; `Community` gains `theme`, `cover_pattern`. `CoverPattern` (`horizon | waves | hills | stripes`) in `types/`. The API already returns them (WWW-80).

## CLAUDE.md

Onboarding bullets: `CommunityCardBody` / `ChannelCardBody` (`linked={false}`) become `CommunityTile` / `ChannelTile`. Frontend conventions: one line on the tiles (`components/tile`, theme only on logo and accent edge) and the interest filter row.

## Steps

1. Types, `formatCount`.
2. `Tile`, `ChannelTile`, `CommunityTile`.
3. `InterestFilter` row + sheet.
4. `/channels`, `/communities`, community channel grid, onboarding steps; delete the old cards.
5. CLAUDE.md.

## Verification

- `pnpm build` and `pnpm lint` in `front-end/`.
- In the browser (dev server against lxd-development-app): `/channels` and `/communities` at 1440, 834 and 390; tiles in a row share height and button baseline; a channel with its own theme and one inheriting its community's show their palettes on logo and edge only; join/leave/follow on public and private items; private community has no Follow; filter row scrolls on mobile, sheet picks and clears, a `?interest=` outside the persona's interests shows in the row; filtered empty state names the interest; onboarding steps 3 and 4 count selections as before.

## Out of scope

- Covers on tiles (not in the Tile design; covers are for heroes, WWW-82 / WWW-94).
- The rest of the community page (WWW-94), Discover and its "For you" (WWW-84).
- A weekly post count.
