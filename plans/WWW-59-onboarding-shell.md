# WWW-59 — Onboarding flow shell, progress and step state

Branch `WWW-59-onboarding-shell`, from `release-caterpie-v1010`.
Third task of epic WWW-56 (onboarding). Backend + frontend.

Figma: Falokah UI › Onboarding (`2246:370`), the "interests" frames: logo top
left, gradient progress bar with "n / N" under it, title, step body, and a
footer with the step's own note on the left and **Continue** on the right
(plus "Back" and "Skip now" in some frames).

## Goal

- One frame every onboarding step plugs into: logo, progress, step body,
  Back / Skip / Next.
- The server owns the state (`users.onboarding_step`,
  `users.onboarding_completed`, migration 008) and validates every move:
  required steps (about you, default persona, interests) can't be skipped;
  communities, channels and personas can.
- Existing users are backfilled as completed, so only new sign-ups see it.
- Until onboarding is complete the app renders the current step instead of
  the dashboard. No redirects.
- This ticket ships **no steps**. Each step ticket (WWW-60, 62, 63, 70, 72, 71)
  adds its step on both sides; until then a new user goes straight through.

## Decisions

1. **Steps are a registry, on the server.** `backend/internal/onboarding`
   holds an ordered list:

   | id | key | skippable |
   |---|---|---|
   | 1 | `about_you` | no |
   | 2 | `default_persona` | no |
   | 3 | `interests` | no |
   | 4 | `communities` | yes |
   | 5 | `channels` | yes |
   | 6 | `personas` | yes |

   Each entry is `Step{ID, Key, Skippable, Done}`; `Done(ctx, userID)` says
   whether the step's required data is saved (e.g. DOB and gender set). The
   list in this ticket is **empty**; a step ticket appends its entry. Ids are
   fixed and increase in flow order, so a later step can be added without
   moving existing users.
2. **`onboarding_step` = id of the last step passed** (0 = none). The current
   step is the first registered step with a larger id. Passing the last one
   sets `onboarding_completed`.
3. **Completed is derived on read**: `onboarding_completed OR no step left`.
   With no steps registered, everyone is complete, so this ticket changes
   nothing for users. A user who signed up before a step was registered would
   be pulled into it; the steps ship in the same release, so that's fine.
4. **Verify is not an onboarding step** in the counter. It stays the
   `email_verified` gate from WWW-58 (backend-enforced, email users only), and
   it renders before the shell. `n / N` counts registered steps only, so
   Google and email users see the same numbers.
5. **Steps save their own data** through their own endpoints. The advance
   endpoint only moves the pointer, after checking `Done`. Back doesn't undo
   anything; the earlier step shows its saved data.
6. **Onboarding runs as the default persona.** When the shell renders and no
   persona is current, it calls `set-current-persona` with the default
   persona (`is_default` from `/persona/list`), because the persona steps use
   Persona-tier endpoints. After onboarding the user lands on the dashboard
   as that persona, not on persona selection.
7. **No backend gate on onboarding.** Unlike verification, an incomplete
   onboarding doesn't 403 other routes; it's a UI flow. (Age checks come from
   DOB in WWW-68, not from this flag.)

## Backend

### Migration `021_onboarding_state`

- Backfill: `UPDATE users SET onboarding_completed = TRUE` for every existing
  row.
- `onboarding_completed` and `onboarding_step` become `NOT NULL` (defaults
  `false`, `0` stay), so sqlc gives `bool` / `int32` instead of `Null*`.
- Down: drop the `NOT NULL`s (the backfill isn't reverted).
- Update `schemas/user.sql` to match.

### SQL (`queries/users.query.sql`, then `make generate-models`)

- `GetUserBasicInfo` also returns `onboarding_step`, `onboarding_completed`.
- `AdvanceOnboarding(user_id, from_step, to_step, completed)`:
  `UPDATE … WHERE id = $1 AND onboarding_step = $2` (compare-and-set, so two
  tabs or a double click can't move twice) `RETURNING` both columns.
- `UpdateUser` drops `onboarding_completed` / `onboarding_step`.
  **Bug fix:** `PATCH /users/profile` today writes them from the request body,
  so every profile save resets onboarding to step 0, not completed.
  `models.PatchUserRequest` loses both fields; `GetProfile` stops returning
  them (the state comes from `auth/info`).

### State — on `GET /auth/info`

`info` adds an `onboarding` object, so the app gets it on every load without
another request:

```json
"onboarding": {
  "completed": false,
  "current": "about_you",
  "steps": [{"key": "about_you", "skippable": false}, ...]
}
```

`current` is null when completed. `steps` is the registered list, which
drives `n / N`.

### Move — `POST /api/v1/users/onboarding` (User tier)

Body `{"step": "<key>", "action": "next" | "skip" | "back"}`. `step` must be
the current step.

- `next`: the step's `Done` must be true, else 400 `{"error":"step_incomplete"}`.
- `skip`: only a skippable step, else 400 `{"error":"step_required"}`.
- `back`: to the previous registered step; 400 `{"error":"no_previous_step"}`
  on the first.
- Already completed → 409 `{"error":"onboarding_completed"}`.
- `step` isn't the current one, or the compare-and-set updates no row →
  409 `{"error":"step_mismatch"}`.
- Every answer, errors included (except 401/403), carries the fresh
  `onboarding` object, so the client just replaces its copy.

`next`/`skip` past the last step sets `onboarding_completed = TRUE`.
`handlers/users/onboarding.go` (on `users.Handler`), registry in
`backend/internal/onboarding`; `Done` funcs get what they need through the
registry's constructor in `root.go`, no globals.

## Frontend

- `types/auth.ts`: `Info.onboarding`. `services/onboarding.ts`:
  `moveOnboarding(step, action)` returning the new state, which it writes to
  the user store.
- `DashboardLayout` order: loader → verify (`!is_verified`) → **onboarding**
  (`!onboarding.completed`) → persona selection → dashboard.
  `useResumeAuthNext` keeps running, so `?next=` is resumed once the
  dashboard renders.
- `pages/onboarding/`:
  - `OnboardingShell`: full-page frame (no sidebar): logo, `ToggleTheme`,
    progress, the current step's component. Selects the default persona
    first (decision 6) and shows the loader meanwhile.
  - `OnboardingProgress`: bar with the sea gradient (`--gradient-*` tokens),
    filled to `n / N`, and the "n / N" label. `N` = every registered step
    (6 once all exist), `n` = 1-based index of the current step, so a
    skipped step counts as passed, like a completed one.
  - `OnboardingFooter`: what each step renders at the bottom: a left slot
    (e.g. "0 communities selected"), **Back** (hidden on the first step),
    **Skip now** (only when skippable), and **Continue** with the step's own
    disabled/busy state. Continue runs the step's save, then `next`.
  - `steps.ts`: registry `key → { title, Component }`. Empty in this ticket.
    A step the server sends but the frontend doesn't have shows "This step
    isn't available yet" with the footer, so the user is never stuck (it
    only happens if the backend deploys a step first). Steps the server
    doesn't send aren't rendered.
  - A 409 answer just replaces the state (another tab moved on).
- `/dev/onboarding` (dev builds only, like `/dev/themes`): the shell with two
  dummy steps and a local fake state, to check layout, progress and the
  footer before real steps exist.
- Phone width: one column, 16 px gutters, footer buttons stay on one row.
  Colours from semantic tokens only.

## Files

| File | Change |
|---|---|
| `shared/external/db/postgres/migrations/021_onboarding_state.{up,down}.sql` | backfill, NOT NULL |
| `shared/external/db/postgres/schemas/user.sql` | NOT NULL |
| `shared/external/db/postgres/queries/users.query.sql` | `GetUserBasicInfo`, `AdvanceOnboarding`, `UpdateUser` |
| `shared/pkg/db/` | regenerated |
| `backend/internal/onboarding/` | step registry, state, move rules |
| `backend/internal/db/postgres/handlers/users/{info,onboarding,profile}.go` | state on info, move endpoint, profile fix |
| `backend/internal/models/user.go` | drop onboarding fields from the patch |
| `backend/cmd/server/api/v1/users.go`, `backend/cmd/server/root.go` | route, wiring |
| `front-end/src/types/auth.ts`, `services/onboarding.ts` | state, move |
| `front-end/src/layouts/dashboard.tsx` | onboarding branch |
| `front-end/src/pages/onboarding/*` | shell, progress, footer, registry |
| `front-end/src/routes/AppRouter.tsx`, `pages/dev-onboarding/` | dev preview |
| `CLAUDE.md` | onboarding state and "a new step needs" checklist |

No GraphQL change, no `pnpm codegen`.

## Out of scope

- Any step's content (WWW-60, 62, 63, 70, 72, 71).
- Inserting a step between existing ids later (would need renumbering).
- A backend gate on incomplete onboarding.
- Re-running onboarding for existing users.

## Acceptance criteria

1. After `migrate-up`, every existing user has `onboarding_completed = true`;
   both columns are NOT NULL.
2. `auth/info` returns `onboarding`; with no steps registered it's
   `{completed: true, current: null, steps: []}` for new and old users.
3. Saving the profile (`PATCH /users/profile`) no longer touches onboarding.
4. `POST /users/onboarding` rules hold (checked in WWW-60 with the first real
   step; with no steps it answers 409 `onboarding_completed`).
5. A new sign-up goes verify → dashboard as today.
6. `/dev/onboarding` shows the frame matching Figma at desktop and phone
   width, in light and dark, with Back / Skip / Continue behaving per step.
7. `go build ./...` (backend), `pnpm build`, `pnpm lint` pass.

## QA on dev

- Log in as an existing user: dashboard as before.
- Sign up a new user: verify, then dashboard.
- Edit the profile, then `curl auth/info`: onboarding unchanged.
- `/dev/onboarding` locally (`pnpm dev`).
