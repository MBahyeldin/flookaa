# WWW-57 — Welcome screen with email/password and external providers

Branch `WWW-57-welcome-auth-screen`, from `release-caterpie-v1010`. First
task of epic WWW-56 (onboarding). Frontend only.

Figma: Falokah UI › Onboarding › "auth screen" (`2217:279`). It shows the
title "Welcome To Flookaa", three pill provider buttons on the scenery
background and only the logo in the header. It has no email form; this plan
adds one in the same style.

## Goal

- Login and sign-up share one welcome screen. Google and the email +
  password form are both visible; neither is behind the other.
- Only working providers are rendered. GitHub and LinkedIn, now shown
  disabled, are removed (they come back when they're built).
- `?next=` keeps working for email login, and starts working for Google
  login (today the callback always lands on `/` and drops it).

## Routes

`/login` and `/sign-up` stay (the follow link and the header use them).
Both render one `AuthScreen` with `mode: "login" | "signup"`. The switch
("New to Flookaa? Create an account" / "Already have an account? Log in")
is a link to the other route that carries `?next=` along.

## Layout (`pages/auth/AuthScreen.tsx`)

Top to bottom, centred, max width ~ 24rem:

1. **Title** "Welcome To Flookaa", and a one-line subtitle per mode
   ("Log in to continue" / "Create your account").
2. **Providers** (`components/oauth-providers`): "Continue with Google" as a
   full-width pill, as in Figma. The component keeps a list of providers so
   adding one later is one entry; only Google is in it.
3. **Divider** "or".
4. **Email form**, the existing `FormComponent` + `Form.login` /
   `Form.signup`, full-width pill submit. Server errors show under the form
   as today ("Invalid email or password", "please use OAuth login").
5. **Mode switch** link.

- Background: the existing `welcome-bg-bottom` scenery (`/welcon-bg.jpg`),
  anchored to the bottom as now.
- Everything, title included, sits on a translucent panel
  (`bg-background/80`, backdrop blur, rounded) so it stays readable over the
  light image in dark mode too.
  Colours from semantic tokens only.
- Header: `DefaultLayout` renders `Header onlyLogo` on `/login` and
  `/sign-up` (the theme toggle stays), matching Figma.
- Phone width: one column, 16px gutters, no horizontal scroll.

## Form changes

- **Sign-up** keeps first name, last name, email, password, confirm
  password, and drops the optional **profile picture** field: the avatar is
  set on the default persona in the default persona step (WWW-62), and the field made the form
  too long for this screen. The backend already treats `thumbnail` as
  optional.
- Fields full width on the auth screen (first/last name stay side by side
  from `sm` up).
- Login is unchanged (email, password).

## `?next=`

- `safeNext` moves from `pages/login` to `lib/safeNext.ts`, unchanged
  (same-site paths only).
- Email login: as today, navigate to `next` on success.
- **Google**: `continueWithGoogle(state, next)` stores `next` in
  `sessionStorage` (`auth_next`) before leaving for Google. After the
  callback redirects to `/`, a small hook in `DashboardLayout`
  (`useResumeAuthNext`) reads it once, clears it, re-checks it with
  `safeNext`, and navigates there. Storage access is wrapped in try/catch;
  without it the user just lands on `/`.
- Sign-up (email) still goes to `/`, where the unverified page takes over;
  WWW-58 replaces that with the verify step.

## Files

| File | Change |
|---|---|
| `front-end/src/pages/auth/AuthScreen.tsx` | new, the shared screen |
| `front-end/src/pages/login/index.tsx`, `pages/sign-up/index.tsx` | render `AuthScreen` with their mode |
| `front-end/src/components/oauth-providers/index.tsx` | provider list (Google only), no divider inside, pill style |
| `front-end/src/services/loginWithGoogle.ts` | take `next`, store it |
| `front-end/src/hooks/useResumeAuthNext.ts` | new |
| `front-end/src/layouts/dashboard.tsx` | call the hook |
| `front-end/src/layouts/default.tsx` | `onlyLogo` on auth routes |
| `front-end/src/lib/safeNext.ts` | new, moved from the login page |
| `front-end/src/lib/formFields/signup.ts` | drop `thumbnail`, widths |

No backend, schema, or codegen change.

## Out of scope

- The visitor home page (Figma "welcoming screen") — unchanged.
- Verify-email step, resend, logout (WWW-58).
- LinkedIn / GitHub login.
- Passing `next` through the Google OAuth `state` server-side.

## Acceptance criteria

1. `/login` and `/sign-up` show the welcome screen with Google and the email
   form both visible, and no GitHub/LinkedIn buttons.
2. Email login with valid credentials goes to `next` (or `/`); invalid
   credentials show the server error.
3. Email sign-up creates the account and lands on the unverified page.
4. Google login/sign-up from `/login?next=/follow/<token>` returns to
   `/follow/<token>`. A `next` of `//evil.com` or `https://…` goes to `/`.
5. The mode switch keeps `?next=`.
6. Readable in light and dark mode, and at phone width without horizontal
   scroll.
7. `pnpm build` and `pnpm lint` pass.

## QA on dev

- Log out, open a private persona's follow link, click "Log in to request
  to follow", log in with Google → back on the link page.
- Same with email login.
- Sign up with a new email → unverified page, verification email received.
- Toggle dark mode and a narrow viewport on both routes.
