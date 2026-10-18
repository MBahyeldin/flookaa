# WWW-63 — Persona interests and the onboarding interests step

Branch `WWW-63-persona-interests`, from `release-caterpie-v1010`.
Task of epic WWW-56 (onboarding), after WWW-61 (catalogue). Backend + frontend.

Figma: Falokah UI › Onboarding, "What are your main interests?" (the grid
step after "About you").

## Goal

- A persona has interests, picked from the active catalogue.
- New users pick at least one for their default persona during onboarding.
- Every persona can manage its interests later, any time, from its
  settings page.
- Interests are shown in order of popularity among users of the same gender,
  without exposing anyone's gender or counts.

## Decisions

1. **Table `persona_interests`** already exists (migration 003, empty, unused):
   `(persona_id, interest_id)` primary key, both cascade. Migration 025 adds
   `created_at` and an index on `interest_id` for the ranking aggregate.
   No `user_id` anywhere: interests are the persona's, not the account's.
2. **Owner only.** `GET` / `PUT /persona/:persona_id/interests`, in the
   persona-tier `/:persona_id` group. "Self" means **a persona of the same
   user** (not deleted), not only the current persona, so settings can edit
   any of the user's personas. Anything else is 403 `not_your_persona`,
   including a missing persona. No other response shows a persona's
   interests for now.
3. **`GET` answers the picker in one call**:
   `{groups: [{id, name, slug, interests: [{id, name, slug, emoji}]}], selected: [ids], retired: [{id, name, slug, emoji}]}`.
   `groups` is the active catalogue, ranked (decision 5). `retired` holds
   the persona's interests that have since been retired, so the picker can
   show them as removable.
4. **`PUT {interest_ids: [...]}` replaces the set** in one transaction
   (delete what's gone, insert what's new). Rules:
   - at least 1, at most **20** ids, no duplicates: 400 `invalid_interests`;
   - a new id must be an active interest: 400 `invalid_interest`;
   - a retired interest the persona already has may be kept, never added.
   Answers with the same body as `GET`.
5. **Ranking**: groups keep the admin order. Inside a group, interests are
   ordered by the number of non-deleted personas that have the interest and
   belong to users with the viewer's gender, then by admin `sort_order`,
   then name. A user without a gender (only possible before catch-up)
   ranks over all personas. Only the order is returned, never counts or
   genders. The viewer's own personas are included; one person's picks
   move the order by at most one per persona, which reveals nothing.
6. **Onboarding step `interests`** (id 2, not skippable), registered after
   `about_you` in `root.go`. The ids close the gap left by the dropped
   `default_persona` step: `about_you` 1, `interests` 2, `communities` 3,
   `channels` 4, `personas` 5. Safe because only id 1 was ever registered,
   so no stored `onboarding_step` is above 1. `Done(userID)` = the user's default persona has
   at least one interest. The onboarding page already makes the default
   persona current, so the step edits that persona.
7. **Catch-up applies.** Because the step is required, every existing user
   whose default persona has no interests sees only this step (`1 / 1`) on
   their next load, then the dashboard (WWW-60's rule, no migration). This is
   intended: suggestions (WWW-69) need it.
8. **Managed any time after onboarding.** Onboarding is only the first pick.
   Every persona (default or not, new or old) can add, remove and replace
   its interests whenever it likes from its settings page
   (`/persona-manager/:id` › Interests), with the same picker and the same
   `PUT`. A persona created later starts with none and picks there; once it
   has interests it keeps at least one (`PUT` refuses an empty list), so the
   default persona can't fall back into the onboarding catch-up. The
   persona manager list links each persona to its settings, so the section
   is one click away. Later surfaces (profile, suggestions) reuse the same
   endpoints.
9. **Not realtime.** Only the owner sees or changes the list, from one page;
   the next load shows another tab's edit. No NATS event.

## Backend

### Migration `025_persona_interests`

- `ALTER TABLE persona_interests ADD COLUMN created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()`.
- `CREATE INDEX persona_interests_interest_id_idx ON persona_interests (interest_id)`.
- Down: drop both. `schemas/persona.sql` updated to match.

### SQL (`queries/interest.sql`, then `make generate-models`)

- `ListPersonaInterestIDs(persona_id) :many` → ids with a `retired` flag and
  the interest fields (for the `retired` list).
- `RankedActiveInterests(user_id) :many` → `ListActiveInterests` plus a
  `LEFT JOIN` on the same-gender count, ordered per decision 5.
- `ReplacePersonaInterests(persona_id, ids bigint[])`: two statements in one
  transaction, `DeletePersonaInterestsNotIn` and `AddPersonaInterests`
  (`INSERT … SELECT unnest … ON CONFLICT DO NOTHING`).
- `ActiveInterestIDs(ids bigint[]) :many` to validate new ids.
- `OwnsPersona(user_id, persona_id) :one` (if no existing query fits).
- `DefaultPersonaHasInterests(user_id) :one` → the step's `Done`.

### Code

- `handlers/interests`: `PersonaInterests` (GET) and `SetPersonaInterests`
  (PUT) on the existing `Handler`; ownership via `auth.UserID`.
- `api/v1/persona.go`: both routes in `viewGroup`; `AddPersonaRoutes` takes
  the interests handler.
- `root.go`: `onboarding.Step{ID: 3, Key: "interests", Done: q.DefaultPersonaHasInterests}`.

No GraphQL change, no `pnpm codegen`.

## Frontend

- `types/interest.ts`: `PersonaInterests` type; `services/interests.ts`:
  `getPersonaInterests(id)`, `setPersonaInterests(id, ids)` returning `{ok}`
  or the error code.
- `components/interests/InterestPicker.tsx`: group headings with a grid of
  toggle tiles (emoji + name), styled after Figma; 2 columns at phone width,
  more when wider; a "n selected" count and the 20 limit (further tiles
  inert once full). Retired picks shown at the top as removable chips.
  Semantic tokens only.
- `pages/onboarding/steps/Interests.tsx`: loads the current (default)
  persona's interests, the picker, `OnboardingFooter` with
  `continueDisabled` until one is picked and `onContinue` = PUT (an error
  shows a toast and returns `false`). Back returns to About you.
- `steps.ts`: `interests: { title: "What are your main interests?", Component: Interests }`.
- `persona-manager/[id]`: an "Interests" section under the form with the
  picker and its own Save (same PUT).

## Files

| File | Change |
|---|---|
| `shared/external/db/postgres/migrations/025_persona_interests.{up,down}.sql` | column, index |
| `shared/external/db/postgres/schemas/persona.sql` | same |
| `shared/external/db/postgres/queries/interest.sql` | queries above |
| `shared/pkg/db/` | regenerated |
| `backend/internal/db/postgres/handlers/interests/persona.go` | GET/PUT |
| `backend/cmd/server/api/v1/persona.go`, `api/v1/root.go` | routes |
| `backend/cmd/server/root.go` | register `interests` step |
| `front-end/src/types/interest.ts`, `services/interests.ts` | type, calls |
| `front-end/src/components/interests/InterestPicker.tsx` | picker |
| `front-end/src/pages/onboarding/steps/Interests.tsx`, `steps.ts` | the step |
| `front-end/src/pages/(dashboard)/persona-manager/[id]/index.tsx` | settings section |
| `CLAUDE.md` | persona interests rules; `interests` step registered |

## Out of scope

- Showing a persona's interests to others (profile, cards).
- Tagging channels (WWW-64) and suggestions (WWW-69).

## Acceptance criteria

1. `migrate-up` adds `created_at` and the index; `migrate-down` removes them.
2. A new user goes About you → Interests (`2 / 2`) → dashboard; Continue is
   disabled until one interest is picked.
3. `next` on `interests` with none saved is 400 `step_incomplete`; `skip` is
   400 `step_required`.
4. `GET`/`PUT /persona/:id/interests` on another user's persona is 403
   `not_your_persona`; works on any of your own personas, current or not.
5. `PUT` with 0 or 21 ids, duplicates, an unknown id or a newly added retired
   id is 400; keeping an already-tagged retired id works.
6. Two users of different genders see the same groups but interests within
   a group ordered by their own gender's popularity; responses contain no
   counts or genders.
7. An existing user whose default persona has no interests sees only the
   Interests step (`1 / 1`), then the dashboard; `onboarding_step` unchanged.
8. After onboarding, persona settings shows and saves interests for every
   persona (add, remove, replace); a persona with none can pick its first
   there; saving an empty list is refused.
9. `go build ./...` (backend), `pnpm build`, `pnpm lint` pass.

## QA on dev

- Sign up: verify → About you → Interests → dashboard.
- Existing account: Interests only, then the dashboard.
- Settings for a second persona: change interests, reload, they stick.
- Retire an interest as admin: it shows as removable on personas that had it
  and is gone from the grid.
- curl another user's persona: 403.
