# WWW-21 — Follow button and follower counts in the UI

Branch `WWW-21-follow-button-counts`, from `release-caterpie-v1010`. Epic
WWW-12 (persona privacy and following). Builds on WWW-19 (profile page) and
WWW-20 (follow API).

## Goal

The persona profile shows follower and following counts, plus a Follow
button for the viewer. Each connected persona card has a Follow button too.
Counts are recounted from `persona_followers` on every read, never stored.
They're fresh on page load and **live** while the page is open: a NATS event
reaches the open profile over the WS proxy, and the page refetches.

## The rule

**Counts**, for a persona X:

- `followers_count`: rows with `persona_id = X`, `status = 'active'`,
  `unfollowed_at IS NULL`, whose follower persona isn't deleted.
- `following_count`: rows with `follower_persona_id = X`, the same filters,
  whose target persona isn't deleted.

Pending and rejected rows never count. The counts appear only where the
profile already appears (WWW-19 visibility), so they reveal nothing new.

**Viewer's follow state**, `follow_status`: `"active"`, `"pending"`, or
`null`. A `rejected` row is reported as `"pending"`, as the follow API
already answers, so a rejection is never revealed to the requester.

**`requires_approval`**: true when the persona is private. Anyone who sees
the real persona is allowed to see it, so it adds nothing beyond
`privacy = 'private'`, and it's what the unfollow confirmation needs. The
raw `privacy` field stays account data.

**Button**, by state:

| State | Label | Click |
|---|---|---|
| `null` | Follow | `POST …/follow` |
| `active` | Following | Confirm when `requires_approval`, then `POST …/unfollow` |
| `pending` | Requested | `POST …/unfollow` (cancels the request) |

- **Unfollow confirmation** for a private persona: `confirm("Unfollow
  <name>? <name> is private, so you'll lose access and have to request
  again.")`. This is the repo's existing pattern (post delete, member
  removal). Unfollowing a public persona and cancelling a request don't ask.
- **No button on the viewer's own current persona.** The API refuses it, and
  an inactive control isn't rendered.
- The viewer's other personas get the button like anyone else (WWW-20).
- After a click, the profile is refetched for a fresh recount. After
  unfollowing a private persona that refetch is a 404, and the page shows
  "Persona not found".
- A failed call shows a toast (`sonner`) and keeps the old state.

## Realtime

**Event**: `STREAM_USER_EVENTS.PERSONA.<id>.follow_counts.update`, with no
payload, only the id-only envelope (`owner_id` = whose counts changed).
Following the realtime-path rule, it carries ids and the page refetches over
REST.

- It's **published only when an active follow appears or disappears**, once
  for the followed persona and once for the follower (its `following_count`
  changed):
  - `Follow`, when it writes an `active` row.
  - `Unfollow`, when the row was `active`.
  - Pending requests change no count, so they publish nothing here.
  - WWW-34 (approve, remove a follower) must publish it the same way. This is
    noted in CLAUDE.md.
- `followers.Handler` gains `publishCounts(ctx, personaIDs ...int64)`, next
  to the existing `follower.*` / `follow_request.*` publishes, which stay as
  they are.
- **Why not subscribe visitors to `follower.*`?** Those payloads carry the
  follower's `persona_id`, and `follow_request.*` exposes pending requests.
  Visitors may see only the counts, never who follows, so they get a
  dedicated subject that carries nothing.

**Subscribing**, through `/control`: a new owner type `PERSONA`, handled by
`handlers/persona.go`:

- `SUBSCRIBE` requires the persona to be visible to the subscriber
  (`access.VisiblePersonas`), and answers 404 otherwise, as the profile does.
  `UNSUBSCRIBE` is always allowed.
- **The subject is fixed by the server**: `follow_counts.update` on
  `STREAM_USER_EVENTS`, whatever `event` and `event_action` the client
  sends. A client can never use owner `PERSONA` to subscribe to another
  persona's `notifications`, `direct_messages`, `follower` or
  `follow_request`.
- `durable: false`, offset 0, as for channels.
- The Rust proxy passes the owner through untouched, so it needs no change.

**Frontend**:

- `ws/index.tsx`: `subscribeToPersonaEvents(personaId, cb)`, the same shape
  as `subscribeToChannelEvents`.
- `types/Ws.ts`: `"follow_counts"` in `EventType`, `"PERSONA"` owner in a
  `SubscribePersonaPayload`.
- The profile page subscribes to the persona it shows, unsubscribes on leave
  or id change, and on `follow_counts.update` refetches the profile. That
  updates the counts and `follow_status`. It doesn't flash the skeleton: a
  background refetch keeps the current view until the data arrives.
- Connected cards don't subscribe. Their only state is the viewer's own
  `follow_status`, which changes on the viewer's own clicks.

**Not live, on purpose**: a pending request made or cancelled from another
tab changes no counts, so no event fires, and the label catches up on the
next load. A deleted persona drops out of the counts on the next load,
because persona deletion publishes nothing yet.

## Changes

1. **Shared**:
   - `queries/persona.sql`:
     - `GetPersonaFollowInfo(persona_id, viewer_id)`: `followers_count`,
       `following_count`, the viewer's `follow_status` (nullable live row),
       and `privacy = 'private' AS requires_approval`.
     - `ListConnectedPersonas` gains `viewer_id` and a `LEFT JOIN` for
       `follow_status`.
     - Then `make generate-models`.
   - `nats/personaEvents.go`: `EventFollowCounts = "follow_counts"`.
2. **Backend**:
   - `handlers/users/persona.go`: `ReadPersona` adds `followers_count`,
     `following_count`, `follow_status` and `requires_approval`.
     `ConnectedPersonas` adds `follow_status` per item. A `followStatus`
     helper maps `rejected` to `"pending"` and no row to `null`.
   - `handlers/followers/`: `publishCounts`, called from `Follow` and
     `Unfollow` as above.
   - `/control`: `OwnerTypePersona` in `redis/handler/control.go`, plus a
     `persona` handler in `redis/handler/persona.go`.
3. **Frontend**:
   - `types/persona.ts`: `FollowStatus`, `follow_status` on `PublicPersona`,
     and `PersonaProfile = PublicPersona & {followers_count, following_count,
     requires_approval}`.
   - `services/persona.ts`: `setPersonaFollowing(id, follow): Promise<
     FollowStatus | Error>`. `fetchPersonaProfile` returns `PersonaProfile`.
   - `components/follow-button/index.tsx`: `FollowButton {personaId, name,
     status, requiresApproval, onChange}`. It holds the label table and the
     confirm, is disabled while its request is in flight, and toasts on
     error.
   - `pages/(dashboard)/personas/[id]/index.tsx`:
     - "N followers · M following" under `@slug`, and the button on the
       right, hidden when `persona.id === viewerId`.
     - `load({background})`, so a refetch after a click or event doesn't
       show the skeleton.
     - Subscribes to the persona's events.
     - Connected cards become a `div` holding the `Link` and the button,
       since a button can't sit inside a link.
4. **CLAUDE.md**:
   - "Persona access": the profile's counts, `follow_status` (rejected reads
     as pending) and `requires_approval`.
   - "The realtime path": `/control` owner `PERSONA`, which serves only
     `follow_counts.update` to viewers who can see the persona. Anything
     that changes an active follow publishes it for both personas.

## Out of scope

- Follower and following lists: who follows whom.
- Approve, reject, and the requests inbox: WWW-34. It must publish
  `follow_counts.update`.
- Follow notifications: WWW-23.
- Follow buttons on post authors and channel member rows.

## Found while specifying (not fixed here)

`GET /persona/:id/connected` (WWW-18) returns `name`, the owner's private
label for the persona. WWW-19 treats it as account data. To be filed as a
separate Bug.

## Acceptance

Personas: P (public, linked), S (public, linked, same user as P), Q
(private), and viewers V and W from other users.

- V opens `/personas/P`: "0 followers · 0 following" and **Follow**. Clicking
  it gives **Following** and "1 followers", with no confirm when unfollowing.
- **Live**: with P's profile open in W's browser, V follows P and W's page
  shows "1 followers" without a reload. When P follows S, W's open P page
  shows "1 following" and an open S page shows "1 followers".
- The S card on P's profile follows and unfollows S, and its label changes.
- V, an approved follower of Q, clicks **Following** on `/personas/Q`: a
  confirm appears. Cancel changes nothing. OK unfollows, and the page shows
  "Persona not found".
- One of Q's sibling personas clicks Follow and gets **Requested**, and the
  counts don't change. Clicking again cancels it with no confirm.
- With a row set to `rejected` by hand, the button reads **Requested** and
  the API says `"pending"`.
- V viewing its own current persona sees the counts and no button.
- **`/control` checks:**
  - Subscribing with owner `PERSONA` to a persona V only sees anonymously
    answers 404.
  - Subscribing with `event: "notifications"` or `"follower"` still returns
    only `…follow_counts.update`.
- Leaving the page sends UNSUBSCRIBE.
- An API failure shows a toast and the label doesn't change.
- `go build ./...` and `go vet ./...` pass in `shared/` and `backend/`, and
  `pnpm build` and `pnpm lint` pass in `front-end/`. There are no tests in
  the repo.
