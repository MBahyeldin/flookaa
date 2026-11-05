# WWW-96 — Figma: notifications page and popover

Figma only, no code, in "Flookaa v2" (`cB5tjyC1Vpx9aMQsrX0kDY`, Sara's team). Follows `plans/WWW-77-figma-handoff.md`; WWW-102 implements it. Frames at 1440 / 834 / 390 with Theme and Breakpoint modes set.

## Goal

WWW-102 can build `/notifications` and the popover without inventing UI: every kind, every row state, every list state.

## What exists today

- Rows come from `components/notifications/describe.ts`: bold actor (`"Amira and 4 others"` for aggregated kinds), message, link. Avatar = actor, else the channel thumbnail. Unread = tinted row + primary dot. Anonymous actors get a generated avatar.
- Desktop/tablet: the sidebar's Notifications entry (with count badge) is a **link** to `/notifications`. Mobile: the header bell opens a popover (latest rows, Mark all read, See all).
- The page: title, Mark all read (only with unread), one card of rows, "Load more" paging.

## Proposal

### Where

New page **Notifications & Settings** (WWW-97 adds settings to it later). Sections: Components, Popover, Page, States.

### New components (Components page first, then screens use them)

- **`Notification Row`** — variants `State` (Unread / Read / Hover) × `Lead` (Actor / Entity).
  - Lead Actor: 40 px `Avatar` with a 18 px kind badge on its corner (icon in a `primary` circle: heart for likes, message-circle for comments/replies, user-plus for follows and invitations, inbox for requests, check for approvals, x for rejections/removal). Lead Entity: `Logo` of the channel or community, for kinds with no actor (`request_approved`, `removed_from_channel`, `channel_request_*`, `community_request_*`).
  - Text: actor in semibold, message in regular, wraps to 3 lines max. Second line: relative time · context (channel or community name with its 16 px `Logo`), muted.
  - Unread: `accent` tint + 8 px `primary` dot at the end. Read: no tint, no dot.
- **`Notification Popover`** — header (title, "Mark all read" ghost `Button`), list of rows (max height, scrolls), footer "See all notifications". 384 px wide.

### Popover

- **Desktop and tablet:** clicking the sidebar entry opens the popover beside the sidebar (anchored to the entry, to its right), instead of navigating. "See all" goes to the page. One frame each on Feed `21:2` (expanded sidebar) and the rail (834).
- **Mobile (390):** the header bell opens it as today, full width under the header with a 16 px gutter.
- States: with unread, all read (no Mark all read), loading (3 `Skeleton` rows), empty (`Empty State` compact, "No notifications yet"), error (`Error State` compact).

### Page `/notifications`

- App shell like Feed, one 640 px column: `h1` "Notifications", unread count as `Count Badge`, "Mark all read" outline `Button` (hidden when nothing is unread).
- Rows grouped under overline headings **Today / This week / Earlier** (by `updated_at`, frontend only), in a bordered card per group.
- Paging: "Load more" outline button under the list, and a loading row while it loads.
- States: loading (`Skeleton` rows), empty ("You're all caught up"), error with Retry, "Couldn't load more" toast.

### Kinds gallery

One frame on the page, Desktop width, listing a row for **every kind** in `describe.ts` with real copy (18 kinds), including: aggregated ("Amira and 4 others liked your post in Sports"), single actor, anonymous actor ("Quiet Otter 37 replied to your comment"), entity-lead kinds, a wall post (context = persona, not channel).

Content in Deep Tide Light, plus the page in one dark palette and one other light palette.

## Decisions (user, 2026-10-27)

1. The desktop/tablet sidebar entry opens the popover; "See all" goes to the page.
2. The page groups rows under Today / This week / Earlier.
3. No inline actions: request and invitation rows stay links to where you act today.
4. No filter tabs: the API has no filter.

## Done when

- Components, popover (3 widths + states), page (3 widths + states) and kinds gallery exist, built from instances and bound variables only.
- Screenshots show no overlaps or clipped text; contrast AA in every state.
- Ids in `plans/WWW-77-figma-handoff.md`; frame links in WWW-102's Design section.

## Gotchas

- `whoami` must be Sara's account before any write.
- Arabic/RTL is not needed here (WWW-91 / WWW-95).

## Build notes (2026-10-27)

- The context line is text only (`2m · Sports`, `Mon · on Laila Farouk’s wall`); a 16 px logo there was too small to read, and the Logo component has no size under 32.
- Kind badge is 18 px at the lead's bottom-right, so it clears the initials. Entity lead = `Logo` sm (32) centred in the 40 px slot.
- Unread = `accent` at 40 %, hover = `accent`. Muted text stays ≥ 5.1:1 on every row background in all 7 palettes; the badge icon ≥ 6.1:1.
- The tablet rail has no badge on its Notifications item (the collapsed `Sidebar/Item` has none); the popover still opens from it.
- Ids are in `plans/WWW-77-figma-handoff.md` (2026-10-27 entry).
