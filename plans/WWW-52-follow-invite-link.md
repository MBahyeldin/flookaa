# WWW-52 — Shareable follow-request link for private personas

Branch `WWW-52-follow-invite-link`, from `release-caterpie-v1010`. Epic
WWW-12 (persona privacy and following). It builds on WWW-50 (the locked
page) and WWW-34 (the Requests tab).

## Goal

A private persona can share a link, for example in a bio elsewhere or in a
chat. Anyone who opens it sees a locked page and can request to follow. The
link never contains the persona id, and nobody learns the id from it until
they can already see the persona.

- The owner copies the link from its own profile, and can reset it.
- Using the link files a normal **pending** request, which the owner
  approves or rejects in the Requests tab. A leaked link only produces
  requests.
- There is one live link per persona, valid until it's reset. A reset or
  unknown token is 404.

## Data: migration `017_persona_invite_token`

```sql
ALTER TABLE personas ADD COLUMN invite_token TEXT;
CREATE UNIQUE INDEX personas_invite_token_key ON personas (invite_token) WHERE invite_token IS NOT NULL;
ALTER TABLE personas
    ADD CONSTRAINT personas_invite_token_private CHECK (invite_token IS NULL OR privacy = 'private');
```

The down migration drops the constraint, the index and the column.

- **The token** is 32 random bytes (`crypto/rand`), base64url, so 43
  characters. It's generated in Go, not in SQL.
- **It's stored in plain text, not hashed**, because the owner has to be able
  to copy it again. The token only grants the right to file a request, so a
  leaked database row exposes nothing a leaked link doesn't.
- **A privacy change away from private clears it** in the same update
  (`invite_token = CASE WHEN privacy = 'private' THEN invite_token END`, in
  `UpdatePersonaByIdAndUserId`), the same way `show_on_profile` is handled.
  A persona that goes public and then private again gets a new link.
- Like `show_on_profile`, it's account data: never in any response about
  another persona, and not in `/persona/list`. Only the endpoints below
  return it.

## API

All endpoints are Persona tier.

**Owner** (in `followers.Handler`; `:persona_id` must be the acting persona,
or 403 `not_your_persona`, as in WWW-34):

| Endpoint | Result |
|---|---|
| `POST /persona/:persona_id/invite-link` | 200 `{"token": "..."}`. It returns the current token, or creates one. It's idempotent. |
| `POST /persona/:persona_id/invite-link/reset` | 200 `{"token": "..."}`, always a new token. The old one is 404 from then on. |

Both answer 400 `{"error":"invite_link_requires_private"}` for a public or
`only_me` persona. The frontend shows the button only for private personas.
Both are POST because the first one may write.

**Visitor** (static segment `invite`, which coexists with `/:persona_id` the
way `/list` does):

| Endpoint | Result |
|---|---|
| `GET /persona/invite/:token` | 404 for an unknown or reset token. If the viewer **sees** the persona (itself, a sibling, an approved follower): 200 `{"visible": true, "persona_id": <id>}`, and the page redirects to the profile. Otherwise: 200 `{"visible": false, "follow_status": null \| "pending"}`. |
| `POST /persona/invite/:token/request` | It files the request through the same code as `Follow`: 202 `{"status":"pending"}`, or 200 `active` if the persona already sees you as an approved follower. 404 for a bad token. 400 `cannot follow yourself`. |

- The visible answer only reveals the id to someone who can already see the
  persona, so `ResolvePersonasForViewer` stays the single rule.
- `Follow` is split into `follow(c, followerID, personaID)` so that the
  token endpoint and `/:persona_id/follow` share the target checks, the
  rejected-stays-pending rule and the NATS publishes. A rejected requester
  who uses the link still reads "Requested", as everywhere else.
- **Cancelling a request isn't offered on the invite page**, since it would
  need the id or another token endpoint. The page shows "Requested" with no
  action. Cancelling stays possible once the persona is visible, or never if
  it's rejected, which is the same as today.
- New queries: `GetPersonaByInviteToken` (id, privacy, the viewer's follow
  status), `EnsurePersonaInviteToken` (`SET invite_token = COALESCE(invite_token, $2)
  WHERE id = $1 AND privacy = 'private' RETURNING invite_token`), and
  `ResetPersonaInviteToken`. Then `make generate-models`.

## Frontend

- **Route** `/follow/:token`: `pages/(dashboard)/follow/[token]/index.tsx`.
  - Loading, then `GET /persona/invite/:token`.
  - On 404 it shows "This link is no longer valid".
  - On `visible: true` it calls `navigate(personaPath(id), { replace: true })`.
  - Otherwise it shows the locked card.
- **The locked card** is extracted from the profile page into
  `components/locked-persona-card`, so the profile page and the invite page
  render the same thing. Its action is passed in. The profile page passes
  the `FollowButton` it has today. The invite page passes a
  "Request to follow" button that calls the token endpoint, with the same
  reveal confirm ("Follow this persona? It will see who you are."), and
  then shows a disabled "Requested".
- **Live:** like the locked profile, the invite page listens to the viewer's
  own `follow_counts` and refetches. An approval returns `visible`, and the
  page redirects to the profile.
- **Owner UI:** the own profile page of a private persona gets a "Share link"
  button next to the counts. It opens a small dialog with:
  - the full URL, read-only,
  - "Copy" (`navigator.clipboard`, with a toast),
  - "Reset link", which asks for confirmation: "The old link will stop
    working."

  The dialog calls `POST …/invite-link` when it opens. The button isn't
  rendered for a public or `only_me` persona.
- **Logged out:** the app renders the public layout on every route, so
  `/follow/:token` gets a 401. The page then shows "Log in to request to
  follow" with a link to `/login?next=/follow/<token>`. See the decision
  below.

## Decision for you: return to the link after login

Today `login` always goes to `/` after logging in. Without a return path, a
logged-out visitor loses the link after logging in.

- **Recommended:** add `?next=` to the login page in this ticket. It only
  accepts a relative path that starts with a single `/`, otherwise it falls
  back to `/`, so it can't become an open redirect. That's about five lines.
  Signup and Google OAuth stay as they are; a visitor who signs up opens the
  link again.
- **Alternative:** leave it out, and the visitor reopens the link after
  logging in.

A visitor with no persona chosen gets the persona selection in place (403
`persona_required`, as everywhere), and the URL stays, so nothing extra is
needed for that case.

## Out of scope

- Several links per persona, expiring links and usage counts.
- Links for public personas, which can be followed directly.
- Direct invitations to a specific persona (WWW-35).

## Steps

1. The migration, the queries, `make generate-models`, and clearing the token
   in `UpdatePersonaByIdAndUserId`.
2. Backend: the `follow` split, the owner endpoints and the visitor
   endpoints.
3. Frontend: the extracted locked card, the `/follow/:token` page and its
   live refetch, and the share dialog on the own profile.
4. Frontend: login `?next=` (if approved).
5. CLAUDE.md: a bullet under "Persona access".

## Checks

- `go build ./...` in `backend/`. `pnpm lint` and `pnpm build` in
  `front-end/`. There are no tests in the repo.
- Apply migration 017 on dev before deploying the backend.
- Manual, on dev, with P (private) and A (public, not following P):
  1. P opens its profile, clicks "Share link" and copies it. The URL has no
     persona id.
  2. A opens the link and sees the locked page. The network response has no
     id. A requests, and the page reads "Requested". P's Requests tab shows
     A live.
  3. P approves, and A's open link page redirects to P's profile.
  4. P resets the link. The old URL shows "no longer valid", and the new one
     works.
  5. P switches to public: the link stops working, and the button is gone.
     Back to private, it gets a new link.
  6. A persona that P rejected opens the new link and sees "Requested",
     unchanged.
  7. Logged out, opening the link and logging in lands back on the link
     (with `next`).
  8. Another persona's `POST /persona/<P>/invite-link` answers 403.
