# WWW-60 — Onboarding "About you" step: date of birth and gender

Branch `WWW-60-about-you-step`, from `release-caterpie-v1010`.
Fourth task of epic WWW-56 (onboarding), first real step in the WWW-59 shell.
Backend + frontend.

Figma: Falokah UI › Onboarding › auth screen (`2337:21974`): title "Enter your
date of birth", a **Date of birth** field (calendar icon, "Select a date"),
a **Gender** select, and **Continue**.

## Goal

- Collect date of birth and gender once, right after verification, as
  account data on the user.
- Both are required to pass the step; there is no minimum age.
- They never leave the account: only your own `users/profile` returns them.
- Profile settings can change both later.

## Decisions

1. **Columns on `users`**, not a new table: `date_of_birth DATE` and
   `gender gender_enum` (`male`, `female`), both nullable. Existing users
   have neither; decision 8 brings them back to answer.
   WWW-68 decides what a missing DOB means for age rules.
2. **Saved through `PATCH /users/profile`**, not a step-specific endpoint.
   It's the account's own data and settings edit it there anyway. The step
   saves with PATCH, then calls `next`. PATCH still never touches onboarding.
3. **Set, not clear.** PATCH changes a field only when it's sent; once set,
   neither can be cleared, only changed (an empty string is a 400, not a
   clear). So a completed step can't become incomplete.
4. **Validation (Go is the authority, zod mirrors it):**
   - `date_of_birth`: `YYYY-MM-DD`, a real date, `>= 1900-01-01`, and not
     after today (UTC). 400 `{"error":"invalid_date_of_birth"}`.
   - `gender`: `male` or `female`. 400 `{"error":"invalid_gender"}`.
5. **Not in `auth/info`.** The step and settings read them from
   `GET /users/profile`; `auth/info` stays the light per-load call.
   (The ticket text says "auth/info / users/profile"; profile alone is
   enough and keeps them off every load.)
6. **The step uses the shell frame**, not the auth-screen illustration in
   that Figma frame: logo, progress `1 / N`, title, the two fields, and
   `OnboardingFooter` (no Back on the first step, no Skip: required). Field
   styling follows Figma.
7. **Date input: native `<input type="date">`** styled like `Input`, with
   `min`/`max` set. No calendar dependency; phones get their own picker,
   which beats a month grid for a birth year.
8. **Catch-up for required steps.** A user who is past a required
   (non-skippable) step without its data, e.g. an existing user with no DOB
   or gender, is shown **only the required steps they're missing**, then
   returns to the dashboard. Optional steps are never shown again. This is
   generic in `onboarding.Flow`, so `default_persona` and `interests` get
   the same treatment when they're registered. No migration resets anyone's
   `onboarding_step` / `onboarding_completed`.

## Backend

### Migration `022_user_about_you`

- `CREATE TYPE gender_enum AS ENUM ('male', 'female')`.
- `ALTER TABLE users ADD COLUMN date_of_birth DATE, ADD COLUMN gender gender_enum`.
- `CHECK (date_of_birth >= DATE '1900-01-01')` (the upper bound is checked
  in Go: a CHECK using `now()` is only evaluated on write, so it isn't a
  real constraint).
- Down: drop the columns, the constraint and the type.
- `schemas/user.sql` updated to match.

### SQL (`queries/users.query.sql`, then `make generate-models`)

- `UpdateUser`: `date_of_birth = COALESCE(…, date_of_birth)`,
  `gender = COALESCE(…, gender)`, both in `RETURNING`.
- `GetUserProfile` is `u.*`, so it picks them up.
- `UserAboutYouDone(id) :one` → `date_of_birth IS NOT NULL AND gender IS NOT NULL`.

### Code

- `models.PatchUserRequest`: `DateOfBirth *string`, `Gender *string`
  (pointers, so "not sent" differs from "empty").
- `users.UpdateProfile`: validates both (decision 4) before the update;
  `GetProfile` adds `date_of_birth` (`YYYY-MM-DD` or null) and `gender`
  (or null).
- `root.go`: `onboarding.New(onboarding.Step{ID: 1, Key: "about_you",
  Skippable: false, Done: <UserAboutYouDone via q>})`.

### Catch-up in `backend/internal/onboarding` (decision 8)

- `State` and `Move` take `ctx` and `userID`, since state now depends on
  `Done`.
- **Normal flow** is unchanged: not completed and a registered step with
  `ID > onboarding_step` exists → that step is current.
- **Otherwise** (completed, or no step left), run `Done` on the
  non-skippable steps in order. Any that return false are the **catch-up
  steps**: `current` is the first of them, `steps` lists only them
  (so the shell shows `1 / 1`), and `completed` is false.
  No missing step → `completed: true`, as today.
- `Move` on a catch-up step: `next` needs `Done` (400 `step_incomplete`),
  `skip` is 400 `step_required`, `back` is 400 `no_previous_step`.
  A valid `next` **writes nothing** (`onboarding_step` and
  `onboarding_completed` stay as they were); the handler skips
  `AdvanceOnboarding` and answers with the recomputed state.
- Cost: a completed user's `auth/info` runs the required steps' `Done`
  queries (one cheap indexed query each, three at most once the epic
  ships).
- `MoveOnboarding` and `Info` pass `ctx`/`userId` through; a `Done` error
  on `auth/info` is logged and treated as done, so a DB hiccup never locks
  a user out of the dashboard.

No GraphQL change, no `pnpm codegen`. Nothing else reads the new columns:
no persona, GraphQL, notification or channel response selects them.

## Frontend

- `types/user.ts`: `Profile.date_of_birth?: string | null`,
  `gender?: "male" | "female" | null`; a shared zod `aboutYouSchema`
  mirroring decision 4.
- `services/user.ts`: `updateProfile(patch)` returning `{ok}` or the API
  error code.
- `pages/onboarding/steps/AboutYou.tsx`: loads `getUserData()` (prefills
  if already saved, e.g. after Back from step 2), the two fields, inline
  field errors; `OnboardingFooter` with `continueDisabled` until both are
  valid and `onContinue` = PATCH (a 400 shows on its field and returns
  `false`).
- `steps.ts`: `about_you: { title: "Enter your date of birth", Component: AboutYou }`.
- Settings › Profile (`lib/formFields/profile.tsx`): a
  `date` field for date of birth (a text field with `type: "date"`;
  `TextInput` already passes the type through) and a `select` for gender.
- Phone width: fields full width, 16 px gutters. Semantic tokens only.

## Files

| File | Change |
|---|---|
| `shared/external/db/postgres/migrations/022_user_about_you.{up,down}.sql` | enum, columns, check |
| `shared/external/db/postgres/schemas/user.sql` | same |
| `shared/external/db/postgres/queries/users.query.sql` | `UpdateUser`, `UserAboutYouDone` |
| `shared/pkg/db/` | regenerated |
| `backend/internal/models/user.go` | patch fields |
| `backend/internal/db/postgres/handlers/users/profile.go` | validate, return |
| `backend/internal/onboarding/onboarding.go` | catch-up state and move |
| `backend/internal/db/postgres/handlers/users/{info,onboarding}.go` | pass ctx/user, skip write on catch-up |
| `backend/cmd/server/root.go` | register `about_you` |
| `front-end/src/types/user.ts`, `services/user.ts` | profile fields, update |
| `front-end/src/pages/onboarding/steps/AboutYou.tsx`, `steps.ts` | the step |
| `front-end/src/lib/formFields/profile.tsx`, `models/Forms/Form.ts` | settings fields, server error mapping |
| `CLAUDE.md` | DOB/gender are account data; `about_you` registered; catch-up rule |

## Out of scope

- Age rules (WWW-68) and suggestion ranking by gender (WWW-69).
- Re-showing optional steps to existing users.
- Other steps.

## Acceptance criteria

1. After `migrate-up`, `users` has nullable `date_of_birth` and `gender`;
   `migrate-down` removes them.
2. A new user lands on "About you" (`1 / 1` until more steps exist) right
   after verification; Google users right after sign-in.
3. Continue is disabled until both fields are valid; a future date or one
   before 1900 is refused by the backend too.
4. `POST /users/onboarding {step: about_you, action: next}` before saving
   answers 400 `step_incomplete`; `skip` answers 400 `step_required`.
5. After Continue the user reaches the dashboard as the default persona.
6. `GET /users/profile` returns both; no other endpoint does (persona,
   GraphQL, channel members, notifications unchanged).
7. Settings › Profile shows and saves both; existing users can fill them.
8. An existing user without DOB or gender sees only "About you" (`1 / 1`)
   on next load, then the dashboard; their `onboarding_step` and
   `onboarding_completed` are unchanged. One with both set (e.g. via
   Settings) is not pulled in.
9. `go build ./...` (backend), `pnpm build`, `pnpm lint` pass.

## QA on dev

- Sign up by email: verify → About you → dashboard.
- Sign up with Google: About you → dashboard.
- Try a future date via curl: 400 `invalid_date_of_birth`.
- Existing user: About you only, then the dashboard; reload stays on the
  dashboard. Settings › Profile shows the saved values and can change them.
