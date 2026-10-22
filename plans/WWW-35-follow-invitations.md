# WWW-35 — Follow invitations

Branch `WWW-35-follow-invitations`, from `release-caterpie-v1010`. Epic
WWW-12 (persona privacy and following). It's the last ticket in the epic.

## What's already done, and what's left

WWW-34 and WWW-50 to WWW-52 already cover "A wants B to follow A" through a
**pull**: A shares a link, B requests, and A approves. This ticket adds the
**push**: persona A invites one specific persona B, and B accepts in one step.

Already covered, so not in this ticket:
- A shareable link for anyone (WWW-52).
- Approving a pending request (WWW-34).

New in this ticket:
- Inviting a specific persona.
- Accepting makes B an active follower at once, with no second approval.
- Inviting a persona that already has a pending request to A approves that
  request.
- A rejection cooldown.
- Two notification kinds: `follow_invitation` and `follow_invitation_accepted`.

## Rules

- **Who can invite.** Only a private persona. A public persona can just be
  followed, so its invitation would only be a notification. A public or
  `only_me` inviter gets 400 `cannot_invite`, and the button is hidden. The
  invitee can be any persona A sees, public ones included.
- **Whom A can invite.** Only a persona that A sees (`ResolvePersonasForViewer`
  with viewer A). A can't invite itself or its user's other personas. All of
  these get 404.
- **Depending on B's current follow of A:**

| B's follow of A | Inviting does | Answer |
|---|---|---|
| active | nothing | 200 `{"status":"following"}` |
| pending request | approves it, exactly like `ApproveRequest` (same publishes, so B gets `follow_request_approved`) | 200 `{"status":"following"}` |
| none, rejected or ended | creates or revives a pending invitation | 202 `{"status":"invited"}` |

- **A rejected request doesn't block an invitation.** A rejected B's request
  earlier, and A is the one changing its mind now.
- **Accepting** sets B's follow row to `active` from any state: none, ended,
  or rejected. Then it publishes `follower.create` with the new reason
  `invited`, plus `follow_counts.update` for both personas.
- **Rejecting** is soft. A isn't told. During the **cooldown (30 days)**, A
  inviting B again answers `invited` and changes nothing, the same way a
  rejected follow request keeps reading "Requested". After 30 days the
  invitation can be revived.
- **Cancelling.** A can cancel a pending invitation (`cancelled`). That ends
  the cooldown question, and A can invite again at once.
- **An invitation reveals A to B.** While A's invitation to B is pending, B
  sees A's real persona. This only matters if A is private, since a public A
  is visible anyway. Like "following reveals you", it's a clause in
  `ResolvePersonasForViewer`. Once the invitation is rejected or cancelled, A
  is hidden from B again. Accepting keeps A visible, because B is now an
  approved follower.
- **A persona that stops being private** loses its pending invitations.
  `UpdatePersona` then calls `CancelInvitationsFrom` and publishes
  `follow_invitation.delete` for each invitee, so their notifications go
  away. It's a separate statement because it has to publish. If it fails,
  nothing leaks: accepting refuses an inviter that isn't private, and the
  visibility clause only applies to private inviters.
- **Following an inviter.** If B presses Follow on an A that has a pending
  invitation to B, that accepts the invitation. Otherwise a private A would
  get a pending request from B on top of A's own invitation.
  `GetFollowTarget` returns `invited` for this.

## Data

Migration `018_persona_follow_invitations`:

```sql
CREATE TYPE persona_invitation_status_enum AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');

CREATE TABLE persona_follow_invitations (
    persona_id BIGINT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,          -- the inviter, to be followed
    invitee_persona_id BIGINT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
    status persona_invitation_status_enum NOT NULL,
    invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at TIMESTAMPTZ,
    PRIMARY KEY (persona_id, invitee_persona_id),
    CHECK (persona_id <> invitee_persona_id)
);
CREATE INDEX persona_follow_invitations_invitee ON persona_follow_invitations (invitee_persona_id) WHERE status = 'pending';
```

The down migration drops the table and the type.

The table has one row per pair, the same as `persona_followers`. As with the
follower status, `status` has no default.

Migration `019_follow_invitation_kinds` adds `follow_invitation` and
`follow_invitation_accepted` to `notification_kind_enum`. It's a separate
migration because `ADD VALUE` must be in its own file.

New queries in `queries/persona.sql`, with matching edits to `schemas/persona.sql`:

- **`GetInviteTarget(inviter, invitee)`**: the inviter's privacy, the
  invitee's visibility to the inviter, whether they're the same user, B's
  follow status of A, and the invitation status with `responded_at`.
- **`InvitePersona`**: an upsert that revives `accepted` or `cancelled`
  invitations, or `rejected` ones older than 30 days. A live `pending` row
  and a fresh rejection are left alone. It's `:execrows`, so 0 means nothing
  changed and nothing is published.
- **`RespondToInvitation(inviter, invitee, status)`**: sets `pending` to
  `accepted` or `rejected`, sets `responded_at`, and uses
  `RETURNING persona_id`.
- **`CancelInvitation`**: changes `pending` to `cancelled`.
- **`AcceptFollow`**: inserts or updates the `persona_followers` row to
  `active` with `unfollowed_at = NULL`, even over a `rejected` row. That's
  unlike `FollowPersona`, which leaves a live row alone.
- **`ResolvePersonasForViewer`**: adds
  `OR (t.privacy = 'private' AND EXISTS (pending invitation from t to viewer))`.
- **`CancelInvitationsFrom(persona)`**: cancels every pending invitation
  from the persona and returns the invitees.
- **`GetFollowTarget`** and **`GetPersonaFollowInfo`**: the extra fields
  listed below.

## API

All endpoints are Persona tier, in `followers.Handler` (new file `invitations.go`).

**Inviter A**, where `:persona_id` is B, the same shape as `/follow`:

| Endpoint | Result |
|---|---|
| `POST /persona/:persona_id/invite` | The table above. Errors: 404 for an unseen, own-user or missing B; 400 `cannot_invite` if A isn't private. |
| `POST /persona/:persona_id/uninvite` | Cancels a pending invitation: 200. If there's none: 400 `not_invited`. A rejected one also answers 400 `not_invited`, so A can't tell "rejected" from "never invited". |

**Invitee B**, where `:persona_id` must be B (the acting persona), otherwise
403 `not_your_persona`, as in `requireSelf`:

| Endpoint | Result |
|---|---|
| `POST /persona/:persona_id/invitations/:inviter_id/accept` | 200 `{"status":"active"}`. 404 if there's no pending invitation, or if the inviter is no longer private, or deleted. |
| `POST /persona/:persona_id/invitations/:inviter_id/reject` | 200 `{"status":"rejected"}`. 404 if there's no pending invitation. |

**`GET /persona/:persona_id`** (profile and card) gets three viewer-relative fields:

- `invite_status`: the viewer's invitation to this persona, `null` or
  `"pending"`. A rejection still in its cooldown also reads `pending`.
- `invited_you`: `true` while this persona has a pending invitation to the
  viewer.
- `can_invite`: this is a derived boolean, not stored. It's true when the
  viewer is private, the target is another user's persona, and the
  target doesn't actively follow the viewer. The frontend hides the button
  whenever it's false.

## NATS and notifications

**New event `follow_invitation`.** It's published on the **invitee's**
subject, `STREAM_USER_EVENTS.PERSONA.<B>.follow_invitation.{create|delete}`.
The payload is `{persona_id: A, reason}`, and `actor_id` is whoever acted.
- `create`: reason `invited`.
- `delete`: reason `accepted`, `rejected` or `cancelled`.

It's NATS-only, like the other follow events.

**Accept** also publishes `STREAM_USER_EVENTS.PERSONA.<A>.follower.create`
with the new reason `invited` and payload `persona_id = B`, plus
`follow_counts.update` for A and B.

**`/control`** (`backend/internal/db/redis/handler/persona.go`): the persona's
own subjects gain `follow_invitation.*`, which only the persona itself gets.

**Notifier:**
- `notifier-user` gets the filter subject `PERSONA.*.follow_invitation.*`.
  It must not use `STREAM_USER_EVENTS.>`.
- `follow_invitation.create`: B gets `follow_invitation`. It's personal, the
  subject is `PERSONA` = A, it's single-actor (`actor_id` = A), and the group
  key is `follow_invitation:<A>`, so there's one row per inviter.
- `follow_invitation.delete` (any reason): soft-delete B's row for that
  inviter. `removeSubject` would also remove other personas' rows about A, so
  this adds a small `removeOne(recipient, kind, subjectID)` and the query
  `SoftDeleteNotificationForRecipient`. It only deletes a row whose
  `last_event_at` is older than the event, so a replayed delete can't remove
  a newer invitation.
- `follower.create` with reason `invited`: A gets
  `follow_invitation_accepted`. It's single-actor (B), with subject `PERSONA` = B.
- The existing `ReasonFollowed` case is unchanged. An accepted invitation
  doesn't also produce a `new_follower` row.
- Specs for both kinds go in `notifications.Kinds`. Recount is nil because
  both are single-actor.

## Frontend

- **`PersonaCard` and the profile page**, for A looking at B:
  - When `can_invite` is true, show an "Invite to follow" button.
  - Once invited, it reads "Invited". Clicking it offers "Cancel invitation",
    which calls `/uninvite`.
  - A `following` answer shows a toast saying the follow request was approved.
- **The profile page**, for B looking at A when `invited_you` is true: a
  banner reading "<A> invited you to follow them", with Accept and Decline
  buttons.
  - Accepting needs no warning, because A already sees B (that's a
    precondition of inviting).
  - Both buttons refetch the profile.
- **`describe.ts`**:
  - `follow_invitation`: "invited you to follow them", linking to `/personas/<A>`.
  - `follow_invitation_accepted`: "accepted your invitation", linking to `/personas/<B>`.
- **Realtime**: when the profile page is open on B's side, it refetches on
  B's own `follow_invitation.*` frames. A's side already refetches on
  `follow_counts.update` when the invitation is accepted. A rejection tells A
  nothing, by design.
- `services/persona.ts` gets `invitePersona`, `uninvitePersona`,
  `acceptInvitation` and `rejectInvitation`.

## Out of scope

- A list of received invitations. For now the notification and the profile
  banner are the only way in, and the notification stays until B answers.
  A list can be added as its own ticket.
- Inviting from a search or picker. A invites from a card or profile of a
  persona it has come across.

## Docs

Update the "Persona access" bullets in `CLAUDE.md`, the follow event list in
"The realtime path", and "Follow kinds" in "Notifications".

## Steps

1. Migrations 018 and 019, the schema and queries, then `make generate-models`.
2. Backend: `invitations.go`, the routes, the `ReadPersona` fields, and the `/control` subjects.
3. Notifier: the filter subject, the `follow_invitation` handling, `removeOne`, and the specs in `Kinds`.
4. Frontend: the services, the card and profile buttons, the banner, `describe.ts`, and the realtime refetch.
5. `CLAUDE.md`.

Deploy order: migrations, then the backend and notifier, then the frontend.
The notifier must not start before 019 is applied, because `notifications.Check`
refuses to start until every kind in the database enum has a spec.

## Acceptance

- A private A invites B. While the invitation is pending, B sees A's real
  persona and gets a notification. When B accepts, B is an active follower,
  the counts update live, and A is notified.
- B rejects. A still sees "Invited", and inviting again changes nothing for
  30 days. A is hidden from B again.
- A invites a B that has a pending request to A. The request is approved, B
  gets "accepted your follow request", and no invitation row is created.
- A public or `only_me` A sees no invite button and the endpoint refuses it. A sees no
  invite button on its own user's personas.
- A cancels a pending invitation. B's notification disappears and A can
  invite again at once.
