# WWW-17 — "Show on my profile" flag for public personas

Branch `WWW-17-show-on-profile`, from `release-caterpie-v1010`. Epic WWW-12
(persona privacy and following).

## Goal

A per-persona opt-in, `show_on_profile`, off by default, that says "link this
persona to my user's profile". Only a public persona can have it on. This
ticket stores the flag and lets the owner toggle it from persona settings.
Nothing reads it for other viewers yet: WWW-18 (connected personas endpoint)
and WWW-19 (profile page) consume it.

## The rule

- `show_on_profile` is `true` only if the persona is `public`. The database
  enforces it, so no code path can store a linked private persona.
- Turning a persona `private` or `only_me` clears the flag in the same update.
  It does not come back when the persona is made public again: re-linking is
  a fresh opt-in.
- Asking for `show_on_profile: true` on a non-public persona (or in the same
  request that makes it non-public) is a 400 `{"error":"show_on_profile_requires_public"}`.
- The flag is account data, like `is_default`: it only appears on your own
  persona endpoints (`/persona/list`, `/persona/update`), never in a response
  about another persona (WWW-15 rule). It is not added to the Redis persona
  cache or to GraphQL.

## Changes

1. **Migration 014 `persona_show_on_profile`**
   - `ALTER TABLE personas ADD COLUMN show_on_profile BOOLEAN NOT NULL DEFAULT false`.
     A default is right here (unlike `persona_followers.status`): off is the
     safe value and existing personas must start unlinked.
   - `ADD CONSTRAINT personas_show_on_profile_public CHECK (NOT show_on_profile OR privacy = 'public')`.
   - Down: drop the constraint, then the column.
   - `schemas/persona.sql` updated to match.
2. **Queries** (`queries/persona.sql`), then `make generate-models`:
   - `UpdatePersonaByIdAndUserId` sets `show_on_profile` too.
   - `CreatePersona` takes `show_on_profile`.
3. **Backend** (`backend/internal/db/postgres/handlers/users/persona.go`)
   - `CreatePersona` and `UpdatePersona` accept an optional
     `show_on_profile` (`*bool`, absent = keep the current value / false on
     create).
   - One small helper resolves the final value from the resulting privacy and
     the request: non-public → `false` (400 if the request asked for `true`).
   - `ListPersonas` and the `UpdatePersona` response include
     `show_on_profile`.
   - `UpdatePersona` already evicts the persona cache; nothing else to do.
4. **Frontend**
   - `types/persona.ts`: `show_on_profile: boolean`.
   - A `switch` form interface type rendered with the existing
     `components/ui/switch.tsx` in `FieldRender`.
   - `FormField` gets an optional `visibleWhen(values)`; the
     `show_on_profile` field ("Show on my profile") in
     `lib/formFields/persona.tsx` is only rendered while `privacy` is
     `public` (hidden, not disabled). Switching privacy away from public sets
     it to `false` in the form, matching the backend.
   - Found while coding: there is no persona edit form, only the create
     dialog. So `pages/(dashboard)/persona-manager` gets an "On my profile"
     column with a switch on public rows only, calling
     `POST /persona/update/:id {show_on_profile}` (`services/persona.ts`
     `setShowOnProfile`).
5. **CLAUDE.md**: one bullet in "Persona access": `show_on_profile` is
   public-only (CHECK constraint), cleared when privacy changes, and only
   returned on your own persona endpoints.

## Out of scope

- Anything that reads the flag for other viewers: connected personas
  endpoint (WWW-18), profile page (WWW-19).
- A user-level "profile" response: there is none yet beyond `/users/profile`
  (your own account), and it doesn't change here.

## Acceptance

- New and existing personas have `show_on_profile = false`.
- A public persona can turn it on and off from persona settings; the toggle
  isn't shown for private or `only_me` personas.
- Making a linked persona private or `only_me` clears the flag; making it
  public again leaves it off.
- `show_on_profile: true` on a non-public persona returns 400, and a direct
  `UPDATE` that tries it fails on the CHECK constraint.
- The flag shows in `/persona/list` and the update response only, not in
  GraphQL, member lists or the persona cache.
- `make migrate-up` then `make migrate-down` then `make migrate-up` works.
- `go build ./...` and `go vet ./...` pass in `shared/` and `backend/`, and
  `pnpm build` and `pnpm lint` pass. There are no tests in the repo.
