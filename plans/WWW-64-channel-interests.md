# WWW-64 — Tag channels with interests

Branch `WWW-64-channel-interests`, from `release-caterpie-v1010`.
Task of epic WWW-56, after WWW-63 (persona interests). Backend + frontend.

## Goal

- A channel is tagged with interests from the catalogue.
- Tags are set when the channel is created and edited later by its moderators.
- Tags show on channel cards and the channel page.
- The channel list can be filtered by an interest.
- WWW-69 later uses the tags to suggest channels.

## Decisions

1. **New table `channel_interests`** `(channel_id, interest_id)` primary key,
   both `ON DELETE CASCADE`, `created_at`, and an index on `interest_id` (for
   the filter). A hard delete, like `persona_interests`.
2. **1 to 5 interests**, required on create. Tags describe the channel, so
   the cap is smaller than a persona's 20. Existing channels have none and
   keep working; the first edit must leave at least one.
3. **The same rules as persona interests**: distinct ids (400
   `invalid_interests`), each new id active (400 `invalid_interest`), an
   already-tagged retired interest may stay. Retired tags still show on the
   channel, as the catalogue rules say.
4. **Who edits**: `access.CanModerate` (owner, channel moderators, global
   Administrators). Others get 404 if they can't see the channel and 403
   `not_moderator` otherwise. Every persona that can see the channel's
   metadata sees its tags, private channels included, like the name and
   description.
5. **REST, not GraphQL.** `GET /channels/:channel_id/interests` →
   `{interests: [{id, name, slug, emoji}], can_edit}` and
   `PUT /channels/:channel_id/interests {interest_ids}` (same body back). The
   channel page loads its tags with it, so the GraphQL schema and both
   codegens stay untouched. The list response embeds tags (decision 6).
6. **Channel list**: every item in `GET /channels/` gets `interests`
   (one batched `ListChannelInterests(channel_ids[])` per page, not one per
   channel). A new optional `?interest=<slug>` keeps only channels tagged with
   that interest; an unknown slug gives an empty list, not an error.
   One interest at a time: enough for "browse by topic", and multi-select
   can come with WWW-69.
7. **Create**: `CreateChannelRequest` gets `interest_ids` (required, rule 2),
   validated **before** the channel is inserted, so a bad tag creates
   nothing. Today's create runs four separate writes with no transaction;
   this ticket adds the tags as a fifth and doesn't restructure the rest.
8. **Realtime**: a tag change publishes
   `STREAM_CHANNEL_EVENTS.CHANNEL.<id>.interests.update` with no payload
   (NATS-only, like `follow_counts`; a constant `EventChannelInterests` next
   to the persona ones). The channel page refetches its tags on it. The
   channel list is not live: next load shows the change.

## Backend

### Migration `026_channel_interests`

- `CREATE TABLE channel_interests (...)` + index; down drops it.
- `schemas/channel.sql` updated to match.

### SQL (`queries/interest.sql`, then `make generate-models`)

- `ListChannelInterests(channel_ids bigint[]) :many` → `channel_id` + interest
  fields, ordered by `created_at, id`.
- `CountAllowedChannelInterests(channel_id, ids)` and
  `ReplaceChannelInterests(channel_id, ids)`: the persona versions'
  shape (one statement, delete-not-in + insert on conflict do nothing).
- `GetAllChannels` gets `sqlc.narg(interest_slug)`: `AND (narg IS NULL OR EXISTS (… channel_interests JOIN interests … slug = narg))`.

### Code

- `handlers/channels/interests.go`: `ChannelInterests` (GET),
  `SetChannelInterests` (PUT), shared validation with the persona handler
  moved into one helper (`interests.ValidIDs`, max as a parameter).
- `create.go`: validate and save `interest_ids`.
- `list.go`: `interest` query param; `Interests` on `ChannelResponse`.
- `shared/external/db/nats`: `EventChannelInterests`; publish after PUT.
- Routes in `api/v1/channels.go`.
- Check `/control`'s channel-events subscription covers the new subject
  (it subscribes per subject, so it may need `interests.update` added).

## Frontend

- `types/channel` + `services/channels.ts`: `interests` on list items,
  `getChannelInterests`, `setChannelInterests`, `getChannels({interest})`.
- `InterestPicker` takes a `max` prop (persona 20, channel 5).
- **Create** (`channels/create.tsx`): an `interests` field type in
  `FieldRender` that renders a compact picker and holds `number[]`;
  required, 1–5.
- **Card** (`ChannelCard.tsx`): up to 3 chips (emoji + name), "+n" for more.
- **Page** (`channels/[id]`): chips under the description; listens to
  `interests.update` and refetches.
- **Edit**: a third tab "Interests" in `ModerationSheet` with the picker and
  Save, shown only when `can_edit`.
- **Filter** (`channels/index.tsx`): a row of interest chips above the list
  (from `GET /interests`), one selected at a time, "All" to clear; kept in
  `?interest=` so it survives reload.

## Files

| File | Change |
|---|---|
| `shared/external/db/postgres/migrations/026_channel_interests.{up,down}.sql` | table, index |
| `shared/external/db/postgres/schemas/channel.sql` | same |
| `shared/external/db/postgres/queries/{interest,channel}.sql` | queries, list filter |
| `shared/pkg/db/` | regenerated |
| `shared/external/db/nats/` | `EventChannelInterests` |
| `backend/internal/db/postgres/handlers/channels/{interests,create,list}.go` | endpoints, create, list |
| `backend/internal/db/postgres/handlers/interests/` | shared id validation |
| `backend/cmd/server/api/v1/channels.go` | routes |
| `backend/…/control` | subject, if needed |
| `front-end/src/services/channels.ts`, types | calls, fields |
| `front-end/src/components/interests/InterestPicker.tsx` | `max` prop |
| `front-end/src/components/form/FieldRender.tsx`, `components/inputs/interests/` | form field |
| `front-end/src/lib/formFields/channel.ts` | the field |
| `front-end/src/pages/(dashboard)/channels/{ChannelCard,index,[id]/index,[id]/ModerationSheet}.tsx` | chips, filter, edit, live refetch |
| `CLAUDE.md` | channel interests rules |

## Out of scope

- Communities' interests (WWW-65).
- Suggestions and ranking (WWW-69).
- Tags in GraphQL.

## Acceptance criteria

1. `migrate-up` creates `channel_interests`; `migrate-down` drops it.
2. Creating a channel without interests, or with 6, is refused and creates
   nothing; with 1–5 it saves them.
3. A moderator edits tags from Manage channel; a plain member doesn't see the
   tab, and `PUT` from them is 403 (404 if they can't see the channel).
4. Another viewer of the channel page sees the new tags without reloading.
5. Cards and the page show the tags, retired ones included.
6. `?interest=<slug>` lists only tagged channels; the chip row drives it.
7. `go build ./...`, `pnpm build`, `pnpm lint` pass.

## QA on dev

- Create a channel with two interests; see them on its card and page.
- As moderator, change them in a second tab while the page is open in the
  first.
- Filter the list by an interest; reload keeps the filter.
- Retire a tagged interest as admin: it stays on the channel and leaves the
  filter row.
