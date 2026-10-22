# WWW-20 — Follow / unfollow persona API

Branch `WWW-20-follow-persona-api`, from `release-caterpie-v1010`. Epic
WWW-12 (persona privacy and following).

## Goal

A persona can follow and unfollow another persona. Following a public persona
is immediate. Following a private persona files a pending request, which only
counts once approved (WWW-34). Every change publishes an event, so the UI
(WWW-21) and notifications (WWW-23) can react to it. Following a user as a
whole is not supported.

The table and the `status` enum already exist (`persona_followers`,
migration 013), so this ticket has **no migration**.

## The rule

Both endpoints are Persona tier. The follower is always `auth.PersonaID(c)`
and the target is `:persona_id`.

`POST /api/v1/persona/:persona_id/follow`

| Target | Result |
|---|---|
| bad id | 400 `invalid persona ID` |
| the follower itself | 400 `cannot follow yourself` |
| missing, deleted, or `only_me` | 404 `persona not found` |
| already active | 200 `{"status":"active"}`, no write, no event |
| already pending or rejected | 202 `{"status":"pending"}`, no write, no event |
| `public` | 200 `{"status":"active"}`, event `follower.create` / `followed` |
| `private` | 202 `{"status":"pending"}`, event `follow_request.create` / `requested` |

- **`only_me` is 404.** It can't have followers, and 404 matches what its
  profile page already returns.
- **A private persona can be requested without being visible.** That is the
  point of the request, and the ids in anonymous views are already real.
- **A rejected request is not revived.** Following again answers 202 pending
  and changes nothing, so a rejected persona can't spam requests. Nothing
  writes `rejected` until WWW-34, which can revisit this.
- **Your own other personas** follow the same rules as anyone else. No special
  case.

`POST /api/v1/persona/:persona_id/unfollow`

| State | Result |
|---|---|
| bad id | 400 `invalid persona ID` |
| active | 200, `unfollowed_at = now()`, event `follower.delete` / `unfollowed` |
| pending | 200, `unfollowed_at = now()`, event `follow_request.delete` / `cancelled` |
| rejected, unfollowed, or no row | 400 `not following this persona` |

- Unfollow doesn't check the target's privacy or existence. A follower can
  always end its own follow, even after the target turns `only_me` or is
  deleted.
- Unfollowing a rejected request would clear the rejection and let the
  persona ask again, so it's refused like "not following".

### Storage

`persona_followers` has one row per pair (`PRIMARY KEY (persona_id,
follower_persona_id)`), so following again after an unfollow revives the
same row. Every read and write filters `unfollowed_at IS NULL`, as
`ResolvePersonasForViewer` already does.

New queries in `shared/external/db/postgres/queries/persona.sql`:

- `GetFollowTarget(persona_id, follower_persona_id)`: the target's `privacy`
  (only when it isn't deleted) plus the current follow's `status`, NULL when
  there is no live row. One query for the whole follow decision.
- `FollowPersona(persona_id, follower_persona_id, status) :execrows`:
  `INSERT … ON CONFLICT (persona_id, follower_persona_id) DO UPDATE SET
  status, followed_at = now(), unfollowed_at = NULL WHERE
  persona_followers.unfollowed_at IS NOT NULL`. A concurrent follow that
  already made the row live writes 0 rows, and then the handler publishes
  nothing.
- `UnfollowPersona(persona_id, follower_persona_id) :one`: `UPDATE … SET
  unfollowed_at = now() WHERE … AND unfollowed_at IS NULL AND status IN
  ('active','pending') RETURNING status`. `sql.ErrNoRows` → 400. The
  returned status picks the event.

Then `make generate-models`.

### Events

Like channel membership, these are NATS-only and are not `events` rows.
`persona_followers` is the source of truth.

- Subject: `STREAM_USER_EVENTS.PERSONA.<target>.{follower|follow_request}.{create|delete}`,
  built with `shared/pkg/subject`. The owner is the **followed** persona,
  since that persona's UI and notifications react to it.
- `ActorID` is the follower. The payload is `{persona_id, reason}`, with
  `persona_id` the follower, the same shape as `ChannelEventPayload`.
- `shared/external/db/nats/personaEvents.go` adds `EventFollowRequest =
  "follow_request"` and `FollowEventPayload`. `EventFollower` and the
  reasons are reused from `channelEvents.go`.
- A failed publish is logged, not returned, the same as the channel handlers.
- Not added to the default WS subscription (`AddDefaultSubjectsToPersona`).
  WWW-21 and WWW-23 decide who listens. Per CLAUDE.md, their consumers must
  filter on these subjects specifically, never on `STREAM_USER_EVENTS.>`.

## Changes

1. **Shared**: the three queries and `make generate-models`, plus
   `nats/personaEvents.go`.
2. **Backend**:
   - New package `backend/internal/db/postgres/handlers/followers`, with
     `Handler{q, nats}`, `Follow`, `Unfollow`, and a `publish` helper like
     `channels/events.go`. A separate package keeps NATS out of
     `users.Handler`.
   - `AddPersonaRoutes` takes the followers handler and adds
     `viewGroup.POST("/follow", …)` and `viewGroup.POST("/unfollow", …)`.
   - `cmd/server/root.go` builds it with `followers.NewHandler(q, natsHelper)`.
3. **CLAUDE.md**, under "Persona access": one bullet with the follow rules
   (public immediate, private pending, `only_me` 404, a rejected request
   stays rejected, soft unfollow), and the event subjects next to the
   channel-events sentence in "The realtime path".

## Out of scope

- Approve, reject, remove a follower, list requests: WWW-34.
- Follow button, follow state on the profile, follower counts: WWW-21.
- Follow notifications: WWW-23.
- Invitations: WWW-35.
- Pending requests stay pending when a private persona turns public. WWW-34
  can auto-approve them.

## Acceptance

Personas: P (public), Q (private), R (only_me), and a follower F from
another user.

- F follows P → 200 active, a live `active` row, and `…PERSONA.<P>.follower.create`
  with `{persona_id: F, reason: "followed"}`. Following again → 200 active and
  no new event.
- F follows Q → 202 pending, and `…PERSONA.<Q>.follow_request.create`. Q's
  profile is still 404 for F (WWW-19). After the row is set to `active` by
  hand, F sees Q.
- F follows R → 404. F follows F → 400. F follows a deleted persona → 404.
- F unfollows P → 200, `unfollowed_at` set, `follower.delete`/`unfollowed`.
  Unfollowing again → 400. Following again revives the same row as active.
- F cancels the pending request to Q → 200, `follow_request.delete`/`cancelled`.
- With the row set to `rejected` by hand: follow → 202 pending and the row
  stays `rejected`; unfollow → 400.
- No cookie → 401. No current persona → 403 `persona_required`.
- `go build ./...` and `go vet ./...` pass in `shared/` and `backend/`. There
  are no tests in the repo.
