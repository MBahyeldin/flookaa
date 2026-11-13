# WWW-9 — Use TIMESTAMPTZ for time columns

Every Postgres time column becomes `timestamptz`. Since migration 012, new tables (events, notifications, follows, invitations, email changes, password resets, saved posts) already use it. The older tables still have `timestamp without time zone`. This ticket converts them, so no column is ambiguous and mixed comparisons go away.

## Why it matters

lib/pq reads a `timestamp` value as if it were UTC, and the value means UTC only because the server's `TimeZone` happens to be UTC. Go code relies on that in several places. `access.RejectedUntil` checks `resolved_at + 7 days` against `time.Now()`. `channels/community.go` and `communities/handler.go` format `resolved_at` and `created_at` as RFC 3339 with `Z`. If the server or a session ever ran in another zone, all of these would silently be off by the offset. A `timestamptz` holds an instant, so the zone no longer matters.

## Scope

63 columns in 27 tables, listed from a database with migrations 001–043 applied (`information_schema.columns`, `data_type = 'timestamp without time zone'`):

| Tables | Columns |
|---|---|
| `users`, `user_roles`, `roles`, `user_verifications` | `created_at`, `updated_at`, `deleted_at`; `expires_at`, `last_sent_at`, `verified_at` |
| `personas`, `persona_interests`, `persona_friend_groups`, `persona_relationships`, `post_references` | `created_at`, `updated_at`, `deleted_at` |
| `channels`, `channel_members`, `channel_followers`, `channel_roles`, `channel_interests` | `created_at`, `updated_at`, `deleted_at`, `joined_at`, `left_at`, `followed_at`, `unfollowed_at` |
| `communities`, `community_members`, `community_followers`, `community_roles`, `community_channels`, `community_interests` | plus `resolved_at`, `removed_at` |
| `interests`, `interest_groups` | plus `retired_at` |
| `countries`, `regions`, `subregions`, `states`, `cities` | `created_at`, `updated_at` |

These stay as they are:
- `date` columns (`users.date_of_birth`), since a date is not an instant.
- The 20 columns that are already `timestamptz`.
- MongoDB, which stores BSON dates, which are already UTC instants.

## Migration `044_timestamptz`

**Up**, in one transaction, which golang-migrate gives a multi-statement file:

1. One `ALTER TABLE` per table, with every column at once (one rewrite per table): `ALTER COLUMN x TYPE timestamptz`, with no `USING`. The default cast reads each value in the session's `TimeZone`, which is the zone `now()` wrote it in, so the conversion is correct on any server zone (dev is `Etc/UTC`, checked 2026-11-13). Defaults (`now()`, `CURRENT_TIMESTAMP`, `now() + interval '24 hours'`), `NOT NULL` and the partial indexes (`WHERE left_at IS NULL` etc.) carry over unchanged.
2. `cities.created_at` has the literal default `'2014-01-01 12:01:01'::timestamp`. It is restated as `'2014-01-01 12:01:01+00'::timestamptz`.

**Down**: the same tables back to `timestamp` (the default cast, in the session's zone again), and the old `cities` default.

Decided with the user (2026-11-13): the migration never refuses. A server that isn't on UTC is reported at service start instead (see Code).

**Checked on a throwaway cluster** (2026-11-13, all 43 migrations applied): every `ALTER` succeeds, no view, index expression or constraint blocks it, and 0 `timestamp without time zone` columns remain.

**Locking**: each table is rewritten under `ACCESS EXCLUSIVE`, and the locks are held until the transaction commits. The tables are small, and `cities` (the geo seed, the largest) takes seconds. Requests that touch these tables wait during the migration. Nothing fails, so no maintenance window is needed.

## Code

- `shared/external/db/postgres/schemas/*.sql`: the same columns change to `TIMESTAMPTZ`, because sqlc reads table shapes from here (channel, community, persona, user, role, user_verifications, geo).
- `make generate-models`: both types map to `time.Time` / `sql.NullTime`, so `shared/pkg/db/` should come out unchanged. If it doesn't, callers are fixed in this ticket.
- Callers: no Go code writes a time into these columns. The only time-typed query parameters are on tables that are already `timestamptz`. Readers keep working, and their `.UTC()` calls stay as harmless normalisation. JSON output is unchanged: lib/pq gives a zero-offset time either way, which RFC 3339 formats with `Z`.
- SQL: the `now() - interval '…'` cooldown checks on `resolved_at` (`community.sql`) become instant comparisons, with the same results under UTC.
- Startup warning: `postgres.Connect` (`shared/external/db/postgres`) runs `SHOW TimeZone` after the ping, and if it isn't `UTC` or `Etc/UTC` it logs one warning line, e.g. `postgres: server TimeZone is "Africa/Cairo", expected UTC`. It doesn't fail: times stay correct instants, but they come out of lib/pq in that zone's offset, and the SQL written for UTC (`persona_meets_min_age`) assumes UTC. Backend, seeder, notifier and redis worker all connect through it, so all of them warn.
- Frontend: no change.

## Docs

CLAUDE.md, under Migrations: "Time columns are `TIMESTAMPTZ` (never `TIMESTAMP`); dates of birth stay `date`."

## Deploy

1. Run `make migrate-up`, then deploy the backend, notifier and redis worker. The binaries don't depend on the migration order: they work before and after it.

## Steps

1. Write `044_timestamptz.up.sql` / `.down.sql`, run up, down and up again on a throwaway cluster, and confirm the column types and the `cities` default each time. Also run it with the session zone set to `Africa/Cairo` and check that the instants are unchanged.
2. Add the startup warning to `postgres.Connect`.
3. Update the schema files and run `make generate-models`. Expect no diff in `pkg/db`.
4. Run `go build ./...` in `backend`, `notifier`, `redis` and `shared`. Make the CLAUDE.md edit.
5. QA on dev, by you: run the migration. Then check that a channel join or leave, community join, rejection cooldown (`rejected_until`), verification resend cooldown and notification list all behave as before, with the same times shown.
