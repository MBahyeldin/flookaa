# WWW-113 — Persona profile v2: hero, Posts / Channels / Connected tabs

Fifteenth ticket of epic WWW-86, on top of WWW-82 (`Hero`, `Cover`, `SectionNav`), WWW-83 (`Post` Canvas) and WWW-112/84 (`channelPostsPage`, `useChannelPostsPager`). Full stack: a migration, a GraphQL query, a REST endpoint, a `/control` owner, and `/personas/:id` rewritten in place (same route, new layout, existing hooks and services).

Design: "Flookaa v2", Profile `24:2` (Desktop) / `24:693` (Tablet) / `24:943` (Mobile), Profile locked `24:361` / `24:1149`, Connected tab `78:2200`, Invited-you banner `78:2044`, Hero Persona variants `14:257`, Post set `36:748`, Tile `15:309`. Pulled read-only on 2026-10-25. The frames use Ember for the persona; Figma has no Channels tab frame.

## Who sees what

The page keeps today's three answers from `GET /persona/:persona_id`: full, `locked`, 404. Tabs exist only on the full view, i.e. when the viewer sees the **real** persona (`ResolvePersonasForViewer`). The locked view has no tabs.

- **Posts**: the persona's posts in channels the viewer can read (`access.CanRead`: public, or the viewer is an active member; not deleted; `persona_meets_min_age` for the viewer), newest first.
- **Channels** (decision 1): channels where the persona is a **live active member** and that the **viewer can read**. That is exactly what the viewer could already learn from each of those channels' People tab, where the persona shows under its real name to this viewer (member lists go through the same `VisiblePersonas` rule, and the People tab is readers-only). Follows are left out: no channel shows its followers, so listing them would reveal something new. Private channels the viewer isn't in are left out, even though their metadata is public, because their member list isn't.
- **Connected**: today's `/connected`, unchanged rule.

Nothing here ties an anonymous member to its channels: an anonymous view never gets tabs, and both lists only contain what each channel already shows the viewer.

## Backend

### Migration 035 `persona_cover_pattern` (decision 2)

`ALTER TABLE personas ADD COLUMN cover_pattern cover_pattern_enum NOT NULL DEFAULT 'waves'` (down drops it). Schema file updated, `make generate-models`. `POST /persona/create` and `/persona/update` take optional `cover_pattern` (400 `invalid_cover_pattern`); your own `/persona/list` and `/persona/update` return it. Picking it in the UI belongs to WWW-103 (persona settings); this ticket only stores and shows it.

### `GET /persona/:persona_id` (full answer)

Adds `theme`, `cover_pattern` and `privacy` (the hero's "Private" tag; only for a persona the viewer sees for real, which already reveals it). The locked answer adds only `anonymous_name` (`AnonymousName(id, 0)`, the personal key notifications use; derived from the id, so it reveals nothing) for the locked hero's name: `{id, locked, anonymous_name, follow_status}`. It keeps the viewer's palette and a fixed `stripes` cover, as Figma draws it.

### SQL (`queries/channel.sql`)

- `ListProfileChannels(viewer_id, persona_id)` → the Channels tab rows: `id`, `name`, `slug`-less list shape as `GetAllChannels` items (so `channels.Handler.build` can render `ChannelTile`s with interests, counts and the viewer's own membership), filtered by the persona's live active membership and the viewer's read access (public or viewer active member, not deleted, `persona_meets_min_age(viewer)`), ordered by the persona's `joined_at` desc.
- `ListProfilePostChannels(viewer_id, persona_id)` → `FeedChannel` rows (`id`, `name`, theme, `thumbnail`, `can_moderate` for the viewer) for channels where the persona has **any** `channel_members` row (posts survive leaving) and the viewer can read.

### REST: `GET /persona/:persona_id/channels`

Persona tier, `?limit=` ≤ 50, `?offset=`. 404 when the viewer doesn't see the real persona (same check as `/connected`). Items are `channels.Handler.build` list items. Lives in `channels.Handler` (it owns `build`), routed under `/persona/:persona_id/`.

### GraphQL: `getPersonaPosts(personaId: ID!, after: String, limit: Int): FeedPage!`

Returns an empty page when the viewer doesn't see the real persona (no error, so it can't be used to probe). Otherwise `ListProfilePostChannels`, then `channelPostsPage` with a new optional author filter (`authorid` added to the Mongo filter). Same cursor, default 10, cap 30. No new Mongo index: the existing `owner.id`/`createdat` path plus `authorid` is fine at today's sizes (note in Out of scope).

### Realtime: `/control` owner `PROFILE`

Payload `persona_id`. Refused (empty answer) unless the viewer sees the real persona. Serves, non-durable, `STREAM_CONTENT_EVENTS.CHANNEL.<id>.{post|like|comment}.*` for `ListProfilePostChannels`, via the `FEED`/`DISCOVER` helper. The page drops `post.create` events whose fetched post has another author, so the "n new posts" pill only counts the persona's own posts.

## Frontend

### Page `/personas/:id` (`pages/(dashboard)/personas/[id]/index.tsx`, rewritten in place)

Wrapped in the persona's `data-theme` (full view) like channel pages; the shell keeps the viewer's palette.

- **Hero** (`components/hero` + `components/cover` with `cover_pattern`): avatar (thumbnail or `GeneratedAvatarFallback`, ring as Figma) overlapping the cover; tags: `@slug` chip, plus "Private" (lock icon) when private; name; bio as tagline; facts "212 followers · 88 following" (followers/following open `FollowersSheet` on your own profile, as today). Actions: Follow (`FollowButton`), Invite to follow (`InviteButton`, when `can_invite`), `⋯` menu: Copy link always, "Share follow link" (your own private persona: today's `ShareInviteLink` moves in here), "Edit persona" (own: `/persona-manager/:id`).
- **Invited-you banner**: today's `InvitationBanner`, restyled as Figma `78:2044` (Banner component), above the tabs.
- **Tabs**: `SectionNav` in `?tab=posts|channels|connected` (default posts), sticky as on the channel page. Connected is hidden when the list is empty (hide-inactive rule); Posts and Channels always show, with empty states.
- **Posts tab**: `useChannelPostsPager` with owner `{type: "PROFILE", id}` on `getPersonaPosts`, `Post` `version="canvas"`, infinite scroll, the pill, `SkeletonList`, `ErrorState`, `EmptyState` "No posts yet" (own: action "Go to your channels" → `/channels`; others: none).
- **Channels tab**: `ChannelTile` grid (`grid gap-4 sm:grid-cols-2 lg:grid-cols-3`), "Load more" by offset, states as above ("Not in any channels you can see" for others, "You haven't joined any channels" + "Browse channels" for your own).
- **Connected tab**: the intro line from Figma ("Other public personas of the same person, linked by them. Private ones never show here."), `PersonRow`-style rows (avatar, name, `@slug`, Follow). Followers count on the row is in Figma; `/connected` gains `followers_count` (recount, like the profile's) to fill it.
- **Locked view** (`24:361`): `Hero` with the `stripes` cover in the viewer's palette, dashed-ring initials avatar of the anonymous name, "Private" tag, "This persona is private." tagline, "Request to follow to see their profile and posts.", Request to follow + `⋯` (Copy link); below it the "Private persona" panel (lock icon, Figma copy). Today's `LockedPersonaCard` is used only here, so it's replaced by this and deleted if nothing else imports it. Realtime unchanged (the viewer's own `follow_counts.update` turns it into the full profile).
- Not found / error: `EmptyState` / `ErrorState`, not the hand-made blocks.

### Services and types

`services/persona.ts`: `fetchPersonaChannels(id, {limit, offset})`; `PersonaProfile` gains `theme`, `cover_pattern`, `privacy`; `PublicPersona` gains `followers_count`. GraphQL document `getPersonaPosts.graphql`, then `pnpm codegen`.

## Out of scope

- Picking the persona's cover pattern (WWW-103). Photo covers (WWW-92).
- Pinned posts, reposts, a persona's comments.
- A Mongo index on `authorid` (add when profile queries get slow).
- WWW-120 (revoking subjects when visibility changes mid-session): a follow ended while the page is open keeps its subscription until reload, as everywhere else today.

## Decisions (2026-10-25)

1. **Channels tab**: channels the persona is an active member of ∩ channels the viewer can read. No follows.
2. **Persona cover**: a stored `cover_pattern` column (default `waves`). The picker comes in WWW-103.

## Docs

CLAUDE.md: Persona access gains a "Profile tabs" bullet (who sees Posts and Channels and why it leaks nothing), `/control` owner `PROFILE` in the realtime section, `personas.cover_pattern` in the Look paragraph.

## Check

`go build ./...`, `make generate-models`, `pnpm codegen`, `pnpm build`, `pnpm lint`. Browser check once deployed: own public profile, a visible private persona, a locked one, an `only_me` one (404), three widths.

## Review round (2026-10-25): persona names on Connected

The user decided a linked public persona's `name` (the persona name) is public: the Connected row shows it under the display name. `/connected` already returned it; nothing changes on the backend, since a private or `only_me` persona is never a linked source or sibling, so it never exposes one. The "Show on my profile" switch gets a hint saying linked personas list each other with their names (the switch input now renders `hint` like the select input).

## Review round (2026-10-25): Posts = the persona's wall

QA: the Posts tab must not list the persona's activity in channels. A persona has **its own wall**: posts owned by the persona (`owner {type: PERSONA, id}`), like a channel's posts. Folded into WWW-113 (user's call). User decisions:

1. Only the persona posts on its wall.
2. Whoever sees the real persona (`ResolvePersonasForViewer`) reads it, likes and comments. Locked viewers see nothing.

### Removed

`getPersonaPosts`, `ListProfilePostChannels`, `channelPostsPage`'s author filter, the channel-based `/control` `PROFILE` answer, the `PROFILE` list owner in `AppStore`. `ProfilePosts` stops using `useChannelPostsPager`.

### Access (`shared/pkg/access/wall.go`)

`LoadWall(ctx, q, personaID, viewerID)` → `Wall{Visible, IsOwner}`; not found when the persona is missing, deleted or not visible to the viewer (so it never leaks existence). `Read()`/`React()` = visible; `Post()` = owner; `CanModerate` = owner (deletes others' comments on its wall).

### Resolvers

- `authorizeOwner` gets a PERSONA branch. Its `write` flag splits into post vs react (creating a post needs `Post()`, comments and likes need `React()`); CHANNEL keeps `Write()` for both.
- `deleteObject`: PERSONA = author or the wall's owner.
- `getPosts(owner: PERSONA)` works through `authorizeOwner` (offset paging, like the channel page). `canModerate` for the page comes from the same rule.
- Authors resolve as on channels; the anonymous name of a commenter the viewer doesn't see is `access.AnonymousWallName(persona, wall)` (`persona:%d:wall:%d`), different from channel and personal names.
- Events and NATS subjects use owner `PERSONA` (already in `owner_enum` and `subject`): `STREAM_CONTENT_EVENTS.PERSONA.<id>.{post|like|comment}.…`. Counters don't depend on the owner.

### Realtime

`/control` owner `PROFILE` (`owner_id`) answers `STREAM_CONTENT_EVENTS.PERSONA.<id>.{post,like,comment}.*` when the viewer sees the real persona, else nothing. The Posts tab handles them like the channel page (new-posts pill, live counts, deletes).

### Notifications

- Migration 036: `ALTER TYPE notification_scope_enum ADD VALUE 'PERSONA'`, and a SQL function `persona_visible_to(target, viewer)` holding the `ResolvePersonasForViewer` visibility clause, used by that query and by the new rule.
- Notifier `content` accepts owner `PERSONA` with scope `{PERSONA, owner_id}`; visibility rule in `ListNotifications`/`CountUnreadNotifications`: `persona_visible_to(scope_id, recipient)`.
- `describe.ts`: content kinds with scope `PERSONA` link to `/personas/<id>/posts/<post_id>`; the row names no channel.

### Frontend

- **Posts tab**: the wall, newest first, `Post` Canvas in the persona's palette, offset paging with "Load more" as the channel page, `AppStore` owner `{type: "PERSONA", id}` (a real content owner, so likes, comments and the composer work unchanged). Own profile: `ComposerBar` on top ("Write on your wall"). Empty: own → "Write your first post"; others → "No posts yet".
- **Post page** `/personas/:id/posts/:postId`: a slim persona bar (avatar, name, `@slug`, back to the profile) instead of `ChannelBar`, then `PostArticle` and `comment-section`; comments for whoever sees the persona. The channel post page's article and comments are reused, not copied.
- A wall post's byline shows the persona only (no channel chip).

### Docs

CLAUDE.md: "Channel access" note that PERSONA-owned content now has rules (`access.LoadWall`), the profile tabs bullet, `/control` `PROFILE`, the `PERSONA` notification scope.

Existing Mongo documents with owner `PERSONA` (early test data, if any) will show up on their walls.
