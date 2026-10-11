# WWW-18 — Connected personas endpoint

Branch `WWW-18-connected-personas`, from `release-caterpie-v1010`. Epic WWW-12
(persona privacy and following).

## Goal

Given a persona, list its user's other personas that are linked to the
profile (`show_on_profile`, WWW-17). This is the data behind the profile page
(WWW-19). Backend only.

## The rule

A persona is **linked** when it is `public` and `show_on_profile` is on (the
CHECK constraint from WWW-17 already makes the second imply the first).

`GET /api/v1/persona/:persona_id/connected` returns:

- **404** `{"error":"persona not found"}` when the source persona doesn't
  exist, is deleted, or the viewer only gets its anonymous view
  (`access.VisiblePersonas`). A hidden persona's page doesn't exist for that
  viewer.
- **An empty list** when the source is visible but not linked itself (a
  public persona that didn't opt in, or a private persona seen by its
  follower). Listing siblings of an unlinked persona would tie it to the
  user's other personas, which is exactly what it didn't opt in to.
- **The other linked personas** of the same user when the source is linked,
  excluding the source itself, oldest first (`created_at, id`).

Each item has `id`, `name`, `first_name`, `last_name`, `slug`, `thumbnail`,
`bio`. Never `user_id`, `is_default`, `show_on_profile`, `privacy` (always
public here) or anything else from the account (WWW-15 rule).

The same rule applies to everyone, including the user's own personas: the
endpoint shows what a visitor sees. Your full list stays `/persona/list`.

No paging: a user has a handful of personas. No Redis: one indexed query
(`UNIQUE (user_id, slug)` covers `user_id`).

## Changes

1. **Query** (`queries/persona.sql`), then `make generate-models`:

   ```sql
   -- name: ListConnectedPersonas :many
   SELECT p.id, p.name, p.first_name, p.last_name, p.slug, p.thumbnail, p.bio
   FROM personas s
   JOIN personas p ON p.user_id = s.user_id AND p.id <> s.id
   WHERE s.id = $1
     AND s.deleted_at IS NULL AND s.privacy = 'public' AND s.show_on_profile
     AND p.deleted_at IS NULL AND p.privacy = 'public' AND p.show_on_profile
   ORDER BY p.created_at, p.id;
   ```

   The source's visibility check is a separate call to the existing
   `access.VisiblePersonas` (one row), so the rule stays in one place.
2. **Backend**
   - `users.Handler.ConnectedPersonas` in
     `backend/internal/db/postgres/handlers/users/persona.go`: parse
     `:persona_id` (400 on a bad id), check visibility for `auth.PersonaID(c)`,
     run the query, respond `{"personas": [...]}` (always an array, never
     `null`).
   - Route in `backend/cmd/server/api/v1/persona.go`: a nested group under
     `/persona` with `auth.RequirePersona()`, since visibility depends on the
     viewing persona. The other `/persona/*` routes stay User tier. Gin 1.10
     allows `/:persona_id/...` next to the static `/list`, `/current`.
3. **CLAUDE.md**
   - Tier table: `persona/:persona_id/connected` is Persona tier.
   - One bullet in "Persona access": connected personas are listed only from
     a linked persona; a hidden source is 404, an unlinked one is empty.

## Out of scope

- The profile page and the frontend service call (WWW-19).
- The source persona's own fields (name, avatar, bio) for the profile header
  (WWW-19).
- Linking from a persona to the *user* (there is no public user profile).

## Acceptance

With user U owning A (public, linked), B (public, linked), C (public, not
linked), D (private), E (only_me), and a viewer V from another user:

- From A: V gets `[B]`; from B: `[A]`.
- From C: V gets `[]`.
- From D: V gets 404, unless V is an approved follower of D, then `[]`.
- From E: V gets 404. When one of U's own personas requests E, it gets `[]`.
- A requesting its own list gets `[B]`, the same as a visitor.
- Deleting B or turning it private or `only_me` removes it from A's list.
- No item carries `user_id`, `is_default`, `show_on_profile` or `privacy`.
- No cookie → 401; a user without a current persona → 403 `persona_required`.
- `go build ./...` and `go vet ./...` pass in `shared/` and `backend/`. There
  are no tests in the repo.
