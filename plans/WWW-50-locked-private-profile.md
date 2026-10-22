# WWW-50 — Locked profile page for private personas

Branch `WWW-50-locked-private-profile`, from `release-caterpie-v1010`. Epic
WWW-12 (persona privacy and following). It builds on WWW-19 (the profile
page), WWW-20 (the follow API) and WWW-34 (approving requests).

## Goal

Today a private persona you can't see answers 404 on `/personas/:id`, so
nobody has a way to request to follow it. After this ticket the page shows a
**locked** view instead:

- A lock icon, "This persona is private", and a "Request to follow" button.
- No name, avatar, bio, slug or counts.
- After the request is sent, the button reads "Requested". Clicking it again
  cancels the request, as it does today.
- When the persona approves, the page turns into the full profile live.

`only_me`, deleted and missing personas stay 404.

## API: `GET /persona/:persona_id`

`ReadPersona` already gets `privacy` from `ResolvePersonasForViewer`. One
branch is added:

| Case | Response |
|---|---|
| visible | 200, unchanged |
| not visible, `privacy = 'private'` | 200 `{"id": <id>, "locked": true, "follow_status": null \| "pending"}` |
| not visible, `only_me` | 404 `persona not found`, unchanged |
| deleted or missing | 404, unchanged |

- **Why 200 and not 403.** The locked view is a normal page state, not an
  error. A 403 would also go through `apiFetch` and the Apollo `ErrorLink`,
  which treat 403 as an auth signal.
- **What it leaks.** It shows that the id exists and is private, which is the
  point of the ticket. The id is already in the URL, and ids are real
  everywhere. Nothing else about the persona is sent: no counts, and no
  `requires_approval`, since `locked` already implies it.
- **`follow_status`** is the viewer's own row, read with the existing
  `GetPersonaFollowInfo`. Only that field is used. In practice it can only be
  null or `pending`, since an active follow makes the persona visible. A
  rejected request reads as `pending`, the same as everywhere else
  (`followStatus`).
- The full response gets `"locked": false`, so the frontend type is a plain
  union on `locked`.
- `GET /persona/:persona_id/connected` stays 404 for a locked persona.
- The follow and unfollow endpoints are unchanged. They already accept a
  private target you can't see.

No new query, no migration, no GraphQL change.

## Live update

The locked page can't subscribe to the target's `follow_counts` subject:
`/control` answers 404, because the viewer doesn't see it. But approving (and
removing) already publishes `follow_counts.update` for **both** personas
(`publishCounts`). So the locked page subscribes to the **viewer's own**
persona subject, which `/control` allows, and refetches the profile on
`follow_counts`. When the request is approved, the refetch returns the full
profile.

- It refetches on any change to the viewer's own counts, including unrelated
  ones. That costs one cheap GET and is rare.
- A rejection publishes no counts. The page keeps showing "Requested", which
  is the intended behaviour.
- The full view keeps its current subscription to the target. A removal
  publishes counts for the target, the refetch returns `locked`, and the page
  switches to the locked view. No change is needed there.

## Frontend

- `types/persona.ts`: `PersonaProfile` gains `locked: false`, and a new type
  `LockedPersona = { id: number; locked: true; follow_status: FollowStatus }`.
  `fetchPersonaProfile` returns `PersonaProfile | LockedPersona | "not_found" | null`.
- `personas/[id]/index.tsx`:
  - A new state `{ status: "locked"; persona: LockedPersona }`. On a locked
    response, `load` skips `fetchConnectedPersonas`.
  - It renders a `LockedProfile` card: a `Lock` icon, "This persona is
    private", "Follow it to see its profile.", and the `FollowButton`.
  - The WS effect subscribes to `viewerId` instead of `id` while the state is
    locked, and refetches on `follow_counts`.
- `FollowButton`: a new optional `followLabel` prop, used as "Request to
  follow" here. The reveal confirm needs a name. With no name the button
  reads "this persona", so the confirm says "Follow this persona? It will see
  who you are." The `name` prop becomes optional, defaulting to that wording.
- The existing "Persona not found" view stays for 404.

## Docs

CLAUDE.md, "Persona access", **Profile page** bullet: replace "404 when the
viewer only sees it anonymously" with "a private persona the viewer can't see
answers 200 `{id, locked: true, follow_status}` and the page shows a locked
view with a follow-request button; `only_me` stays 404". Also update the WS
note: a locked page listens to the viewer's own `follow_counts`.

## Out of scope

- Reaching the locked page from an anonymous name (WWW-51) and from a share
  link (WWW-52).
- Any change to who sees what. `ResolvePersonasForViewer` is unchanged.

## Steps

1. Backend: the locked branch in `ReadPersona`, plus `locked: false` on the
   full response.
2. Frontend: the types, the service, the locked state and view, the
   `FollowButton` props, and the live refetch.
3. CLAUDE.md.

## Checks

- `go build ./...` in `backend/`. `pnpm lint` and `pnpm build` in
  `front-end/`. There are no tests in the repo.
- Manual, on dev, with personas A (public) and P (private):
  1. A opens `/personas/P` and sees the locked view, with no name and no
     counts in the network response.
  2. A clicks "Request to follow", confirms, and sees "Requested". A reload
     still shows "Requested".
  3. P approves in its followers sheet. A's open page turns into the full
     profile without a reload.
  4. P removes A. A's page goes back to the locked view.
  5. P rejects a new request from A. A keeps seeing "Requested".
  6. An `only_me` persona and a missing id still show "Persona not found".
