# WWW-30 — Persona theme column and API

Branch `WWW-30-persona-theme`, from `release-caterpie-v1010`. Epic WWW-14
(Persona themes). Backend only, plus the frontend `Persona` type. WWW-29 made
the palettes; this ticket stores which one a persona picked. WWW-31 applies it
to the interface, WWW-32 is the picker, WWW-33 shows it to viewers.

## Goal

Every persona has a theme, one of the WWW-29 palette ids, defaulting to
`tide`. The owner can read it and set it through the existing persona
endpoints. Nothing renders it yet.

## Decisions

1. **A Postgres enum, `persona_theme_enum`**: `tide`, `forest`, `ember`,
   `plum`, `rose`, `slate`, the ids in `front-end/src/themes/palettes.ts`.
   - Column `personas.theme persona_theme_enum NOT NULL DEFAULT 'tide'`, so
     existing rows get `tide` (today's look) and no backfill is needed.
   - Same reasoning as `privacy` and the notification kinds: ids are
     permanent, and an enum makes the database refuse a typo. A new palette is
     one `ALTER TYPE … ADD VALUE` migration plus its CSS and `PALETTES` entry.
   - Retiring a palette never removes the value (like block `_type`s); the
     frontend falls back to `tide` for an id it doesn't know (WWW-31).
2. **Validation via sqlc.** Turn on `emit_enum_valid_method: true` in
   `sqlc.yaml`, which only adds a `Valid()` method to every generated enum.
   The handler does `t := db.PersonaThemeEnum(req.Theme); if !t.Valid() → 400
   {"error":"invalid_theme"}`. No second list of ids in Go.
3. **API, own personas only** (account endpoints, User tier):
   - `POST /persona/create` and `POST /persona/update/:persona_id` accept an
     optional `theme`. Empty or missing = `tide` on create, unchanged on
     update. Unknown = 400 `invalid_theme`, nothing written.
   - `GET /persona/list`, the `/persona/update` response and
     `GET /persona/current` return `theme`. `/current` is what WWW-31 reads to
     theme the interface of the active persona.
   - `UpdatePersonaByIdAndUserId` gets `theme = COALESCE($n, theme)` like the
     other fields; `CreatePersona` gets a `theme` param.
4. **Not visible to other personas yet.** `GET /persona/:persona_id`,
   GraphQL `Persona`, the Redis persona cache and `ResolvePersonasForViewer`
   are unchanged; WWW-33 decides how viewers see it (and that the anonymous
   and locked views carry no theme). Changing the theme still evicts the Redis
   entry, since `UpdatePersona` already does that on every update.
5. **Frontend**: only `theme: PaletteId` on the `Persona` type in
   `src/types/persona.ts`, so WWW-31/32 have it typed. No UI.

## Steps

1. Migration `020_persona_theme.up.sql` (type + column) and `.down.sql`
   (drop column, drop type); mirror both in `schemas/persona.sql`.
2. Queries: `theme` in `CreatePersona` and `UpdatePersonaByIdAndUserId`
   (`GetUserPersonasByUserId` and `GetPersonaBasicInfo` need `theme` selected;
   the first is `SELECT *`, the second gets `u.theme` added).
3. `sqlc.yaml`: `emit_enum_valid_method: true`; `make generate-models`
   against a database with 001–020 applied.
4. `users/persona.go`: `theme` in the create/update request structs,
   validation, and in the list/update/current responses.
5. `src/types/persona.ts`: add `theme`.
6. `go build ./...` in `backend/`, `pnpm build` and `pnpm lint` in
   `front-end/`.

## Acceptance criteria

- After `make migrate-up`, every existing persona has `theme = 'tide'`;
  `make migrate-down` removes the column and type cleanly.
- `POST /persona/update/:id {"theme":"plum"}` → 200 with `"theme":"plum"`;
  `/persona/list` and `/persona/current` then return `plum`.
- `{"theme":"neon"}` → 400 `invalid_theme`, persona unchanged.
- An update without `theme` leaves it unchanged; a create without it gives
  `tide`.
- Another persona's `GET /persona/:id` response is unchanged (no `theme`).
- Backend builds, frontend `pnpm build` and `pnpm lint` pass. No tests (none
  in the repo).

## Changed during implementation

- `UpdatePersonaByIdAndUserId` sets `theme = $12` instead of `COALESCE`: the
  handler always passes a resolved value (requested or current), as it does
  for `show_on_profile`.

## Deploy note

The backend needs migration 020 applied before it starts serving these
queries (the `CreatePersona`/`Update` statements reference the column).

## Out of scope

- Applying the theme (WWW-31), the picker (WWW-32), viewers seeing it
  (WWW-33).
- Per-channel themes, custom colours.
