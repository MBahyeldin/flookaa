# WWW-69 — Suggestions: communities and channels for a persona

Branch `WWW-69-persona-suggestions`, from `release-caterpie-v1010`.
Task of epic WWW-56, before WWW-70 (communities step) and WWW-72 (channels
step). Backend, plus a frontend service with no UI.

## Goal

- Two ranked lists for one of the user's own personas, which the onboarding
  steps will show:
  - `GET /api/v1/persona/:persona_id/suggestions/communities`
  - `GET /api/v1/persona/:persona_id/suggestions/channels`
- Out of scope: any UI (WWW-70 / WWW-72), suggesting personas, stored scores,
  realtime.

## Decisions

1. **Whose suggestions**: any of the user's own personas, current or not, like
   `/persona/:persona_id/interests` (403 `not_your_persona` otherwise), because
   onboarding works on the default persona. Everything (age, exclusions, the
   viewer fields on items) is computed **as that persona**, not as the current
   one.
2. **Community candidates**: live communities sharing at least one interest
   with the persona. A persona with no interests gets `[]`.
3. **Channel candidates**, two sources:
   - `community`: active, not removed channels (`community_channels`) of the
     communities the persona is a live active member of or follows.
   - `interest`: channels sharing at least one interest with the persona,
     standalone or in any other community.
   - A channel matching both counts as `community`.
4. **Ranking** (one SQL query per page, nothing stored):
   1. channels only: `community` before `interest`;
   2. interest overlap (number of shared interests), descending;
   3. live active member count, descending;
   4. live active members whose user has the persona's user's gender
      (everyone's if no gender), descending;
   5. id descending, so offset paging is stable.
   Only the order is returned, never overlap or gender counts.
5. **Left out**:
   - too young: `persona_meets_min_age(persona_id, min_age)`; for channels the
     channel's own limit (the community's doesn't apply to channels);
   - deleted communities and channels;
   - communities with a live `community_members` row for the persona (active,
     pending, or rejected: a community that said no isn't suggested again),
     or a live follow;
   - channels with a live `channel_members` row (any status; the owner is a
     member) or a live `channel_followers` row.
6. **Public only** (revised during WWW-70): private communities and
   channels are never suggested. Originally they were suggested by
   metadata.
7. **Same item shapes as the lists**, built by the existing batch helpers, so
   the steps can reuse the community and channel cards:
   - communities: `{communities: [Community]}` (`communities.Handler.build`);
   - channels: `{channels: [ChannelResponse + source]}`, `source` =
     `community` | `interest`, so WWW-72 can group "From your communities".
   - Paging: `?limit=` (default 20, max 50) and `?offset=`, like
     `/communities/`.
8. **Not realtime**: it's a snapshot computed on load. Joining or following
   from the step goes through the existing endpoints, which answer the new
   state; the step updates that card itself.

## Backend

### SQL (then `make generate-models`), no migration

- `community.sql` → `SuggestCommunities :many` (`persona_id`, `lim`, `off`):
  `sqlc.embed(c)` + `channels_count` (same subquery as `ListCommunities`),
  overlap via `community_interests` × `persona_interests`, the exclusions and
  order above.
- `channel.sql` → `SuggestChannels :many` (`persona_id`, `lim`, `off`): the
  same columns as `GetAllChannels` (viewer = persona) plus `source`; the
  persona's communities from `community_members` (active, `left_at IS NULL`)
  ∪ `community_followers` (`unfollowed_at IS NULL`), deleted communities left
  out.
- Member counts in the ranking skip deleted personas, as `ListCommunityStats`
  does.

### Code

- `communities.Handler.Suggest` and `channels.Handler.Suggest`: own-persona
  check, query, then the list's batch enrichers (interests, stats, owners /
  communities) with the target persona as viewer.
- `channels/list.go`: the `GetAllChannels` row → `ChannelResponse` loop moves
  into a helper both handlers use (the two sqlc row types differ, so the
  helper takes the common fields).
- The own-persona check (`GetPersonaByIdAndUserId`, 403 `not_your_persona`)
  becomes a small `auth`-side helper shared with `interests.ownPersona`
  instead of a third copy.
- Routes in `api/v1/persona.go`, under the "any of the user's own personas"
  block; `AddPersonaRoutes` takes the communities and channels handlers.

## Frontend

- `src/services/suggestions.ts`: `getSuggestedCommunities(personaId, {limit,
  offset})` and `getSuggestedChannels(...)` via `apiFetch`, typed with the
  existing community / channel types plus `source`. No UI.

## Docs

- CLAUDE.md: a short "Suggestions" paragraph under Communities (sources,
  order, exclusions, as-that-persona, not realtime), and the age-limit note's
  list of queries gains the two new ones.

## Order and deploy

- Backend only matters at runtime; nothing calls the endpoints until WWW-70.
  No migration, no notifier change.

## Verification

- `go build ./...` / `go vet ./...` in `shared` and `backend`; `pnpm build`
  and `pnpm lint`. There are no tests.
- On dev, with the seeded communities and channels:
  - a persona with interests gets communities sharing them, more shared
    interests first; joining or following one drops it from the next load;
  - a persona under a community's or channel's `min_age` doesn't get it;
  - following a community puts its channels first with `source: community`;
  - a private channel is listed with `is_pending: false`, and drops out after
    a join request;
  - another user's persona id → 403 `not_your_persona`; a non-current own
    persona works and its items reflect that persona's membership;
  - a persona with no interests gets no communities, and only the channels
    of communities it already joined or follows.

## Settled

- No popularity fallback: no shared interest means an empty communities list.
- A community that rejected the persona is never suggested again.

## Implementation notes

- `GetAllChannels` now embeds the channel row (`sqlc.embed(c)`), so the list
  and suggestions share `channels.Handler.build` over a `channelItem`.
- The suggested channel's viewer flags (`is_member`, `is_pending`,
  `is_follower`, `is_owner`) are always false: the query leaves those out.
- The own-persona check is `auth.OwnPersona` (with `auth.NotYourPersona`),
  used by persona interests and both suggestion handlers.
- Checked against a local migrated + seeded database: shared-interest
  ordering, `community` before `interest`, joined/followed/pending/followed
  channels left out, a too-young user gets nothing.
