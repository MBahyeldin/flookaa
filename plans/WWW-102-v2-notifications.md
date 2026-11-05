# WWW-102 — Notifications page and popover to v2

Frontend only. Same route (`/notifications`), new layout, existing hooks: `NotificationStore`, `useNotificationsRealtime`, `services/notifications` and the API are unchanged. Design: WWW-96 (frames linked in WWW-102's Design section, ids in `plans/WWW-77-figma-handoff.md`).

## Row (`components/notifications/NotificationItem.tsx`, rewritten)

- **Lead:** with `latest_actor`, the actor's `Avatar` (md, 40 px; anonymous → `GeneratedAvatarFallback`) inside `PersonaLink` as today. Without an actor, the community's or the channel's `Logo` (sm). Bottom-right: an 18 px `bg-primary` circle with the kind's icon in `primary-foreground` and a 2 px `card` ring.
- **Text:** actor in `font-semibold` plus message (`text-sm`), then a muted `text-xs` line: short time `·` context.
- **Unread:** `bg-accent/40` and a `bg-primary` dot at the end. Hover: `bg-accent`. Read: no tint.
- Clicking still marks it read and navigates; the avatar still opens the persona card.

## `describe.ts` stays the one mapping

Each description gains:
- `icon`: heart (likes), message-circle (comments, replies), user-plus (new follower, invitation), inbox (join, follow and channel requests), check (approvals, accepted), x (removed, declined).
- `context`: the channel name for content and channel kinds, the community name for community kinds, "on {first last}'s wall" (or "on your wall" when the wall is the current persona) for wall content, and none for follows and invitations.

## Backend: the wall's name (`backend/internal/db/postgres/handlers/notifications`)

- List items with scope `PERSONA` gain `wall: {id, first_name, last_name}`, looked up at read time like `channel` and `community`, never stored.
- The wall's id joins the page's actor ids, so it goes through the same `resolveActors` (`ResolvePersonasForViewer` as the recipient), one query per page. A wall row is only listed while the recipient sees the real persona, so the name is real; if the lookup ever answers anonymous or nothing (deleted persona), `wall` is null and the row shows no context.
- `types/notification.ts` gets `wall: {id; first_name; last_name} | null`. No migration and no GraphQL change. Deploy the backend before the frontend.

## Short time (`components/notifications/time.ts`)

The design shows `2m`, `5h`, `Tue`, `Oct 12`: under an hour → minutes, under a day → hours, under a week → weekday, then month and day (plus the year when it's a different year). Uses `Intl`, so later locales (WWW-89) format themselves. `<time dateTime title>` keeps the full date.

## Popover (`components/notifications/NotificationPopover.tsx`)

- Content taken out of `NotificationBell`: a header with "Notifications" and a ghost "Mark all read" (only while unread), the list (latest 10, `max-h-[60vh]`, scrolls), and a footer "See all notifications". Loading, empty and error look as they do today (`SkeletonList`, `EmptyState compact`, `ErrorState compact`). 384 px wide.
- **Mobile:** the header bell opens it, as today.
- **Desktop and tablet:** the sidebar's Notifications entry opens it (`side="right"`, `align="start"`, beside the entry) instead of navigating. `SidebarNavItem` gets an optional `popover` render prop for this one entry. Inside the mobile sidebar sheet, the entry stays a plain link to the page (the bell already covers mobile). While it's open the entry looks active, and on `/notifications` it is active as before.
- The badge stays on the entry, and on the rail too, as today (the Figma rail has no badge; dropping it would hide unread counts on tablet).

## Page (`pages/(dashboard)/notifications/index.tsx`)

- One `max-w-[640px]` centred column. Header: `h1` "Notifications", `Badge variant="count"` with the unread count, then "Mark all read" as an outline `sm` button on the right (both only while something is unread).
- Rows are grouped under `text-overline` headings **Today / This week / Earlier** by `updated_at` in local time (this week = the last 7 days, not counting today), each group in a bordered `Card` with `p-1`. Groups are computed from the loaded list, so loading more extends "Earlier".
- Paging, the empty-page skipping, the reload on `version` and the "Couldn't load more" toast stay as they are. Loading, empty and error states keep their copy (`You're all caught up` etc.), restyled through the existing `SkeletonList` / `EmptyState` / `ErrorState`.

## Out of scope

Inline Approve/Accept and filter tabs (WWW-96 decisions).

## Decisions (user, 2026-10-27)

1. Wall rows show the wall persona's name; the backend returns its first and last name.
2. The collapsed tablet sidebar keeps the unread badge (differs from Figma).

## Check

`go build ./...` in `backend/`; `pnpm build` + `pnpm lint`; Playwright at 1440 / 834 / 390: page, popover from the sidebar and the bell, mark one / all read, load more, a wall notification, and a dark palette.
