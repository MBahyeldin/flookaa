# WWW-34 — Follow requests: approve, reject, remove follower

Branch `WWW-34-follow-requests`, from `release-caterpie-v1010`. Epic WWW-12
(persona privacy and following). It builds on WWW-20 (the follow API),
WWW-21 (the profile counts) and WWW-23 (the follow notifications).

## Goal

A persona manages who follows it:

- It lists its pending follow requests, and approves or rejects each one.
- It lists its followers and removes any of them.
- The requester is notified when a request is approved.

This mirrors `/channels/:id/requests` and `/channels/:id/members`, with one
difference: the persona itself is the only moderator.

The ticket also settles the open question from WWW-23: whether filing a
request reveals the requester to its target.

## Decision: following reveals you to the persona you follow

**Recommended rule:** a persona with a live `pending` or `active` follow on
another persona shows its real self to that persona. A `rejected` or
unfollowed row hides it again.

Without this rule, Q (private) would see "Quiet Otter 37 asked to follow you"
and have to approve someone it can't identify. Approving wouldn't help
either: Q sees an approved follower only if Q follows it back, so Q's
followers list would stay anonymous too. Most social apps work this way:
following someone is an act toward them, so they can see who you are.

**What follows from the rule:**

- It applies to every response, not only to the follow lists. It is one
  extra `OR EXISTS` in `ResolvePersonasForViewer`, which every name and
  avatar already goes through. So Q also sees B's real name in the channels
  they share and in notifications, and Q can open B's profile.
- It applies to public targets too: a private persona B that follows a public
  persona P is revealed to P. The follow button on a private persona's own
  view gets a one-line hint in the confirm: "<target> will see who you are".
  This only applies when the follower itself isn't public.
- Removing a follower or rejecting a request hides the persona again.

**Alternative:** keep requesters anonymous and approve blind. It needs no
change to the access rule, but the requests list is then a list of anonymous
names. I don't recommend it.

The rest of this plan assumes the recommended rule. If you pick the
alternative, drop change 1 and the follow-button hint.

## The rule

All endpoints are Persona tier. The acting persona is `auth.PersonaID(c)`.
`:persona_id` must be that persona, or the endpoint answers 403
`{"error":"not_your_persona"}`. Persona ids are already real everywhere, so
403 leaks nothing. To manage another of your own personas, switch to it.

| Endpoint | Result |
|---|---|
| `GET /persona/:persona_id/requests` | 200 `{requests: [...]}`, pending rows whose requester isn't deleted, newest first |
| `POST /persona/:persona_id/requests/:follower_id/approve` | 200 `{"status":"active"}`; 404 `no pending follow request` |
| `POST /persona/:persona_id/requests/:follower_id/reject` | 200 `{"status":"rejected"}`; 404 the same |
| `GET /persona/:persona_id/followers` | 200 `{followers: [...]}`, active rows whose follower isn't deleted, newest first |
| `POST /persona/:persona_id/followers/:follower_id/remove` | 200; 404 `not a follower` |

- Each row has `persona_id`, `first_name`, `last_name`, `thumbnail`,
  `anonymous` and `requested_at` or `followed_at`. It never has `name`, which
  is the owner's private label. Non-public rows go through
  `access.VisiblePersonas` with channel 0, as notification actors do. Under
  the recommended rule they are always visible, but the lists still go
  through the shared rule rather than assume it.
- **Approve** sets `status = 'active'` and `followed_at = now()`, so the new
  follower counts as the latest in the `new_follower` recount.
- **Reject** sets `status = 'rejected'`. As decided in WWW-20, the rejection
  is permanent: the requester still sees "Requested", can't re-send, and
  can't cancel. Un-rejecting is out of scope.
- **Remove** sets `unfollowed_at = now()` and keeps `active`, the same as an
  unfollow. The removed persona may follow again. A public persona takes it
  back at once, a private one gets a new pending request. Blocking is a
  separate feature.
- No paging, the same as the channel member and request lists. Paging is a
  follow-up if the lists grow.

## Changes

1. **Access rule** (`queries/persona.sql`, `ResolvePersonasForViewer`): add
   `OR EXISTS (SELECT 1 FROM persona_followers pf WHERE pf.persona_id =
   viewer AND pf.follower_persona_id = t.id AND pf.status IN
   ('pending','active') AND pf.unfollowed_at IS NULL)`. The Redis persona
   cache holds only public personas, so it doesn't need to change.
2. **Migration `016_follow_request_approved`**:
   - up: `ALTER TYPE notification_kind_enum ADD VALUE 'follow_request_approved'`.
   - down: delete the rows of that kind, then rebuild the enum without it,
     the same way 015's down does.
   - Then run `make generate-models`.
3. **Queries** (`queries/persona.sql`):
   - `ListPendingFollowRequests(persona_id)`.
   - `ListFollowers(persona_id)`.

   Both join `personas` to get the follower's fields and `privacy`, and
   leave out deleted followers.
   - `ResolveFollowRequest(persona_id, follower_persona_id, status) :one`:
     `UPDATE … WHERE status = 'pending' AND unfollowed_at IS NULL`. It sets
     `followed_at = now()` only when the new status is `active`, and returns
     the status.
   - `RemoveFollower(persona_id, follower_persona_id) :execrows`:
     `UPDATE … SET unfollowed_at = now() WHERE status = 'active' AND
     unfollowed_at IS NULL`.
4. **Backend** (`handlers/followers`):
   - New `requests.go` with `ListRequests`, `ApproveRequest`,
     `RejectRequest`, `ListFollowers` and `RemoveFollower`, plus a
     `requireSelf(c)` helper that returns the persona id or answers 403.
   - Events, all on the followed persona's subject. `ActorID` is the
     followed persona, and the payload's `persona_id` is the follower:
     - approve → `follow_request.delete`/`approved`, then
       `follower.create`/`approved`, then `publishCounts(persona, follower)`.
     - reject → `follow_request.delete`/`rejected`.
     - remove → `follower.delete`/`removed`, then
       `publishCounts(persona, follower)`.
   - A failed publish is logged, as it is everywhere else.
   - `api/v1/persona.go`: five routes on `viewGroup`.
5. **`/control`** (`redis/handler/persona.go`): when `ownerID` is the viewer
   itself, also return the four subjects `follower.{create,delete}` and
   `follow_request.{create,delete}` for that persona. Every other viewer
   still gets only `follow_counts.update`. The comment about the fixed
   subject becomes: "only the persona itself gets its follow changes".
6. **Shared**: a `follow_request_approved` spec in `notifications.Kinds`:
   `{Subject: PERSONA}`, single actor with no recount, like
   `request_approved`.
7. **Notifier** (`persona.go`): `follower.create` with reason `approved`
   notifies `payload.PersonaID` (the requester) with kind
   `follow_request_approved`. The subject is `e.OwnerID` (the persona that
   approved) and `actorID` is `e.ActorID`. The existing branches already
   cover the rest:
   - reason `followed` is the only one that notifies `new_follower`.
   - `follow_request.delete` (approve or reject) and `follower.delete`
     (remove) each call `removeIfEmpty`.
   - A rejection or removal notifies nobody, the same as in channels.
8. **Frontend**:
   - `types/notification.ts` gets the new kind. A new `types/follower.ts`
     (or an addition to `types/persona.ts`) holds `FollowRequest` and
     `Follower`.
   - `services/persona.ts`: `listFollowRequests`, `resolveFollowRequest`,
     `listFollowers`, `removeFollower`.
   - New `pages/(dashboard)/personas/[id]/FollowersSheet.tsx`, shaped like
     `ModerationSheet`:
     - Tabs "Requests (n)" and "Followers".
     - Each row has an avatar, a `PersonaLink` and a date.
     - Requests get Approve and Reject. Followers get Remove, with a confirm
       ("Remove <name>? They won't be told.").
     - The sheet reloads its lists when it opens and on every live
       `follower`/`follow_request` frame.
   - Profile page, own persona only (others see nothing, per "hide inactive
     buttons"):
     - The followers count becomes a button that opens the sheet.
     - `?followers=requests` opens it on the Requests tab.
     - The existing WS callback also reloads on `follower` and
       `follow_request` frames, which only your own profile receives.
   - `describe.ts`:
     - `follow_request` → `/personas/<subject.id>?followers=requests`.
     - `follow_request_approved` → actor `actorName(n)`, "accepted your
       follow request", linking to `/personas/<subject.id>`.
   - `FollowButton`: in the follow confirm, when the current persona isn't
     public, show the hint "<name> will see who you are". For that it reads
     the current persona's privacy from `UserProfileStore`.
9. **Docs** (CLAUDE.md):
   - "Persona access" table and bullets: add the reveal rule, the five
     endpoints, and the rule that reject is permanent while remove is soft.
   - "The realtime path": `/control` owner `PERSONA` also serves the
     follow subjects, to the persona itself only.
   - "Notifications": the follow kinds include `follow_request_approved`.
   - "Build & deploy": the notifier needs migration 016.
   - `notifier/README.md`: the same change.

## Deploy order

1. Run `make migrate-up` (016).
2. Deploy the backend and the notifier, then the frontend.

Old binaries pass `Check` until they restart. The new notifier refuses to
start without 016.

## Out of scope

- Auto-approving pending requests when a private persona turns public. That
  gets its own ticket.
- Un-rejecting a request, and blocking.
- A public followers or following list on other personas' profiles.
- Paging the two lists.
- Invitations: WWW-35.

## Acceptance

Personas: Q (private), P (public), A (public, another user), B (private,
another user), S (a sibling of Q).

- B asks to follow Q. Q's notification and requests list show B's **real**
  name (reveal rule), live, and the notification opens the sheet on
  Requests.
- Q approves B. B gets "Q accepted your follow request", live, with Q's real
  name. Q's `follow_request` notification goes away. Both personas' counts
  update live on open profiles. B can now open Q's profile, and B is in Q's
  Followers tab.
- A asks to follow Q, and Q rejects. A's button still reads "Requested".
  Following again → 202 with no change. Unfollowing → 400. Q now sees A only
  because A is public. A private requester that is rejected becomes
  anonymous to Q again.
- Q removes B. B isn't notified. Q's count drops live, B no longer sees Q's
  profile (404), and Q sees B anonymously again. B can request again.
- B follows P (public). P sees B's real name. B's follow confirm showed the
  "P will see who you are" hint.
- P's other personas, and anyone else, get 403 `not_your_persona` on P's
  request and follower endpoints. Approving a persona that has no pending
  request → 404.
- A visitor subscribed to Q's profile gets only `follow_counts.update`. Q on
  its own profile also gets the follower and request frames.
- Redelivering `follower.create`/`approved` doesn't create a second
  notification (replay guard).
- `go build ./...` and `go vet ./...` pass in `shared/`, `backend/` and
  `notifier/`. `pnpm build` and `pnpm lint` pass in `front-end/`. There are no
  tests in the repo.
