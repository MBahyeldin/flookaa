# WWW-65 — Communities: entity, create/list/view and community channels

Branch `WWW-65-communities`, from `release-caterpie-v1010`.
Task of epic WWW-56, after WWW-64 (channel interests). Backend, frontend and seed.

## Goal

- A community is an organisational space that groups channels. Channels stay
  the content spaces; a community has no posts of its own.
- Personas can create, list (filter by interest), view and edit (owner)
  communities.
- A channel is standalone or belongs to one community. The community page
  lists its channels and offers "Create channel in this community".
- `app seed` creates the platform's starting communities and their channels.
- Out of scope: membership, following and counts (WWW-66), moderators and
  rules (WWW-67), channels requesting to join a community (WWW-73), age
  limits (WWW-68), suggestions (WWW-69).

## Decisions

1. **`communities` table**: `id`, `name` (1–100), `slug`, `description`,
   `thumbnail`, `banner` (empty string = none, like channels), `visibility`
   (new `community_visibility_enum` `public`/`private`, default `public`),
   `owner_id` (persona), `created_at`, `updated_at`, `deleted_at`. No delete
   endpoint in this ticket; every read filters `deleted_at IS NULL`.
2. **Slug**: same rule as persona and interest slugs (`slug.Valid`), unique
   across **all** communities, deleted ones included, so an old link never
   points at a different community. Pages use it: `/communities/<slug>`.
   The owner can change it (409 `slug_taken`, 400 `invalid_slug`); old links
   then 404. `create` is reserved (it's the `/communities/create` page). The frontend suggests one from the name (`lib/slug.ts`).
3. **Privacy is stored, not enforced yet**: today every persona sees every
   community's metadata and its channel list, as with channels. What
   `private` changes (joining by request) comes with WWW-66. The page shows
   the label.
4. **`community_interests`** `(community_id, interest_id)`: 1 to 5, required
   on create, the same id rules and error codes as channel interests
   (`invalid_interests`, `invalid_interest`, retired tags may stay). The
   checks reuse the WWW-64 helper.
5. **`community_channels`** `(community_id, channel_id UNIQUE, created_at)`,
   both `ON DELETE CASCADE`. No `channels.community_id`. Here a channel is put
   in a community only when a manager creates it there. WWW-73 adds a
   `status` to this table for requests from existing channels, plus leaving
   and removal; nothing in this ticket should assume every row is active
   beyond what that migration can add.
6. **Who manages a community** (`access.LoadCommunity` → `CanManage`, new
   `shared/pkg/access/community.go`): the owner and global Administrators.
   WWW-67 adds community moderators to the same method. Managers edit info
   and interests and create channels in it. Others get 403
   `not_community_manager`; a missing or deleted community is 404.
7. **Channel access does not change**: a community channel keeps its own
   visibility, membership and moderators. The channel's creator owns and
   moderates it, as today.
8. **Creating a channel in a community**: `POST /channels/create` takes an
   optional `community_id` (`CanManage` required, checked with the interests
   before anything is inserted). Channel creation moves into one function,
   `channels.Create(ctx, tx, params)`, run in one transaction (today it's
   five separate writes), used by both the handler and the seeder. The
   channels handler gets the `*sql.DB` it needs for `BeginTx`.
9. **The owner is shown like any other persona**: through
   `ResolvePersonasForViewer` (anonymous name keyed by channel 0 when the
   viewer doesn't see it), via `PersonaLink`.
10. **Realtime**: a new owner type `COMMUNITY` in `shared/pkg/subject`.
    `STREAM_CHANNEL_EVENTS.COMMUNITY.<id>.info.update` (info or interests
    changed) and `…COMMUNITY.<id>.channels.update` (a channel was created in
    it), both NATS-only with no payload. `/control` lets every persona
    subscribe to them, since the metadata is public. The community page
    refetches on them. The communities list isn't live; the next load shows
    changes. `notifier-channel` read `STREAM_CHANNEL_EVENTS.>` and logged every
    payload-less frame as unreadable, so its filter becomes
    `STREAM_CHANNEL_EVENTS.CHANNEL.>` (`CreateOrUpdateConsumer` updates it).
11. **Channel → community link**: the GraphQL `Channel` gets
    `community: CommunityRef` (`id`, `name`, `slug`, nullable), so the
    channel page shows "Part of <community>". Both codegens run. Channel list
    items embed `community` the same way (one batched query per page).

## Backend

### Migration `027_communities`

- `community_visibility_enum`, `communities`, `community_interests` (index
  on `interest_id`), `community_channels`; down drops them in reverse.
- New `schemas/community.sql` matching the migration.

### SQL (`queries/community.sql`, then `make generate-models`)

- `CreateCommunity`, `UpdateCommunity` (`sqlc.narg` per field, sets
  `updated_at`), `GetCommunityByID`, `GetCommunityBySlug` (both skip
  deleted), `GetCommunityAccess(community_id)` → `owner_id`.
- `ListCommunities(limit, offset, interest_slug narg)` ordered by
  `created_at DESC, id DESC`, with `channels_count` (live channels).
- `ListCommunityInterests(community_ids[])`, `CountAllowedCommunityInterests`,
  `ReplaceCommunityInterests`: the channel versions' shape.
- `AddChannelToCommunity`, `ListChannelCommunities(channel_ids[])` →
  `channel_id, id, name, slug`.
- `GetAllChannels` gets `sqlc.narg(community_id)` (only that community's
  channels).
- Seeder: `GetCommunityIDBySlug`, `GetCommunityChannelIDByName`.

### REST (`/api/v1/communities`, persona tier)

| Method | Path | Answer |
|---|---|---|
| GET | `/communities/?interest=&limit=&offset=` | `{communities: [Community]}` |
| POST | `/communities/create` | `{community}`; 400 `invalid_slug`/`invalid_interests`/`invalid_interest`, 409 `slug_taken` |
| GET | `/communities/by-slug/:slug` | `{community}`, 404 |
| GET | `/communities/:community_id` | `{community}`, 404; the page refetches by id so a slug change made elsewhere is followed |
| PATCH | `/communities/:community_id` | `{community}`; managers only; any of name, slug, description, thumbnail, banner, visibility, `interest_ids` |

`Community` = `id, name, slug, description, thumbnail, banner, visibility,
owner (persona view), interests [{id, name, slug, emoji}], channels_count,
can_manage`. The community's channels come from
`GET /channels/?community_id=<id>`, so the page reuses the channel cards.

### Code

- `backend/internal/db/postgres/handlers/communities/`: `handler.go`,
  `create.go`, `list.go`, `get.go`, `update.go`.
- `handlers/channels`: `Create` extracted (decision 8), `community_id` on
  create and on the list, `community` on list items.
- Routes in `cmd/server/api/v1/communities.go`, wired in `root.go`.
- `shared/pkg/subject`: `OwnerTypeCommunity`; `/control` case for it.
- GraphQL: `CommunityRef`, `Channel.community`; resolver fills it from
  `GetChannel` (a `LEFT JOIN community_channels`).

### Seed (`backend/cmd/seeder/communities.go`)

Owned by the admin user's default persona. Skips a community whose slug
exists, and a channel whose name exists in that community, so reruns add
only what's missing and never edit what's there. All public, no images.

| Community (slug) | Interests | Channels (interests) |
|---|---|---|
| Tech Builders (`tech-builders`) | technology, programming, startups | Programming Help (programming), AI Corner (artificial-intelligence), Startup Founders (startups, business) |
| Screen & Sound (`screen-and-sound`) | movies-tv, music, anime-manga | Movie Nights (movies-tv), Music Discovery (music), Anime Club (anime-manga) |
| Creators Hub (`creators-hub`) | art, photography, writing | Art Showcase (art), Photo Walk (photography), Writers' Room (writing, books-reading) |
| Healthy Living (`healthy-living`) | fitness, health-wellness, cooking | Fitness Journey (fitness), Cooking Together (cooking, food), Home & Garden (home-diy, gardening) |
| Explorers (`explorers`) | travel, nature-outdoors, animals | Travel Stories (travel), Into the Wild (nature-outdoors, animals) |
| Game Night (`game-night`) | gaming, board-games | Gamers Lounge (gaming), Board Game Café (board-games) |
| Egypt & Arabic (`egypt-and-arabic`) | egyptian-culture, arabic-language, history | Egyptian Culture (egyptian-culture, history), Learn Arabic (arabic-language) |

Each gets a one-line description in the seed file. `SeedCommunities` runs
after `SeedInterests`.

## Frontend

- `services/communities.ts`, `types/community.ts`.
- Sidebar: "Communities" entry before "Channels".
- `/communities`: grid of `CommunityCard` (thumbnail or a generated
  fallback, name, description, interest chips, channel count) and the same
  interest filter chips as `/channels` (`?interest=`), plus "Create
  community".
- `/communities/create`: name, slug (filled from the name until edited),
  description, visibility, `InterestPicker` (max 5); thumbnail and banner
  through the existing upload field. Server errors map onto fields.
- `/communities/:slug`: banner, thumbnail, name, visibility label, owner
  (`PersonaLink`), description, interest chips, and the channels grid
  (`ChannelCard`, from `getChannels({community_id})`). Managers see
  "Create channel" (→ `/channels/create?community=<id>`) and "Edit", a sheet
  with the create form's fields. Subscribes to the two community subjects.
  404 → "Community not found".
- `/channels/create`: reads `?community=`, shows "In <community>" and sends
  `community_id`.
- Channel page and `ChannelCard`: "Part of <community>" link when set.
- Rebuild `pnpm codegen` after the GraphQL change.

## Docs

- `CLAUDE.md`: a "Communities" section (tables, slug rule, who manages,
  channel access unchanged, events), the route tier table (`communities/*`
  is persona tier), and the seeder line (communities and channels).

## Order and deploy

1. Migration, schema, queries, `make generate-models`.
2. Backend handlers, channel `Create` extraction, `/control`, GraphQL.
3. Seeder.
4. Frontend, `pnpm codegen`.
5. Deploy: migrations through 027, backend, `app seed`, then frontend.

## Verification

- `go build ./...` / `go vet ./...` in `shared` and `backend`; `pnpm build`
  and `pnpm lint` in `front-end`. There are no tests.
- On dev: create a community (bad slug, taken slug, 0 and 6 interests
  refused), list and filter by interest, edit as owner (non-owner gets 403),
  create a private and a public channel in it and check their access is the
  usual channel access, see "Part of" on the channel, and see the community
  page update live in a second browser on edit and on channel create.
- `app seed` twice: the second run creates nothing.

## Open questions

- Is the seed list above the one you want?
