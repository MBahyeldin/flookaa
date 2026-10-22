# WWW-80 — Channel and community theme, cover and logo (backend)

Fifth ticket of epic WWW-86. Backend only: channels and communities get a **theme** (palette id), a **cover pattern** and a **logo**, with the fallbacks from `plans/WWW-77-redesign.md` §3. The UI that sets them comes in WWW-104 (create forms) and WWW-105 (manage sheets); the pages that show them are WWW-82, WWW-93, WWW-94.

Design (what the data drives): `Cover` set `13:36` with variants Horizon `13:7`, Waves `13:14`, Hills `13:21`, Stripes `13:34`; `Hero` `14:257`; `Logo` `10:135` (initials fallback); `Tile` `15:309` (logo + accent edge).

## Data

Migration `034_channel_community_identity` (up and down):

- **One theme enum for everything.** `ALTER TYPE persona_theme_enum RENAME TO theme_enum`. Same values (`tide`, `forest`, `ember`, `plum`, `rose`, `slate`), so channels, communities and personas can never drift apart. sqlc's Go type becomes `db.ThemeEnum`; the persona handlers (`resolveTheme`, create, update) follow the rename. Down renames it back.
- `CREATE TYPE cover_pattern_enum AS ENUM ('horizon', 'waves', 'hills', 'stripes')`. Values are permanent, like block `_type`s: add, never rename.
- `communities.theme theme_enum NOT NULL DEFAULT 'tide'`, `communities.cover_pattern cover_pattern_enum NOT NULL DEFAULT 'horizon'`.
- `channels.theme theme_enum` **nullable** (NULL = inherit), `channels.cover_pattern cover_pattern_enum NOT NULL DEFAULT 'horizon'`.
- **Logo = the existing `thumbnail` column** on both tables. It's already on every list and single response and already shown as the avatar; renaming it would touch every query and the frontend for no gain. No column change.
- `banner` stays unused and untouched; photo covers are WWW-92, which decides whether it reuses it.
- SQL function `channel_theme(channel_theme theme_enum, channel_id bigint) RETURNS theme_enum`: the channel's own theme, else its community's (live row: `status = 'active' AND removed_at IS NULL`, community not deleted), else `'tide'`. One place for the fallback, like `persona_meets_min_age`; every query that returns a channel's theme calls it.

Why a community's theme isn't nullable: "otherwise the app default" is just the column default for communities, so there's nothing to inherit from and no NULL case to carry around. Existing rows get `tide` / `horizon`.

## Fields on responses

| Response | Adds |
|---|---|
| Community (list, single, `by-slug`, suggestions) | `theme`, `cover_pattern` (`thumbnail` already there) |
| Channel list item (`GET /channels/`, suggestions, `?community_id=`) | `theme` (resolved, never null), `own_theme` (stored, null = inherits), `cover_pattern` |
| `GET /channels/moderated` | `theme` (resolved), for the suggest picker's logos |
| GraphQL `Channel` | `theme: Theme!` (resolved), `ownTheme: Theme`, `coverPattern: CoverPattern!` (`thumbnailUrl` already there); new enums `Theme`, `CoverPattern` in `schema.graphqls` |
| `CommunityRef` (list item `community`, GraphQL `Channel.community`) | nothing: the channel's resolved `theme` already accounts for it |

`own_theme` is there so the manage sheet can show "Same as community" vs a picked one; everything that renders uses `theme`.

Not added: notification `channel` / `community` summaries (they only draw the avatar, which already has `thumbnail`). A later ticket can add `theme` there if the notification rows get an accent edge.

## Writing them

**Validation** (shared by create and update, in a small helper per handler package, like `resolveTheme`):
- `theme`: a `theme_enum` value, else 400 `invalid_theme`. On a channel, `""` clears it (inherit). On a community it can't be cleared.
- `cover_pattern`: a `cover_pattern_enum` value, else 400 `invalid_cover_pattern`.
- `thumbnail` (logo): `""` (initials), or an s3 file URL: path `/files/<storage key>`, optionally after an `http(s)://host` (the frontend prefixes `VITE_S3_BUCKET_BASE_URL`). Anything else is 400 `invalid_logo`. Today both tables accept any string; this stops pointing a logo at an arbitrary external image (tracking pixels, hotlinks). Existing values aren't rewritten. The seeder sets none (initials).

**Communities**
- `POST /communities/create`: optional `theme` (default `tide`), `cover_pattern` (default `horizon`), `thumbnail` now validated.
- `PATCH /communities/:community_id` (`CanManage`, as today): adds `theme`, `cover_pattern`; already publishes `COMMUNITY.<id>.info.update`.
- A community theme change also publishes `CHANNEL.<id>.info.update` for each of its active channels whose own theme is NULL, since their resolved theme changed (realtime by default). One small query `ListCommunityInheritingChannelIDs`.

**Channels**
- `POST /channels/create`: optional `theme` (absent or `""` = inherit), `cover_pattern` (default `horizon`), `thumbnail` validated. `channels.CreateParams` gains `Theme`, `CoverPattern` so the seeder uses the same path.
- New `PATCH /channels/:channel_id` (`CanModerate`; 404 for non-readers, 403 `not_moderator`, same shape as `PUT …/min-age`). Absent fields are left as they are. Takes `theme`, `cover_pattern`, `thumbnail` only; name and description editing isn't in this ticket (later tickets can add fields here). Uses the existing, unused `UpdateChannel` query, rewritten to `COALESCE(sqlc.narg(...))` per field. Publishes `CHANNEL.<id>.info.update` (no payload; the channel page already refetches on it). Answers the updated `theme`, `own_theme`, `cover_pattern`, `thumbnail`.
- Moving a channel into or out of a community changes its resolved theme; that path already publishes `CHANNEL.<id>.community.update`, which the page refetches on. Nothing new.

The ticket says "managers (`CanManage`)" for communities and "channel moderators (`CanModerate`)" for channels: that's what these use. Community managers get no extra power over a channel's look.

## Seeder

Each seeded community gets a fixed `theme` and `cover_pattern` (so the starting set shows all six palettes and four patterns):

| Community | Theme | Cover |
|---|---|---|
| Tech Builders | slate | stripes |
| Screen & Sound | plum | waves |
| Creators Hub | rose | hills |
| Healthy Living | forest | hills |
| Explorers | tide | horizon |
| Game Night | ember | stripes |
| Egypt & Arabic | ember | horizon |

Seeded channels inherit (theme NULL) and take varied cover patterns from their `seedChannel` entry. No logos (initials). The seeder only sets them on rows it creates, so existing communities keep `tide` / `horizon`; that's the usual skip-if-exists rule. If the user wants existing seeded rows updated, that's a one-off SQL, not seeder logic.

## Docs

CLAUDE.md, Channel access / Communities sections: one paragraph on theme, cover pattern, logo, `channel_theme` fallback, `PATCH /channels/:channel_id`, the new error codes, and "any query returning a channel's theme calls `channel_theme`".

## Steps

1. Migration 034 up/down; schemas in `schemas/channel.sql`, `community.sql`, `persona.sql` (enum rename).
2. Queries: `CreateChannel`, `UpdateChannel`, `CreateCommunity`, `UpdateCommunity`, the channel list/single/suggest/moderated queries select `channel_theme(...)`, `ListCommunityInheritingChannelIDs`. GraphQL enums and `Channel` fields.
3. `make generate-models` against a local Postgres with migrations through 034 (see local codegen notes), then `pnpm codegen` in `front-end/` (types only; no UI change).
4. Handlers: persona rename fallout, communities create/update, channels create + new `PATCH`, route in `api/v1/channels.go`, resolver mapping in `schema.resolvers.go`.
5. Seeder values.
6. CLAUDE.md.
7. `go build ./...` / `go vet` for `backend`, `shared`, `notifier`, `redis`; `pnpm build` in `front-end/` (generated types only). No tests exist.

Deploy order: migration, backend, then (later tickets) frontend. The notifier and redis worker only need rebuilding because the generated `db` package changes (`PersonaThemeEnum` → `ThemeEnum`); neither uses it, so their behaviour is unchanged.

## Out of scope

- Any UI (WWW-104, WWW-105, and the pages in WWW-82/93/94).
- Photo covers and `banner` (WWW-92).
- Channel name/description editing.
- Theme on notification summaries.
