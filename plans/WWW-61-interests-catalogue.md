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
   chosen). It returns active interests only:
   `[{id, name, slug, emoji}]`.
7. **Admin UI** at `/admin/interests`, inside the dashboard layout. The
   sidebar shows an "Admin › Interests" entry only when `is_admin`; for
   anyone else the route renders a plain "Page not found" message (there's
   no not-found view yet; this adds a small one), with no disabled buttons
   or anything hinting the page exists.
8. **No realtime** for catalogue edits: they're rare, made by one admin, and
   the next load (or WWW-63's picker opening) shows them. Saying it here so
   it's a decision, not an omission of the realtime-by-default rule.

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

- `ListActiveInterests` — `retired_at IS NULL ORDER BY sort_order, name`.
- `ListAllInterests` — for the admin page, retired last.
- `CreateInterest(name, slug, emoji)` — `sort_order` = current max + 1.
- `UpdateInterest(id, name, slug, emoji)`.
- `SwapInterestOrder(id, neighbour_id)` — one statement swapping the two
  `sort_order` values.
- `SetInterestRetired(id, retired bool)`.
- `IsGlobalAdministrator(user_id)` in `roles.query.sql`.

### API (`backend/internal/db/postgres/handlers/interests/`, new `Handler`)

| Route | Tier | Notes |
|---|---|---|
| `GET /api/v1/interests` | public | active, ordered |
| `GET /api/v1/admin/interests` | admin | all, with `retired` |
| `POST /api/v1/admin/interests` | admin | `{name, slug, emoji}` → 201 |
| `PATCH /api/v1/admin/interests/:id` | admin | any of `name`, `slug`, `emoji` |
| `POST /api/v1/admin/interests/:id/move` | admin | `{direction: up\|down}`; no-op at the ends |
| `POST /api/v1/admin/interests/:id/retire` / `restore` | admin | idempotent |

Errors: 400 `invalid_name` (blank or over 100), `invalid_slug`,
`invalid_emoji` (blank or over 8 characters); 409 `name_taken`,
`slug_taken`; 404 `not_found`.
The admin group is `RequireUser()` + `RequireAdministrator(...)`.

### Seeder

`SeedUsers` → after the admin user exists, `AssignUserRole(admin,
Administrator)` unless already assigned (needs `SeedRoles` first, which
`root.go` already runs).

## Frontend

- `types/interest.ts`, `services/interests.ts` (public list + admin calls,
  returning `{ok}` or the error code).
- `types/auth.ts`: `Info.is_admin`.
- `pages/(dashboard)/admin/interests/`:
  - A table/list: emoji, name, `slug`, status badge (Active / Retired),
    up/down buttons, Edit, Retire or Restore.
  - "Add interest" and Edit open one dialog: name, slug (filled from the
    name until edited by hand), emoji (text input; the OS emoji keyboard
    works). Field errors from the API codes.
  - Retired rows are dimmed and listed after the active ones.
- `AppRouter`: `/admin/interests`. `app-sidebar`: the Admin entry when
  `user.is_admin`.
- Phone width: one column list, actions in a row menu. Semantic tokens only.

## Files

| File | Change |
|---|---|
| `shared/external/db/postgres/migrations/023_interests_catalogue.{up,down}.sql` | columns, constraints |
| `shared/external/db/postgres/schemas/persona.sql` | same |
| `shared/external/db/postgres/queries/interest.sql`, `roles.query.sql` | catalogue, admin check |
| `shared/pkg/db/` | regenerated |
| `backend/internal/auth/` | `RequireAdministrator` |
| `backend/internal/db/postgres/handlers/interests/` | handler |
| `backend/internal/db/postgres/handlers/users/info.go` | `is_admin` |
| `backend/cmd/server/api/v1/{interests,admin,root}.go`, `cmd/server/root.go` | routes, wiring |
| `backend/cmd/seeder/users.go` | assign Administrator |
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
2. After `app seed`, the `ADMIN_EMAIL` user is an Administrator; running it
   again changes nothing.
3. As that admin, the sidebar shows Admin › Interests; create, edit, move,
   retire and restore all work, and duplicate names (any case) or slugs show
   on their fields.
4. As anyone else, there's no admin entry, `/admin/interests` shows
   not-found, and every admin API answers 403 `not_administrator`
   (401 when logged out).
5. `GET /api/v1/interests` returns only active interests in order, without
   logging in.
6. `go build ./...` (backend), `pnpm build`, `pnpm lint` pass.

## QA on dev

- `app seed` on dev, log in as the admin, add a dozen interests from the
  Figma list, reorder, retire one, restore it.
- `curl /api/v1/interests` logged out: the active list.
- Log in as a normal user: no Admin entry; `/admin/interests` not found;
  `curl -X POST …/admin/interests` → 403.
