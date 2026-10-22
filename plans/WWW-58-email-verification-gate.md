# WWW-58 — Email verification gate with resend and logout

Branch `WWW-58-email-verification-gate`, from `release-caterpie-v1010`.
Second task of epic WWW-56 (onboarding). Backend + frontend.

Figma: Falokah UI › Onboarding › "Verify Your Email".

## Goal

- An email + password user who hasn't verified can only reach `auth/info`,
  `auth/verify`, `auth/verify/resend` and `auth/logout`. Everything else in
  the User and Persona tiers answers 403 `{"error":"email_unverified"}`.
  Today only the frontend checks `is_verified`.
- The verify step can resend a code (with a visible cooldown) and log out,
  so the user is never stuck.
- Google users stay verified from creation, as today.

## Decisions

1. **The gate reads a JWT claim, not the database.** `LoginToken` writes
   `email_verified` from `users.is_verified`, so every request is still
   checked without a query. A token without the claim (issued before this
   change) counts as **unverified**: the gate fails closed.
   This is safe without a per-request lookup because verification only goes
   one way (nothing un-verifies a user) and the token is signed: a stale
   claim can only say "unverified" for a verified user, which `auth/info`
   heals. If un-verifying is ever added (e.g. email change), the gate needs
   a DB lookup.
2. **`auth/info` heals stale tokens.** It already reads `is_verified` from
   Postgres. When that differs from the token's claim it reissues the cookie
   (same `persona_id`). The frontend calls `info` on every load, so old
   sessions of verified users fix themselves on the first page load, and a
   verification done on another device is picked up on the next load.
3. **Google login verifies an existing email account.** If an unverified
   email + password user signs in with Google for the same address, Google
   has proved the address, so the callback sets `is_verified` before issuing
   the token.

## Backend

### Tiers (`backend/internal/auth`)

- Middleware also stores `email_verified` (missing → false).
- New `RequireSession()`: a user, verified or not (401 otherwise). Used only
  for `auth/info`, `auth/verify`, `auth/verify/resend`.
- `RequireUser()`: user (401), then verified (403 `email_unverified`).
- `RequirePersona()`: user (401), verified (403 `email_unverified`), persona
  (403 `persona_required`), in that order, so an unverified user never sees
  persona selection first.
- `ErrEmailUnverified = "email_unverified"`, `EmailUnverified(c)` helper,
  `auth.EmailVerified(c)` accessor.
- Nothing changes per route group except `auth.go`, whose session group
  moves to `RequireSession()`. `/query` and `/control` are Persona tier, so
  they're gated too (the Rust proxy just gets the 403 back).

### Token

- `UserMinimal` gains `EmailVerified bool`; `LoginToken` writes it.
- Callers fill it: `Create` (false), `Login` (from the row), Google (true),
  `set-current-persona` (from the context: only a verified user can reach
  it), `Verify` and `Info` (from the DB).

### Verify — `POST /auth/verify`

- Already verified → 200 `{"verified": true}` (idempotent, reissues the
  token if its claim is stale).
- Wrong code → **400** `{"error":"invalid_code", "attempts_left": n}`;
  no live code (expired, or 5 failed attempts) → 400 `{"error":"code_expired"}`.
  Today it answers 401, which `apiFetch` treats as "logged out" and drops the
  user to the public page.
- Right code → in one transaction: mark the verification row verified
  (`MarkVerificationAsVerified`, today unused) and `VerifyUserEmail`. Then
  reissue the cookie with `email_verified: true`, keeping `persona_id`.
  200 `{"verified": true}`.

### Resend — `POST /auth/verify/resend` (new)

- Already verified → 409 `{"error":"already_verified"}`.
- Cooldown: 60 s since the user's last sent code (any row, so an expired code
  can't be resent in a loop). Inside it → 429
  `{"error":"resend_cooldown","retry_after": seconds}`.
- Otherwise, in one transaction: expire every open code of the user, insert
  a new one with `last_sent_at = now()`. Then send the email. 200
  `{"retry_after": 60}`. If the email fails → 502 `{"error":"email_failed"}`;
  the cooldown still applies (the code exists), so a retry is possible after
  60 s.
- Only one live code per user, so `GetActiveUserVerificationByUserID :one`
  can't pick an old row.

### SQL (`queries/user_verification.sql`, then `make generate-models`)

- `InsertUserVerification`: also sets `last_sent_at = now()` (today it's NULL,
  so the first resend had no cooldown).
- `ExpireOpenUserVerifications(user_id)`: `is_expired = TRUE` on unverified
  open rows.
- `GetVerificationResendWait(user_id)`: seconds left of the cooldown, from
  `max(last_sent_at)`, 0 when none. Replaces `CanResendVerificationCode` and
  the stub `GetNewVerificationCode`.

No migration: every column already exists.

### Sign-up (`users.Create`)

- Handles the `CreateVerificationCode` error (ignored today).
- If the email fails, the account still exists and the cookie is set:
  answer 201 with `"email_sent": false` instead of 500, so the frontend goes
  to the verify step and the user can resend.

### `verification.Service`

Becomes `Create`, `Resend`, `Verify`, returning typed errors
(`ErrInvalidCode{AttemptsLeft}`, `ErrCodeExpired`, `ErrCooldown{RetryAfter}`,
`ErrAlreadyVerified`) that the handlers map to the codes above. It gets the
`*sql.DB` for the transactions (constructor parameter in `root.go`).

## Frontend

- `lib/apiFetch.ts`: on 403 `email_unverified`, set `user.is_verified = false`
  in the store. Same pattern as `persona_required`; no redirect.
  Apollo's `ErrorLink` already calls `handleAuthFailure`, so it follows.
- `DashboardLayout` keeps rendering the verify step when `!user.is_verified`
  (before persona selection), and `useResumeAuthNext` still runs after it, so
  `?next=` survives verification.
- **Verify step** (`pages/verify-email`), following Figma, on the auth-screen
  panel style from WWW-57:
  - "Verify Your Email", "We sent a 6-digit code to **<email>**" (it said
    "link").
  - 6-slot OTP, auto-submits on the 6th digit; Verify button.
  - Errors inline under the OTP: wrong code with attempts left, or "This
    code has expired, request a new one".
  - "Didn't receive an email? **Resend**": disabled with a countdown
    ("Resend in 42s") from `retry_after` (both the 200 and the 429).
  - **Log out** link (`services/auth.logOut`, clears the store).
  - On success: `revalidateUser()`; the layout moves on by itself (no
    `navigate("/")`, no 2 s timer).
- `services/verifyEmail.ts` returns the error code; new
  `services/resendVerification.ts`.
- Removed: `pages/home/unverified.tsx` and its branch in `HomePage` (the
  layout handles it first), and the `/verify-email` route.
- Sign-up with `email_sent: false` shows a note on the verify step that the
  email failed and to press Resend.

## Files

| File | Change |
|---|---|
| `backend/internal/auth/auth.go` | claim, `RequireSession`, gate in `RequireUser`/`RequirePersona` |
| `backend/cmd/server/api/v1/auth.go` | `RequireSession` group, `/verify/resend` |
| `backend/cmd/server/root.go` | pass `*sql.DB` to `verification.NewService` |
| `backend/util/verification/*` | `Create`/`Resend`/`Verify`, typed errors |
| `backend/internal/db/postgres/handlers/users/{verify,create,login,info,persona}.go` | codes above, claim |
| `backend/internal/oauthproviders/google.go` | verify on login, claim |
| `shared/external/db/postgres/queries/user_verification.sql` | queries above |
| `shared/pkg/db/` | regenerated |
| `front-end/src/lib/apiFetch.ts` | `email_unverified` |
| `front-end/src/pages/verify-email/index.tsx` | rebuilt step |
| `front-end/src/services/{verifyEmail,resendVerification}.ts` | |
| `front-end/src/pages/home/*`, `routes/AppRouter.tsx` | remove unverified page and route |
| `CLAUDE.md` | tier table: the email gate and `RequireSession` |

No GraphQL schema change, no `pnpm codegen`.

## Out of scope

- Verification by link (code only).
- A daily cap on resends (the 60 s cooldown and 5 attempts per code stay).
- Changing the email address from the verify step.
- Logout cookie fixes (`MaxAge`/`Domain` as today).

## Acceptance criteria

1. An unverified email user gets 403 `email_unverified` from `users/*`,
   `persona/*`, `channels/*`, `notifications/*`, `/query` and `/control`;
   `auth/info`, `auth/verify`, `auth/verify/resend`, `auth/logout` work.
2. Wrong code → 400 with attempts left, and the user stays signed in; after
   5 wrong codes → `code_expired`.
3. Resend sends a new code, the old one stops working, and a second resend
   within 60 s → 429 with `retry_after`; the UI shows the countdown.
4. Right code → verified, the cookie carries the claim, and the app
   continues to persona selection / dashboard (and to `?next=`) without a
   reload.
5. Log out from the verify step returns to the public page.
6. Google users and already-verified email users never see the step; a
   verified user with a pre-change token is healed by `auth/info` on load.
7. An unverified email user who logs in with Google is verified.
8. `go build ./...` (backend), `pnpm build`, `pnpm lint` pass.

## QA on dev

- Sign up with a new email, try `curl` on `/api/v1/channels` with the cookie
  → 403 `email_unverified`.
- Enter a wrong code, then resend twice quickly, then the right code.
- Log out from the verify step.
- Log in with an existing verified account (old cookie) → no verify step.
