# WWW-68 — Age-restricted communities and channels

Branch `WWW-68-age-restricted-communities-channels`, from `release-caterpie-v1010`.
Task of epic WWW-56, after WWW-74. Backend and frontend.

## Goal

- A community or channel can have a minimum age, set by whoever manages it.
- A persona whose **user** is younger than that doesn't see it at all: no
  metadata, no content, no join/follow, no realtime, left out of every list.
- The answer is the same as for something that doesn't exist (404 / not
  found), so it never reveals the user's age.
- Out of scope: suggestions (WWW-69 uses the rule built here), age on
  personas or posts.

## Decisions

1. **Column**: `min_age smallint NULL` on `communities` and `channels`, with
   `CHECK (min_age IN (13, 16, 18, 21))`. NULL = no restriction. A fixed set
   keeps the UI to one select ("None", 13+, 16+, 18+, 21+).
2. **One rule, in SQL**: a function `persona_meets_min_age(persona_id,
   min_age)` (migration) is true when `min_age` is NULL, or the persona's
   user has a `date_of_birth` on or before `current_date (UTC) − min_age
   years`. A user without a date of birth fails it (fail closed; onboarding
   makes it required, so only users mid catch-up hit this). Every query below
   calls the function, so the age arithmetic lives in one place.
3. **Access**: `GetChannelAccess` / `GetCommunityAccess` return `meets_min_age`.
   `LoadChannel` / `LoadCommunity` return `ErrChannelNotFound` /
   `ErrCommunityNotFound` when it's false. Every caller (REST, GraphQL,
   `/control`) already maps those to 404, so join, follow, read, subscribe,
   requests, moderation are covered in one place.
4. **No exceptions**: owners, moderators and global Administrators follow the
   rule too, like persona visibility. To keep anyone from locking themselves
   out, setting `min_age` above the setter's own age is refused (400
   `invalid_min_age`, same code as a value outside the set). It doesn't say
   why, so it doesn't reveal a boundary the setter doesn't already know.
5. **Raising it later**: existing under-age members and followers keep their
   rows but lose access (404, not in their lists), like a persona losing
   access keeps its notifications. Lowering or clearing it brings them back.
   Counts keep counting them. Nothing is deleted, nobody is notified.
6. **Channels in a community stay independent** (channel access never
   depends on the community): an 18+ community may hold an unrestricted
   channel and the other way round. Each list applies each item's own rule.
7. **Notifications**: the `CHANNEL` scope rule in `ListNotifications` /
   `CountUnreadNotifications` adds the age check (it mirrors `CanRead`).
   Personal rows whose subject is a `COMMUNITY` the recipient is too young
   for are hidden by the same function, so a manager below a raised limit
   doesn't get links to a 404.
8. **Setting it**:
   - Community: `min_age` on `POST /communities/create` and `PATCH
     /communities/:id` (`CanManage`). The PATCH already publishes
     `…COMMUNITY.<id>.info.update`.
   - Channel: `min_age` on `POST /channels/create`, and a new
     `PUT /channels/:channel_id/min-age {min_age}` (`CanModerate`, 403
     `not_moderator`), since channels have no settings endpoint yet. It
     publishes `STREAM_CHANNEL_EVENTS.CHANNEL.<id>.info.update` (NATS-only,
     no payload), which the channel page refetches on.
9. **Realtime for a viewer who becomes too young**: the refetch on
   `info.update` answers not found and the page shows its not-found state.
   An already-open subscription keeps delivering frames until the socket
   resubscribes, but frames carry only ids and every follow-up fetch is 404,
   so nothing leaks.
10. **Shown**: `min_age` on `Community` responses, channel list items and
    GraphQL `Channel`; cards and page headers show an "18+" badge. Only
    viewers who meet it ever see it.

## Backend

### Migration `033_min_age`

- `communities.min_age`, `channels.min_age` with the CHECK.
- `persona_meets_min_age(bigint, smallint) RETURNS boolean`, `LANGUAGE sql
  STABLE`.
- Down drops the function and both columns. `schemas/community.sql`,
  `schemas/channel.sql` updated.

### SQL (then `make generate-models`)

- `channel.sql`: `meets_min_age` in `GetChannelAccess`; filter in
  `GetAllChannels`, `GetChannel`, `GetChannelsForUser`,
  `GetFollowedChannelsForUser`, `ListModeratedChannels`; `min_age` in
  `CreateChannel`, new `SetChannelMinAge`.
- `community.sql`: `meets_min_age` in `GetCommunityAccess`; filter in
  `ListCommunities`, `GetCommunityByID`, `GetCommunityBySlug`, and the
  community lookup behind `Channel.community` / `GET /channels/:id/community`
  (a too-young viewer sees the channel without its community); `min_age` in
  `CreateCommunity` / `UpdateCommunity`.
- `notification.sql`: decision 7 in both visibility rules.
- `ListChannelSummaries` / `ListCommunitySummaries` (names in notifications)
  stay unfiltered: they're only read for rows that already passed visibility.

### Code

- `shared/pkg/access`: the not-found checks in `LoadChannel` /
  `LoadCommunity`; `ValidMinAge(minAge, setterDOB)`.
- `communities` handler: `min_age` on create/update and in responses.
- `channels` handler: `min_age` on create, `PUT …/min-age`, in list items.
- GraphQL: `minAge: Int` on `Channel` (`schema.graphqls`), resolver.
- `shared/pkg/subject`: the channel `info` event.

## Frontend

- `CommunityForm`: "Minimum age" select (create and edit).
- Channel create page: the same select. `ModerationSheet`: a "Settings" tab
  with it (moderators only), saving through `PUT …/min-age`.
- `AgeBadge` ("18+") on `CommunityCard`, `ChannelCard`, community and channel
  page headers.
- Channel page refetches on `info.update`.
- `pnpm codegen` for `minAge`; `types/community.ts`, `types/channel.ts`.
- Error text for `invalid_min_age`: "You can't set an age limit above your
  own age."

## Docs

- `CLAUDE.md`: Channel access and Communities get the age rule (one SQL
  function, not found for under-age, no exceptions, set-above-own-age
  refused); the realtime path lists `CHANNEL.<id>.info.update`.

## Order and deploy

1. Migration, schemas, queries, GraphQL schema, `make generate-models`,
   `pnpm codegen`.
2. Backend.
3. Frontend.
4. Deploy: migration 033, backend, frontend.

## Verification

- `go build ./...` / `go vet ./...` in `shared`, `backend`; `pnpm build` and
  `pnpm lint`. There are no tests.
- On dev, an adult user and a user born 15 years ago:
  - adult creates an 18+ community and an 18+ channel: both show the badge
    for the adult; the younger user gets neither in lists, 404 on the slug
    and channel URLs, 404 on join/follow by id, nothing via `/control`.
  - an unrestricted channel inside the 18+ community stays visible to the
    younger user in `/channels`, without its community.
  - younger user joins a public channel, adult raises it to 18+: the younger
    user's open page turns to not found live; its notifications from that
    channel stop showing; clearing the limit brings both back.
  - the younger user setting 16+ on its own community is refused with
    `invalid_min_age`; 13+ works.
  - a user without a date of birth sees no restricted item.

## Settled

- Allowed values are the fixed set 13, 16, 18, 21.
- No exception for global Administrators under the limit.
- Raising the limit keeps under-age members' rows and only hides access.
- **Changed after review:** `min_age` is `NOT NULL` with no default and
  required on create (400 `invalid_min_age` when missing); there is no "no
  limit". Migration 033 backfills every existing community and channel
  (deleted ones too) with 13 before setting `NOT NULL`. The seeder uses 13.
  So a user without a date of birth sees no community or channel at all.
- The "18+" badge only shows above 13, the floor every item has.

## Implementation notes

- `GetCommunityBySlug` / `GetCommunityByID` stay unfiltered (the seeder uses
  the slug lookup); `writeRow` answers 404 through `LoadCommunity` instead.
- `GetChannelsForUser`, `GetFollowedChannelsForUser`, `ListChannels`,
  `GetPersonaJoinedChannels`, `GetPersonaFollowedChannels` have no callers, so
  they were left alone.
- `GetChannelCommunityState` (a channel moderator's Community tab) and
  `ListCommunityChannelRequests` (a manager's request list) stay unfiltered:
  both are management views of the viewer's own channel or community.
- Create and `PUT …/min-age` require `min_age`; `PATCH` leaves it alone when
  absent. `ValidMinAge` checks the set and the setter's age with the same SQL
  function (`PersonaMeetsMinAge`).
- Form selects submit strings, so `FormField` gained `serialize` ("18" → 18),
  applied in `useForm` before submit. The create forms start with no age
  picked, so the creator chooses.
- The channel page treats a `channel not found` GraphQL error as missing, and
  the community page's live reload turns a 404 into the not-found view.
- Added on request during review: the shared form (`components/form`) scrolls
  to the first field with an error after a submit attempt, for client
  validation and for server errors mapped to a field (e.g. `invalid_min_age`).
  Each field is wrapped in a `display: contents` element with `data-field`.
