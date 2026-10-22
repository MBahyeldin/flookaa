# WWW-22 — Apply persona visibility to notification actors

Branch `WWW-22-notification-actor-visibility`, from `release-caterpie-v1010`.
Epic WWW-12 (persona privacy and following). It comes before WWW-23 (follow
notifications), whose actors are exactly the personas this hides.

## Problem

`GET /api/v1/notifications` names an actor (`latest_actor`) for every
notification. `notifications.Handler.resolveActors` reads the Redis cache,
which holds public personas only, and on a miss calls `ResolvePersonaByID`.
That call has **no visibility check**. So when a private or `only_me`
persona comments on, likes, or asks to join something of yours, the
notification shows its real name and avatar. Everywhere else (GraphQL
authors, channel member lists) the same persona is "Quiet Otter 37".

## The rule

The recipient persona is the viewer. Every actor goes through the same rule
as every other persona view, `ResolvePersonasForViewer(recipient, ids)`:

- **Visible** (public, a sibling of the recipient, or private and the
  recipient is an approved follower): the real `first_name`, `last_name` and
  `thumbnail`, as today.
- **Not visible**: the anonymous view. `first_name =
  access.AnonymousName(actorID, channelID)`, `last_name = ""`, no thumbnail,
  and `anonymous: true`.
  - `channelID` is the notification's channel (`channelID(row)`: the scope
    for content kinds, the subject for membership kinds). So the name
    matches what the recipient sees for that persona inside that channel.
  - Personal kinds without a channel (follow kinds, WWW-23) use channel 0,
    the same function and input as everywhere else.
- **Deleted** (no row): no actor, as today.
- **The id stays real**, as everywhere else.
- **No exceptions** for moderators or admins. A join request from an
  anonymous persona shows its anonymous name, as the request list already
  does.

Counts in aggregated kinds don't change: "Quiet Otter 37 and 3 others" still
counts everyone.

## Changes

1. **Backend**, `handlers/notifications/actors.go`:
   - `resolveActors(ctx, recipientID, ids)` returns, per actor id, its real
     fields and `visible`.
     - Cache hits are public personas, so they're visible with no query.
     - Misses go to **one** `ResolvePersonasForViewer` per page, as
       `Resolver.resolvePersonas` does. Visible misses are written back with
       `SetPersonaInfo`, which skips non-public ones itself.
   - `ActorResponse` gains `Anonymous bool \`json:"anonymous"\``.
   - `list.go`: when filling `latest_actor`, a visible actor gets its real
     fields. An invisible one gets the anonymous view, named with that
     notification's channel. That's why the name is built per notification,
     not per actor.
   - `ResolvePersonaByID` stays, since it has other callers. This package
     stops using it.
2. **Frontend**:
   - `types/notification.ts`: `anonymous: boolean` on `NotificationActor`.
   - `components/notifications/NotificationItem.tsx`: for an anonymous
     actor, no image and no channel-thumbnail fallback. Draw
     `GeneratedAvatarFallback` from the name, as post cards do for anonymous
     authors. Real actors keep today's look.
   - `describe.ts` needs no change: it already builds the actor text from
     `first_name last_name`, and its links point to the content, not the
     actor.
3. **CLAUDE.md**, "Persona access": add notification actors to the list of
   responses that go through `ResolvePersonasForViewer`, named per the
   notification's channel, or channel 0 when personal.

## Realtime

Nothing new. The `notifications.create` frame carries only the id, and the
browser refetches the list, so the anonymous view applies to live
notifications too.

## Out of scope

- Re-resolving when visibility changes. A persona that becomes public, or
  that the recipient starts following, shows its real name on the next
  fetch. There's no event for privacy changes yet.
- Follow notification kinds: WWW-23.

## Acceptance

Personas: R (recipient, owns post X in public channel C), A (public), B
(private, R not a follower), B2 (private, R is an approved follower), E
(only_me), and S (a sibling of R).

- A, B, B2, E and S each comment on X. R's list shows the real names for A,
  B2 and S. B and E show `anonymous: true` with names like "Quiet Otter 37",
  no thumbnail, and a generated avatar.
- B's anonymous name in the notification equals B's author name on X in
  channel C.
- When B likes X last, `post_like` shows "\<B's anonymous name\> and N
  others", with N unchanged.
- B asks to join R's private channel. R's `join_request` notification shows
  B's anonymous name, the same as R's request list.
- R starts following B (approved). On the next fetch, B's notifications show
  the real name.
- A deleted actor still shows no actor.
- A page with several anonymous actors makes one `ResolvePersonasForViewer`
  call.
- `go build ./...` and `go vet ./...` pass in `backend/`, and `pnpm build` and
  `pnpm lint` pass in `front-end/`. There are no tests in the repo.
