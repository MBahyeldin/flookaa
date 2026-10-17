# WWW-32 — Persona settings page

Branch `WWW-32-persona-settings-page`, from `release-caterpie-v1010`. Epic
WWW-14 (Persona themes). Was "Theme picker in persona settings"; widened on
2026-10-17 so that every persona field is edited in one place instead of
piling controls into the `/persona-manager` table. WWW-30 stored the theme,
WWW-31 applies the active persona's theme, WWW-33 shows it to viewers.

## Goal

`/persona-manager/:id` is a settings page for one of your own personas: its
label, description, profile names, slug, picture, bio, privacy, "show on my
profile" and theme, saved together. The table becomes a list that opens it.

## Decisions

1. **A page route, not a modal**: `/persona-manager/:id`, linkable, with room
   for the theme picker's previews, and no long scrolling dialog on mobile.
   Not your persona or unknown id → the existing not-found view. The persona
   comes from `UserProfileStore.personas` (`/persona/list` already returns
   every field, including `theme`); no new GET endpoint.
2. **Fields**, in two cards like the create form:
   - *Persona* (account data, only you see it): `name` (label), `description`,
     `privacy`, `show_on_profile` (only while public, as today), `theme`.
   - *Profile* (what others see): `thumbnail`, `first_name`, `last_name`,
     `slug`, `bio`.
3. **Reuse the form system.** A `Form.personaSettings(id)` factory that
   points at `POST /api/v1/persona/update/:id`, built from the same field
   definitions as `Form.persona` plus `slug` and `theme`, with
   `initialValues` from the stored persona. Create keeps its own form (no
   slug field there; the server generates one).
4. **Theme picker**: a new `theme` interface type in `FieldRender`. One
   option per `PALETTES` entry, each a small card wrapped in
   `data-theme={id}` (background, card, primary button, text), so it shows
   the palette in the current light/dark mode. The page body is wrapped in
   `data-theme={selected}`, so the picked palette previews live before
   saving; after saving, WWW-31 repaints the whole interface if it's the
   active persona.
5. **Slug becomes editable** (the handler ignores it today):
   - Format: 3–50 chars, lowercase letters, digits and single hyphens, not
     starting or ending with a hyphen. Checked in Go (400 `invalid_slug`)
     and mirrored in the form.
   - Uniqueness stays **per user**, as the `UNIQUE (user_id, slug)`
     constraint already says: nothing looks personas up by slug (profiles are
     `/personas/:id`), and a global check would tell anyone that a hidden
     persona holds a slug. A clash → 409 `slug_taken` (unique violation
     `23505` on that constraint), nothing written.
6. **Clearable optional fields.** Today `""` means "unchanged" for every
   field, so a bio, description or picture can't be removed. `bio`,
   `description` and `thumbnail` become `*string` in the update request:
   missing = unchanged, `""` = cleared. `name`, `first_name`, `last_name`
   stay required (empty = unchanged server-side; the form requires them).
7. **Privacy side effects are shown, not new.** Leaving public turns off
   "show on my profile"; leaving private resets the follow-request link and
   cancels pending invitations (both already done by `UpdatePersona`). The
   form says so under the privacy select when the change would trigger them.
8. **After saving**: `updatePersonaInStore` with the response (it already
   returns every field), a success toast, stay on the page. If it's the
   active persona, also `setPersona`, so WWW-31's hook picks up a new theme
   at once.
9. **The table** (`/persona-manager`): drops the "On my profile" switch.
   Columns: avatar + name, profile name + `@slug`, visibility, theme (a
   swatch). The row opens the settings page; the menu has "Edit" and "View
   profile". The current "Delete" item does nothing (`deletePersona` is
   commented out), so it's removed until deleting is built. `setShowOnProfile`
   in `services/persona.ts` goes with the switch if nothing else uses it.

## Steps

1. Backend `users/persona.go`: `*string` for `bio`/`description`/
   `thumbnail`, `slug` in the update request with validation, `slug_taken`
   on the unique violation. Query unchanged (`slug = COALESCE($9, slug)`
   already exists).
2. Frontend:
   - `services/persona.ts`: `updatePersona(id, fields)` returning the persona
     or the error code.
   - `lib/formFields/persona.tsx`: `slug` and `theme` fields; field groups
     for create and settings share definitions.
   - `models/Forms/Form.ts`: `Form.personaSettings(id)`.
   - `components/form/FieldRender`: `theme` interface type (palette picker).
   - `pages/(dashboard)/persona-manager/[id]/index.tsx` and the route in
     `AppRouter.tsx`.
   - `pages/(dashboard)/persona-manager/index.tsx`: the slimmer table.
3. `go build ./...` in `backend/`; `pnpm build` and `pnpm lint` in
   `front-end/`.

## Acceptance criteria

- Opening a row in `/persona-manager` goes to `/persona-manager/:id`, which
  shows every field filled in. Another user's persona id shows not found.
- Changing any field and saving updates the persona; `/persona/list` and the
  table reflect it without a reload.
- Picking a palette re-colours the page before saving; saving the active
  persona's theme re-colours the whole interface (with WWW-31 merged).
- Slug: `Bad Slug` → 400 `invalid_slug`, shown on the field; another of your
  personas' slugs → 409 `slug_taken`, shown on the field; a valid new one
  saves and shows as `@new-slug` on the profile and card.
- Emptying the bio, description or picture and saving clears them.
- Public → private with "show on my profile" on: the switch disappears, the
  note explains it, and after saving `show_on_profile` is false.
- `pnpm build`, `pnpm lint`, backend build pass. No tests (none in the repo).

## Changed during implementation

- No `updatePersona` service: the settings form submits through the form
  system like the other forms. `Form` gained `serverErrors` (API error code →
  field + message), which `useForm` shows on that field, and `FormComponent`
  an `onValuesChange` callback for the live theme preview.
- A cleared bio or picture is stored as `''`, not NULL: the query keeps
  `COALESCE` for "unchanged", and every reader already uses `.String`.
- `slug_taken` is detected with `postgres.IsUniqueViolation` (new, in
  `shared/external/db/postgres`) on `personas_user_id_slug_key`.
- `SelectInput` shows `hint` like `TextInput` (for the privacy note).

## Out of scope

- Deleting a persona (the menu item is removed, not built).
- Followers, requests and the invite link: they stay on the profile page
  (`FollowersSheet`).
- Live update of the settings on your other devices; they pick changes up on
  the next load of `/persona/list`.
- Global slug uniqueness or slug-based URLs.
