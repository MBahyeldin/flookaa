# WWW-74 — Communities: notifications for join requests and their answers

Branch `WWW-74-community-join-notifications`, from `release-caterpie-v1010`.
Task of epic WWW-56, after WWW-73. Backend, notifier and frontend.

## Goal

- Asking to join a private community notifies its managers.
- Approving or rejecting the request notifies the persona that asked.
- Out of scope: notifications for public joins, leaves, removals, follows,
  moderator appointments, and channel join requests (they already notify).

## Decisions

1. **Three kinds**, all personal (no scope), subject `COMMUNITY` (added in
   WWW-73), so the text shows the community's name, looked up at read time:
   - `community_join_request` → each manager (owner + live moderators,
     `ListCommunityManagerIDs`; not global Administrators, as for channels).
     Aggregated per community, recounted from pending `community_members`
     rows. A recipient that no longer manages the community recounts to
     zero, so its row stops showing. Removed once nothing is pending.
   - `community_request_approved` → the requester, single actor (the
     approving manager).
   - `community_request_rejected` → the requester, single actor.
2. **Source events** (already published since WWW-66, on
   `STREAM_CHANNEL_EVENTS.COMMUNITY.<id>`): `join_request.create` (reason
   `requested`) notifies managers; `join_request.delete` recounts and, for
   reasons `approved` / `rejected`, notifies `payload.persona_id`. A community
   going public admits every pending request with reason `approved`, so those
   requesters get "approved" too. Cancelled requests notify nobody.
   `notifier-channel` gains the filter
   `STREAM_CHANNEL_EVENTS.COMMUNITY.*.join_request.*`; the community handler
   dispatches by event name, since `join_request` carries a
   `ChannelEventPayload` and `channel_request` a `CommunityChannelPayload`.
3. **Rejections are told** (reverses WWW-66's silent rejection), so the page
   stops pretending:
   - `membership_status` gains `rejected` while the 7-day cooldown runs
     (from `resolved_at`), and single-community responses add
     `rejected_until`. After the cooldown it reads `none`.
   - Joining inside the cooldown answers 409 `recently_rejected` and changes
     nothing (today it answers `pending`). After it, joining files a new
     request as today.
   - Cancelling a rejection is no longer offered (nothing to cancel); the
     endpoint keeps working for old clients.
4. **Anonymous actors** in these kinds are named with
   `access.AnonymousCommunityName(persona, community)`, the same name the
   manager sees in the request list (not the channel/personal name).
5. **Live page update for the requester**: the requester can't subscribe to
   `join_request.*` (managers only, it names personas). Approval already
   arrives through `counts`; for rejection the community page refetches
   itself when a notification arrives while the viewer's status is
   `pending` (from the existing default WS subscription).

## Backend

### Migration `032_community_join_notification_kinds`

- `ALTER TYPE notification_kind_enum ADD VALUE` × 3. Down rebuilds the enum
  without them (keeping 031's values). `schemas/notification.sql` updated.

### SQL (then `make generate-models`)

- `notification.sql`: `RecountPendingCommunityJoinRequests(community_ids,
  recipient_id)` (only communities the recipient manages; latest requester as
  actor; deleted personas left out).
- `community.sql`: `GetCommunityAccess` and `ListCommunityStats` return the
  membership row's `resolved_at` (for the cooldown).

### Code

- `shared/pkg/notifications`: three specs.
- `shared/pkg/access`: `MembershipStatus(status, resolvedAt)` → `none` /
  `pending` / `active` / `rejected`; `RejectedUntil`.
- `communities/membership.go`: 409 `recently_rejected` inside the cooldown;
  `Community` responses carry `rejected_until`.
- `notifier/internal/community.go`: `join_request` handling; `worker.go`
  filter.
- `notifications/actors.go` + `list.go`: community-keyed anonymous names for
  community kinds.

## Frontend

- `types/community.ts`: `membership_status` gains `rejected`;
  `rejected_until`.
- Community page: for `rejected`, a disabled "Request declined" button and
  "You can ask again on <date>" in place of Join; the private-channels
  placeholder shows the same line.
- Refetch on a new notification while pending (decision 5).
- `describe.ts`: "X asked to join <community>" (`?members=requests`), "Your
  request to join <community> was approved", "Your request to join
  <community> was declined".
- `types/notification.ts`: the kinds.

## Docs

- `CLAUDE.md` Communities: rejection is told, `rejected` status, 409
  `recently_rejected`; Notifications: the kinds and the notifier filter.

## Order and deploy

1. Migration, schema, queries, `make generate-models`.
2. Backend, notifier.
3. Frontend.
4. Deploy: migration 032, backend, **notifier**, frontend.

## Verification

- `go build ./...` / `go vet ./...` in `shared`, `backend`, `notifier`;
  `pnpm build` and `pnpm lint`. There are no tests.
- On dev, owner + moderator + requester browsers, private community:
  - request → owner and moderator get "X asked to join <community>" live;
    two requests group into one row; the link opens the Requests tab.
  - approve → requester gets "approved", page turns to Joined live; the
    managers' row disappears once nothing is pending.
  - reject → requester gets "declined", page shows "Request declined" live;
    joining again is 409 until 7 days pass.
  - cancel → managers' row goes away, nobody notified.
  - going public with pending requests → each requester gets "approved".
  - a demoted moderator no longer sees the request notification.

## Open questions

- Should global Administrators also get join-request notifications? (Plan:
  no, matching channels; they can still open any Requests tab.)

## Settled

- Global Administrators don't get join-request notifications.

## Implementation notes

- The rejected state is computed in Go (`access.RejectedUntil` /
  `MembershipStatus`) from the membership row's `resolved_at`, now returned by
  `GetCommunityAccess` and `ListCommunityStats`; `rejected_until` is on list
  items too.
- A cancelled rejection (possible from old clients) still comes back as a
  rejection inside the cooldown, so joining answers 409 there too.
- Community-keyed anonymous actor names apply to every `COMMUNITY`-subject
  kind, so WWW-73's channel-request actors switched from the personal name to
  the community one.
- The notifier's community handler dispatches by event name and shares
  `notifyManagers` between channel and join requests.
- The page's live refresh for a requester uses `NotificationStore.version`
  (bumped on every notifications frame) while its status is `pending`.
