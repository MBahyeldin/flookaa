# WWW-115 — Auth split layout, strong passwords, password reset

Epic WWW-86. Same routes (`/login`, `/sign-up`, and the verify step `DashboardLayout` renders on any route), new layout, existing form, `useForm`, `OAuthProviders` and verify logic. Added at the user's request (2026-10-25): a stronger password policy with a live checklist, and password reset for accounts that have a password.

Design: "Flookaa v2", Log in `25:157` / `25:391` / `25:610`, Sign up `25:199` / `25:433` / `25:643`, plus WWW-118's states: Log in error `66:1119`, loading `66:1165`, from a follow link `66:1221`, mobile error `66:1239`; Sign up error `66:1276`, loading `66:1327`, mobile error `66:1378`; Verify email `66:1420` / `66:1480` / `66:1540`, wrong code `66:1591`, expired `66:1651`. Pulled read-only on 2026-10-25. Forgot and reset password have no frames: same split, same form column.

## Decisions (2026-10-25)

- Sign up: **First name and Last name side by side**, no Confirm password; every password field gets a show/hide toggle.
- Left panel: **a product line, no attribution**: "Follow a facet, not a person." over "One account, as many personas as you like."
- Password policy: **at least 8 characters with an uppercase letter, a lowercase letter, a digit and a special character**, enforced by the backend; the form shows each rule passing or failing as you type.
- **Password reset** for users who have a password (not Google-only accounts).

Approved 2026-10-25, with two more folded in and done **first**: the profile `hashed_password` hole (section 2) and **email changes only through verification** (section 0). Migrations: 038 `email_changes`, 039 `password_resets`.

## 0. Email change needs verification (done first)

Today `PATCH /users/profile` writes any `email_address` straight to the account, no code, no password. Reset links (section 3) go to that address, so that would let a stolen session take the account.

- `PATCH /users/profile`: an `email_address` different from the stored one is 400 `email_change_requires_verification`; the same one (the form sends it back) is fine. The update always passes the stored address.
- **Migration 038** `email_changes`: `id`, `user_id` (FK, cascade), `new_email`, `code`, `failed_attempts`, `max_attempts` (5), `created_at`, `last_sent_at`, `expires_at` (1 hour), `confirmed_at`, `is_expired`. Like `user_verifications`, one live code per user.
- `email_change.Service` (`backend/util/emailchange`, same shape as `verification`), User tier routes under `/users/email`:
  - `POST /users/email/change {email_address}`: 400 `invalid_email`, 400 `same_email`, 400 `email_managed_by_google` (an account without a password logs in by its Google address, so changing it would split the account), 409 `email_taken` (another live user has it, compared case-insensitively), 429 `resend_cooldown` + `retry_after` (60 s per user). Otherwise expires the user's open codes, stores a new 6-digit code for the new address, emails it **to the new address**, answers 202 `{retry_after}` (502 `email_failed` if sending fails). Resend = the same call again.
  - `POST /users/email/confirm {code}`: 400 `invalid_code` + `attempts_left`, 400 `code_expired` (none live, 5 wrong tries, or past the hour), 409 `email_taken` (taken meanwhile). On success, in one transaction: locks the user, sets `email_address`, marks the code confirmed, expires the rest. Reissues the JWT (its `email_address` claim, same persona). Emails the **old** address: "Your Flookaa email was changed to {new}. If this wasn't you, contact us." Answers 200 `{email_address}`.
  - `POST /users/email/change/cancel`: expires the open code.
- The old address keeps working for login until the code is confirmed.
- **Frontend** (`settings/profile`): the email leaves the profile form and becomes an "Email" row with the address and a "Change" button, opening `ChangeEmailDialog`: new address → "Send code" → the 6 `InputOTP` slots with Resend countdown and the error texts → done (toast, profile and `auth/info` refetched). Cancel in the code step calls `cancel`. Google-only accounts see the row without the button, with "Managed by your Google account". `GET /users/profile` adds `has_password`.

## 1. Split layout

- **`pages/auth/AuthSplit.tsx`** (new): `grid md:grid-cols-2 min-h-dvh`. Left, `hidden md:flex`, `bg-secondary`: `Brand`, `Cover pattern="hills"` in a `rounded-lg` card (Figma's illustration is that pattern), the product line in `text-lead`, its second line muted `text-sm`. Right, `bg-background`: the form column (`max-w-sm`), vertically centred, with `Brand` above it below `md`; the `ToggleTheme` icon button (kept since WWW-114) top-right.
- **`AuthScreen`** inside `AuthSplit`: `h1` + muted lead per mode ("Welcome back" / "Log in to pick up where your personas left off."; "Create your account" / "One account, as many personas as you like."), the follow-link variant when `next` starts with `/follow/` ("Log in to continue" / "You opened a follow link. Log in and we'll bring you back to it."). Primary submit, then outline "Continue with Google" (no "or" divider), then the `text-primary` link line. Login adds a "Forgot password?" link above the sign-up link (under the buttons, simpler than inside the field's label row). Redirects, `next` and the sessionStorage keys are untouched.
- **`components/form`**: `children` may be a function of `isSubmitting`, so the submit is `<Button loading>`. Other forms keep passing nodes.
- **Login error on the fields**: `Form.login.serverErrors` maps `"Invalid email or password"` to the password field ("Wrong email or password."), and the email field is outlined too (`ServerFieldError` gains an optional `also: string[]` of fields marked invalid without a message). The Google-only message stays under the form.
- **Labels** "Email" / "Password" as in Figma. **`OAuthProviders`** becomes `variant="outline"`.
- **`pages/verify-email`** inside `AuthSplit`: "Check your email", "We sent a 6-digit code to {email}. Enter it to finish signing up.", `InputOTP`, helper "Paste works too. The code is valid for 24 hours." (matches `user_verifications.expires_at`), primary Verify, `text-primary` Resend line, muted "Wrong email? Log out". Errors in `destructive` under the slots, slots outlined. Logic unchanged; its icon circle and `Header` go.
- **`layouts/default`**: no `Header` on the auth routes (`/login`, `/sign-up`, `/forgot-password`, `/reset-password`); no footer there either.
- `.welcome-bg-bottom` and its image are removed if nothing else uses them.

## 2. Password policy

- **Backend** `backend/internal/password` (new): `Check(pw) []string` returns the failing rule ids, in order: `length` (≥ 8 characters), `max` (≤ 72 bytes: bcrypt ignores the rest), `upper`, `lower`, `digit`, `special` (any character that isn't a letter, digit or space). Letter case uses `unicode.IsUpper`/`IsLower`.
- `POST /auth/register` runs it after binding (the `min=6` tag goes): 400 `{"error": "weak_password", "failed": [...]}`. Reset uses the same check.
- Login never checks strength: existing weaker passwords keep working, nobody is forced to change.
- **Closing a hole on the way**: `PATCH /users/profile` accepts `hashed_password` and writes it to the column **as given** (no hashing), so a client could set a plain-text or arbitrary hash and skip any policy. The frontend never sends it. The field leaves `PatchUserRequest` and the update always passes NULL there (the query's `COALESCE` keeps the stored hash). Changing a password while logged in belongs to account settings (WWW-103).
- The seeder's `ADMIN_PASSWORD` is not checked (operator-set).
- **Frontend** `lib/password.ts`: the same rules, with labels ("8 or more characters", "An uppercase letter", "A lowercase letter", "A number", "A special character"; the 72-byte rule only appears once broken). `components/password-checklist`: one row per rule under the field. Before typing, every row is muted with a circle. Once typing starts, passing rows show a `success` check and failing rows a `destructive` cross, each with an `sr-only` "met"/"not met". The field's validation is the same function, so Create account stays blocked until every rule passes. `weak_password` from the server maps to the password field.
- **Show/hide**: `TextInput` gets an eye toggle for `type="password"` fields (`aria-label` "Show password" / "Hide password", `aria-pressed`): login, sign up, reset.

## 3. Password reset

**Who**: a user with a non-empty `hashed_password`. Google-only accounts never get a reset email. A password user who also logs in with Google can reset.

**Migration 038** `password_resets`: `id`, `user_id` (FK users, cascade), `token_hash bytea UNIQUE NOT NULL` (SHA-256 of the token; the token itself is never stored), `created_at`, `expires_at NOT NULL` (1 hour), `used_at`. Index on `user_id`. Down drops it.

**Endpoints** (public, in the auth group):

- `POST /api/v1/auth/password/forgot {email_address}` → **always 202 `{}`**, whether or not the address exists, has a password or is in cooldown, so the endpoint can't tell anyone which emails have accounts. Behind it: when the user exists, has a password and their newest reset is older than 60 s, all their open tokens are marked used, a new 32-byte random token (base64url) is stored hashed, and the email is sent **in a goroutine** so response time doesn't reveal it either. Errors are logged, never returned.
- `POST /api/v1/auth/password/reset/check {token}` → 200, or 400 `invalid_token` (unknown, used or expired: one code). Lets the page say "link expired" before you type.
- `POST /api/v1/auth/password/reset {token, password}` → 400 `invalid_token`, 400 `weak_password` with `failed`; otherwise, in one transaction, it locks the token row (`FOR UPDATE`, so a double submit uses it once), sets the new bcrypt hash, marks this and every other open token of the user used, and answers 200. It doesn't log in; the page sends you to `/login` with "Password changed. Log in with your new password."
- The token travels in the request body, never in a path, so it stays out of access logs.

**Email**: `email.Sender` gets a private `send(to, subject, html)`; `SendVerification(to, code)` (the current `SendEmail`, renamed at its callers) and `SendPasswordReset(to, link)` with its own template ("Reset your Flookaa password", one button, "valid for 1 hour", "If you didn't ask for this, ignore this email"). The link is `APP_BASE_URL + "/reset-password?token=" + token`.

**`APP_BASE_URL`** (new, required, e.g. `https://flookaa.com`): read by `backend/internal/config`, added to `templates/app/app.service.j2` and the app inventory/vault vars, and to the env list in `CLAUDE.md`. It must come from config, never from the request's `Host`/`Origin`, or a forged header could put an attacker's domain in the link.

**Pages** (public, inside `AuthSplit`, logged-in users redirected like `/login`):

- `/forgot-password`: "Reset your password" / "Enter your account's email and we'll send you a link.", Email, primary "Send link", "Back to log in". After submit: "Check your email" with "If an account with a password uses {email}, a link is on its way. It works for 1 hour." and "Didn't get it? Send again" (60 s countdown in the page). It also says that Google accounts log in with Google.
- `/reset-password?token=`: on load it moves the token into state and strips it from the URL (`history.replaceState`), then calls `check`. A bad link shows "This link has expired or was already used" with "Send a new link" → `/forgot-password`. A good one shows "Choose a new password", the password field with the checklist and show/hide, primary "Change password".
- The login page reads `?reset=1` to show the success notice above the form.

**Not in this ticket** (noted, say if any should be):

- Existing sessions stay valid after a reset until their JWT expires (72 h): JWTs are stateless. Revoking them needs a `password_changed_at` check per request.
- No per-IP rate limit on `forgot` (only per user); nothing in the backend rate-limits by IP today.

## Done (2026-10-25)

Implemented as above. Also: register's duplicate email is 409 `email_taken` (it was a 500 with the raw Postgres error), and the checklist turns red after a submit with an empty password. The email sender has one method per message. Checked: `go build`/`go vet`, `pnpm build`, lint on touched files; headless Chromium at 1440/834/390, light and dark, on `/login`, `/login?next=/follow/x`, `/sign-up` (typing, empty submit), `/forgot-password`, `/reset-password?token=bad` (shows the "couldn't check" state until the backend is deployed). Not checked: anything that needs the new backend (email change, forgot/reset end to end, verify step).

## Out of scope

- Changing the password while logged in (WWW-103). Select persona and onboarding (WWW-116, WWW-117). RTL and Arabic copy (WWW-89..91).
- Geo selects: the ticket mentions them, but sign-up has none.

## Order

1. Backend: `password` package, register check, profile hole, migration 038 + queries, `make migrate-up` + `make generate-models` (local codegen Postgres), reset handlers, email, config.
2. Frontend: `AuthSplit`, auth/verify restyle, checklist + show/hide, forgot/reset pages.
3. Ansible: `APP_BASE_URL` in the app service template and vars. The backend must be deployed (with migration 038 and the var set) before the frontend.

## Check

`go build ./...` and `go vet` for backend; `pnpm build`, `pnpm lint`. Playwright in a cookie-free context at 1440 / 834 / 390, light and dark: `/login`, `/login?next=/follow/x`, `/sign-up` (checklist states, show/hide, empty-field errors), `/forgot-password`, `/reset-password?token=bad`. Against production only read-only: no sign-ups, and the forgot form only with an address you give me. The end-to-end reset (email arrives, link works, old password stops working, a used link is refused) and the verify step need you, or the dev API once it's reachable.
