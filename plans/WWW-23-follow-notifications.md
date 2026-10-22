# WWW-23 — Follow notifications: new follower, follow request

Branch `WWW-23-follow-notifications`, from `release-caterpie-v1010`.
Epic WWW-12 (persona privacy and following). It builds on WWW-20 (the follow
events) and WWW-22 (actor visibility).

## Scope

This ticket covers the two kinds whose source events exist today:

| Kind | Source event | Recipient |
|---|---|---|
| `new_follower` | `STREAM_USER_EVENTS.PERSONA.<followed>.follower.{create,delete}` | the followed persona |
| `follow_request` | `STREAM_USER_EVENTS.PERSONA.<followed>.follow_request.{create,delete}` | the private persona being asked |

The other kinds the ticket listed are done with the features that publish
their events:

- "Request accepted": WWW-34 (approve, reject, remove follower).
- "Invitation" and "invitation accepted": WWW-35 (follow invitations).

## Shape of the rows

Both kinds are **aggregated**, one row per followed persona, like
`join_request` per channel:

- `subject_type = 'PERSONA'`, `subject_id` = the followed persona's id, which
  is the recipient. The `group_key` is `new_follower:<id>` or
  `follow_request:<id>`.
- **No scope** (personal, always visible). So no new visibility rule is needed.
- `actor_id` is NULL. The latest actor comes from the recount.
- No `data`.

### Recounts (`shared/pkg/notifications.Kinds`)

New queries in `queries/notification.sql`, batched by followed persona id,
in the same form as `RecountPendingJoinRequests`:

- `RecountFollowers`: `persona_followers` rows with `status = 'active' AND
  unfollowed_at IS NULL`, whose follower is not deleted. The latest actor is
  the newest `followed_at`.
- `RecountPendingFollowRequests`: the same with `status = 'pending'`.

`new_follower` counts **all** active followers, as `post_like` counts all
likers, so it reads "Alice and 12 others followed you". A follower who leaves
doesn't make the row unread. The row goes away only when nobody is left.
Counting only followers since the last read would need a time window that no
other kind has. If the full count reads badly in QA, that's a follow-up.

## Changes

1. **Migration `015_follow_notification_kinds`**:
   - up: `ALTER TYPE notification_kind_enum ADD VALUE 'new_follower'` and
     `... 'follow_request'`.
   - down: delete the notifications of those kinds, then rebuild the enum
     without them (rename the old type, create the new one, cast the column,
     drop the old type), because Postgres can't drop an enum value.
   - Then run `make generate-models`.
2. **`shared`**:
   - The two queries above.
   - `notifications.Kinds`: `new_follower` → `{PERSONA, recountFollowers}`,
     `follow_request` → `{PERSONA, recountPendingFollowRequests}`. The two
     funcs parse the persona ids like `recountPendingJoinRequests` does, and
     share that parsing with it.
3. **Notifier**:
   - `worker.go`: a third source, durable `notifier-user` on
     `STREAM_USER_EVENTS`, with **specific** `FilterSubjects`
     `STREAM_USER_EVENTS.PERSONA.*.follower.*` and
     `STREAM_USER_EVENTS.PERSONA.*.follow_request.*`. It must never use
     `STREAM_USER_EVENTS.>`, which would consume the notifier's own
     `notifications.*` frames. `consume` takes the filter list instead of
     building `stream + ".>"`. The two existing sources pass
     `[stream + ".>"]` and don't change.
   - New `persona.go`, `w.persona(...)`:
     - `follower.create` → `notify` the followed persona (`e.OwnerID`),
       `new_follower`, with source actor `payload.PersonaID` (the follower).
     - `follower.delete` → `removeIfEmpty(new_follower, <followed id>)`.
     - `follow_request.create` → `notify`, `follow_request`.
     - `follow_request.delete` → `removeIfEmpty(follow_request, ...)`.
     - `follow_counts.update` doesn't match the filters, so it never arrives.
   - The `Run` comment about future `STREAM_USER_EVENTS` sources is replaced
     by the source itself.
4. **Backend**: none beyond the new generated enum constants.
   - The list API already handles PERSONA subjects. `channelID(row)` is 0,
     so the actor is named by the WWW-22 rule with channel 0, and `channel`
     is null.
   - `notifications.Check` passes once the specs exist.
5. **Frontend**:
   - `types/notification.ts`: add the two kinds to `NotificationKind`.
   - `describe.ts`:
     - `new_follower` → `actors(n)` + "followed you".
     - `follow_request` → `actors(n)` + "asked to follow you".
     - Both link to `/personas/<subject.id>`, your own profile, which shows
       the counts. WWW-34 points `follow_request` at the requests list once it
       exists.
   - `NotificationItem` needs no change. These kinds always have an actor,
     and an anonymous actor already gets the generated avatar.
6. **Docs**:
   - CLAUDE.md, "Notifications": the notifier also consumes
     `STREAM_USER_EVENTS` through `notifier-user`, with only the two filter
     subjects.
   - CLAUDE.md, "Build & deploy": the notifier line names migration 015.
   - `notifier/README.md`: the same change.

## Privacy

- Actors follow the WWW-22 rule unchanged. A private or `only_me` follower or
  requester that the recipient can't see is "Quiet Otter 37" (channel 0),
  with a generated avatar.
- The recipient therefore can't tell who an anonymous requester is.
  Whether filing a request reveals you to its target is decided in WWW-34,
  together with the request list. This notification will follow that rule.
- Counts leak nothing new: the follower count is already public on the
  profile. The pending count is visible only to the recipient.

## Realtime

Nothing new on the browser side. The notifier publishes
`notifications.create/delete` as for every kind, and
`useNotificationsRealtime` refetches.

## Deploy order

1. Run `make migrate-up` (015).
2. Deploy the backend and the notifier, then the frontend.

Running processes check kinds only at startup, so the old binaries keep
working between steps 1 and 2. A new notifier creates `notifier-user` with
`DeliverNew`, so follows from before the deploy don't notify.

## Out of scope

- "Request accepted": WWW-34.
- Invitations: WWW-35.
- A followers or requests list page.
- Counting only the followers since the last read.

## Acceptance

Personas: P (public), Q (private), A (public), B (private, not followed by
P or Q), S (a sibling of Q).

- A follows P. P gets "A followed you", unread, live, linking to P's profile.
- B follows P, then A unfollows and follows again. P has **one**
  `new_follower` row: "A and 1 other followed you", unread again, with A
  latest. B shows as an anonymous name when it is the latest actor.
- A and B both unfollow P. The row disappears live (`notifications.delete`).
  A follow after that revives it.
- A asks to follow Q. Q gets "A asked to follow you". A cancels, and the row
  disappears.
- S (Q's sibling) asks to follow Q. Q is notified with S's real name, since
  siblings see each other.
- Redelivering a `follower.create` changes nothing (replay guard).
- A `notifications.*` frame on `STREAM_USER_EVENTS` is never consumed by
  `notifier-user`. Check this with `nats consumer info`: there are two filter
  subjects.
- The notifier starts after 015, and `notifications.Check` passes in both
  the backend and the notifier.
- `go build ./...` and `go vet ./...` pass in `shared/`, `backend/` and
  `notifier/`. `pnpm build` and `pnpm lint` pass in `front-end/`. There are no
  tests in the repo.
