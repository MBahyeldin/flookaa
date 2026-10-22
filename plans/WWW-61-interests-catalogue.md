# WWW-61 — Interests: admin-managed catalogue

Branch `WWW-61-interests-catalogue`, from `release-caterpie-v1010`.
Epic WWW-56 (onboarding). Backend + frontend. Needed by WWW-63 (persona
interests + onboarding step), WWW-64 (channel tags) and the communities
tickets.

Figma: Falokah UI › Onboarding › interests (`2223:494`), "What are your main
interests?": a grid of chips, each an **emoji + name** (💻 Technology,
🎨 Design, ✍️ Writing, …). That's what the catalogue must hold.

## Goal

- The existing `interests` table becomes the one catalogue that personas,
  channels and communities are tagged with.
- Global Administrators create and edit interests, reorder them, retire and
  restore them, from an admin page in the app.
- Everyone reads the active ones, in order.
- It starts empty.

## Decisions

1. **Shape**: `id`, `name` (unique, case-insensitive), `slug` (unique,
   lowercase, same rule as persona slugs: 3–50 letters, digits, single
   hyphens), `emoji` (required, up to 8 characters; no image upload),
   `sort_order` (int), `retired_at` (null = active), timestamps.
   `pic_url` and `deleted_at` are dropped: nothing reads them and the table
   has no rows. "Retired" is its own column, not `deleted_at`, because in
   this repo `deleted_at` means "filter out everywhere" and a retired
   interest must still show on rows that have it.
2. **Retired** interests aren't offered for new picks (not in
   `GET /interests`, and WWW-63/64 refuse them), but stay on existing
   tags and keep showing there. Restore makes them active again. There is
   no hard delete, so tags never dangle.
3. **Order**: `sort_order` ascending, then name. The admin page moves an
   interest up or down (swap with its neighbour); a new interest goes last.
   WWW-63 may re-rank for the picker (popularity by gender); the stored
   order is the default.
4. **Who's an admin**: a global `Administrator` in `user_roles` (the role
   channel moderation already uses). It's a **database check per admin
   request**, not a JWT claim: unlike email verification, a role can be
   taken away, so a stale claim would fail open.
   - `auth.RequireAdministrator(check)` middleware: 401/403 as today, then
     403 `{"error":"not_administrator"}`. It takes the check as a
     constructor argument (no globals).
   - `auth/info` adds `is_admin` (one query per load) so the app can show
     the admin entry. It's only a UI hint; the API checks every time.
5. **Nobody is an Administrator today**: the seeder creates the
   `ADMIN_EMAIL` account but never gives it the role. `app seed` now also
   assigns `Administrator` to that account (idempotent).
6. **Public read**: `GET /api/v1/interests` is public, like `geo/*`
   (onboarding and signup-adjacent pages can use it before a persona is
   chosen). It returns active interests only, grouped (decision 9).
7. **Admin UI** at `/admin/interests`, inside the dashboard layout. The
   sidebar shows an "Admin › Interests" entry only when `is_admin`; for
   anyone else the route renders a plain "Page not found" message (there's
   no not-found view yet; this adds a small one), with no disabled buttons
   or anything hinting the page exists.
8. **No realtime** for catalogue edits: they're rare, made by one admin, and
   the next load (or WWW-63's picker opening) shows them. Saying it here so
   it's a decision, not an omission of the realtime-by-default rule.
9. **Groups** (added in review, 2026-10-18). Interests sit in groups
   ("Technology & Professional", "Entertainment & Media", …), which the
   WWW-63 picker shows as headings.
   - `interest_groups`: `name` (unique, any case), `slug` (slug rule),
     `sort_order`. Admins create, rename and reorder them on the same admin
     page. No retiring or deleting a group: one with no active interests
     just isn't shown.
   - Every interest belongs to one group: create/update need `group_id`
     (400 `invalid_group` if missing or unknown). `interests.group_id` is
     nullable only so migration 024 runs on dev's existing rows; the seeder
     fills it by slug, and the admin page lists any leftovers under
     "No group" until an admin assigns one. The public list leaves
     ungrouped interests out.
   - Interest order is within its group; changing an interest's group puts
     it last in the new one.
   - Groups come in **migration 024**, not by editing 023, because dev has
     023 applied already.

## Backend

### Migration `023_interests_catalogue`

- `ALTER TABLE interests`: add `slug VARCHAR(50) NOT NULL`,
  `emoji VARCHAR(32) NOT NULL`, `sort_order INT NOT NULL DEFAULT 0`,
  `retired_at TIMESTAMP`; drop `pic_url`, `deleted_at`, and the plain
  `UNIQUE (name)`; add `UNIQUE (slug)` and a unique index on `lower(name)`.
  `created_at`/`updated_at` become `NOT NULL`.
  (Safe as a plain `ALTER`: the table is empty. The migration refuses to run
  if it isn't, rather than inventing slugs.)
- Down: reverse it.
- `schemas/persona.sql` updated to match.

### SQL (`queries/interest.sql`, new)

- `ListActiveInterests` — active and grouped, ordered by group then
  interest.
- `ListAllInterests` — for the admin page, retired last.
- `CreateInterest(name, slug, emoji, group_id)` — `sort_order` = max + 1.
- `UpdateInterest(id, name, slug, emoji, group_id)` — last in a new group.
- `SetInterestOrders(ids, orders)` — a move renumbers the whole list in one
  statement, so equal `sort_order`s can't get stuck.
- `SetInterestRetired(id, retired bool)`.
- Groups: `ListInterestGroups`, `CreateInterestGroup`, `UpdateInterestGroup`,
  `SetInterestGroupOrders`, `InterestGroupExists`.
- Seeding: `SeedInterestGroup`, `SeedInterest` (both `ON CONFLICT DO
  NOTHING`) and `FillInterestGroup` (sets the group of an existing interest
  by slug, only when it has none).

### Migration `024_interest_groups`

- `interest_groups` (`id`, `name`, `slug` unique, `sort_order`, timestamps,
  unique `lower(name)`); `interests.group_id` → `interest_groups(id)`,
  nullable, indexed. Down drops both. `schemas/persona.sql` matches.
- `IsGlobalAdministrator(user_id)` in `roles.query.sql`.

### API (`backend/internal/db/postgres/handlers/interests/`, new `Handler`)

| Route | Tier | Notes |
|---|---|---|
| `GET /api/v1/interests` | public | `[{id, name, slug, interests: [{id, name, slug, emoji}]}]`, groups and interests in order, empty groups left out |
| `GET /api/v1/admin/interests` | admin | `{groups, interests}`; interests carry `group_id`, `retired` |
| `POST /api/v1/admin/interests` | admin | `{name, slug, emoji, group_id}` → 201 |
| `PATCH /api/v1/admin/interests/:id` | admin | any of `name`, `slug`, `emoji`, `group_id` |
| `POST /api/v1/admin/interests/:id/move` | admin | `{direction: up\|down}` within its group and status; no-op at the ends |
| `POST /api/v1/admin/interest-groups` | admin | `{name, slug}` → 201 |
| `PATCH /api/v1/admin/interest-groups/:id` | admin | any of `name`, `slug` |
| `POST /api/v1/admin/interest-groups/:id/move` | admin | `{direction}` |
| `POST /api/v1/admin/interests/:id/retire` / `restore` | admin | idempotent |

Errors: 400 `invalid_name` (blank or over 100), `invalid_slug`,
`invalid_emoji` (blank or over 8 characters), `invalid_group`; 409 `name_taken`,
`slug_taken`; 404 `not_found`.
The admin group is `RequireUser()` + `RequireAdministrator(...)`.

### Seeder

`SeedUsers` → after the admin user exists, grant it `Administrator`
(`GrantUserRoleByName`: upsert, revives a removed grant; needs `SeedRoles`
first, which `root.go` already runs).

`SeedInterests` (added in review, 2026-10-18): the starting catalogue,
8 groups and 46 interests (the user's list). Groups first, then interests
in order. An existing group or interest (same slug, or same name in any
case) is skipped; an existing interest with no group gets its group by
slug. Re-running changes nothing. Base content goes in the seeder from now
on.

Before seeding dev: rename dev's `Bussiness` / `bussiness` to `Business` /
`business` on the admin page, or the seed adds a second Business.

## Frontend

- `types/interest.ts`, `services/interests.ts` (public list + admin calls,
  returning `{ok}` or the error code).
- `types/auth.ts`: `Info.is_admin`.
- `pages/(dashboard)/admin/interests/`:
  - One card per group, in order: the group's name and slug, its up/down
    and Edit, then its interests (emoji, name, `slug`, up/down, a menu with
    Edit and Retire). "No group" (if any) after the groups, "Retired" last
    (each row shows its group).
  - "Add group" and group Edit open a name + slug dialog.
  - "Add interest" and interest Edit open one dialog: emoji, name, slug
    (filled from the name until edited by hand), **group** (required
    select). Field errors from the API codes.
  - Retired rows are dimmed; their menu has Restore.
- `AppRouter`: `/admin/interests`. `app-sidebar`: the Admin entry when
  `user.is_admin`.
- Phone width: one column list, actions in a row menu. Semantic tokens only.

## Files

| File | Change |
|---|---|
| `shared/external/db/postgres/migrations/023_interests_catalogue.{up,down}.sql` | columns, constraints |
| `shared/external/db/postgres/migrations/024_interest_groups.{up,down}.sql` | groups, `interests.group_id` |
| `shared/external/db/postgres/schemas/persona.sql` | same |
| `shared/external/db/postgres/queries/interest.sql`, `roles.query.sql` | catalogue, admin check |
| `shared/pkg/db/` | regenerated |
| `backend/internal/auth/` | `RequireAdministrator` |
| `backend/internal/db/postgres/handlers/interests/` | handler |
| `backend/internal/db/postgres/handlers/users/info.go` | `is_admin` |
| `backend/cmd/server/api/v1/{interests,admin,root}.go`, `cmd/server/root.go` | routes, wiring |
| `backend/cmd/seeder/{users,interests,root}.go` | grant Administrator, seed interests |
| `front-end/src/types/{interest,auth}.ts`, `services/interests.ts` | types, calls |
| `front-end/src/pages/(dashboard)/admin/interests/*` | admin page |
| `front-end/src/routes/AppRouter.tsx`, `components/app-sidebar/` | route, entry |
| `front-end/src/components/not-found/` | small "Page not found" view |
| `CLAUDE.md` | catalogue, admin tier, seeder role |

No GraphQL change, no `pnpm codegen`.

## Out of scope

- Tagging personas (WWW-63), channels (WWW-64), communities (WWW-65+).
- Popularity ranking (WWW-63).
- Managing who is an Administrator from the UI.
- Translations of interest names.

## Acceptance criteria

1. After `migrate-up`, `interests` has the new shape; `migrate-down`
   restores the old one.
2. After `app seed`, the `ADMIN_EMAIL` user is an Administrator and the 8
   groups and 46 interests exist; running it again changes nothing.
   On dev, the existing interests get their groups by slug.
3. As that admin, the sidebar shows Admin › Interests; groups can be
   created, renamed and reordered; interests can be created, edited
   (including their group), moved within their group, retired and
   restored; duplicate names (any case) or slugs show on their fields; an
   interest can't be saved without a group.
4. As anyone else, there's no admin entry, `/admin/interests` shows
   not-found, and every admin API answers 403 `not_administrator`
   (401 when logged out).
5. `GET /api/v1/interests` returns, without logging in, the groups in
   order with their active interests in order; empty groups and
   ungrouped interests are left out.
6. `go build ./...` (backend), `pnpm build`, `pnpm lint` pass.

## QA on dev

- Rename `Bussiness` to Business / `business`, run `migrate-up` and
  `app seed` on dev; every interest is in a group.
- As the admin: add a group, move it, add an interest to it, move it,
  change its group, retire it, restore it.
- `curl /api/v1/interests` logged out: the active list.
- Log in as a normal user: no Admin entry; `/admin/interests` not found;
  `curl -X POST …/admin/interests` → 403.
