# WWW-73 — Communities: channels request to join a community

Branch `WWW-73-community-channel-requests`, from `release-caterpie-v1010`.
Task of epic WWW-56, after WWW-67 (moderators). Backend, notifier and frontend.

## Goal

- An existing channel can ask to join a community; the community's managers
  approve or reject. Nothing appears in a community without a manager's
  approval.
- Example: Alice creates a Nuxt.js channel, opens the Web Development
  community, picks "Suggest this channel"; a manager approves it.
- Out of scope: age limits (WWW-68), suggestions (WWW-69), moving a channel
  between communities in one step, and any access inherited either way.

## Decisions

1. **Who requests**: anyone passing the channel's `CanModerate` (owner,
   channel moderators, global Administrators). Community membership isn't
   needed; any community (public or private) can be asked.
2. **Who decides**: the community's `CanManage` (owner, community moderators,
   global Administrators).
3. **`community_channels` becomes one row per pair** (a channel's history with
   each community), PK `(community_id, channel_id)` replacing
   `UNIQUE channel_id`, plus:
   - `status community_channel_status_enum` (`pending`/`active`/`rejected`,
     no default; existing rows migrate as `active`),
   - `requested_by` (persona, NULL for rows created directly by a manager or
     the seeder), `resolved_at`, `removed_at` (soft),
   - a partial unique index on `channel_id WHERE status IN ('pending','active')
     AND removed_at IS NULL`: a channel has **at most one live row**, so it's
     in one community or has one pending request, never both. To go elsewhere
     it leaves (or cancels) first (409 `channel_in_community` /
     `channel_request_pending`).
4. **Rejection**: told to the requester (notification + status on the manage
   sheet). For 30 days from `resolved_at` asking the same community again is
   409 `recently_rejected`; after that it revives the row as `pending`.
   Another community can be asked at once.
5. **Cancel**: the channel's moderators can cancel a pending request (row
   soft-removed, no cooldown).
6. **Leaving / removal** (soft, `removed_at`): the channel's moderators can
   take it out (reason `left`); community managers can remove it (reason
   `removed`). Either may ask again later (removal has no cooldown).
7. **Creating a channel "in" a community** (`community_id` on
   `POST /channels/create`): a manager's channel goes in directly (unchanged);
   anyone else's is created standalone with a pending request in the same
   transaction (was 403 `not_community_manager`). The response carries
   `community_status: active|pending`.
8. **Every "is in the community" read** (`channels_count`, `GET
   /channels/?community_id=`, `ListChannelCommunities` → list items' and
   GraphQL `Channel.community`, seeder's `GetCommunityChannelIDByName`)
   filters `status = 'active' AND removed_at IS NULL`. `AddChannelToCommunity`
   inserts `active` (manager create, seeder).
9. **Channel access unchanged**: nothing here reads or grants membership on
   either side.
10. **Notifications** (personal, no scope):
    - `channel_request` → each community manager (owner + live moderators;
      not global Administrators, same as channel `join_request`), subject
      `COMMUNITY` (new subject value), aggregated per community and recounted
      from pending rows; the recount returns zero for a recipient who is no
      longer a manager, so the row disappears. Removed once nothing is pending.
    - `channel_request_approved` / `channel_request_rejected` → the
      `requested_by` persona, single actor (the deciding manager), subject
      `COMMUNITY`, `data.channel_id` (new `Data` field; fixed for the row's
      life).
    - Cancel, leave and remove notify nobody.
11. **Realtime** (NATS only):
    - `STREAM_CHANNEL_EVENTS.COMMUNITY.<id>.channel_request` × `create`/`delete`,
      payload `{channel_id, reason}` (`requested`, `approved`, `rejected`,
      `cancelled`), `actor_id` = who acted. `/control` serves it to managers
      only, like `join_request.*`.
    - Approve, leave, remove also publish the existing `…channels.update`
      (the page's channel grid and count refetch).
    - `STREAM_CHANNEL_EVENTS.CHANNEL.<id>.community.update` (no payload) on
      every change to the channel's row, so its manage sheet and page
      (community badge) refetch. `/control` serves it with the channel's
      other events.
    - `notifier-channel` gains the filter
      `STREAM_CHANNEL_EVENTS.COMMUNITY.*.channel_request.*` (it already uses
      `CreateOrUpdateConsumer`, so the existing durable is updated in place).

## Backend

### Migration `030_community_channel_requests`

- Enum, columns, PK swap, partial unique index, backfill `status = 'active'`.
- Notification enums: kinds `channel_request`, `channel_request_approved`,
  `channel_request_rejected`; subject `COMMUNITY`. Separate migration
  `031_channel_request_kinds` because `ALTER TYPE … ADD VALUE` can't share a
  transaction with uses of the value.
- Down files restore the old table shape (dropping non-active rows) and
  recreate the enums without the new values, as 015/016/019 do.
- `schemas/community.sql` and the notifications schema updated.

### SQL (then `make generate-models`)

- `community.sql`: `RequestCommunityChannel` (upsert: revive a
  removed/expired-rejected row or insert `pending`; returns the row or no row
  when a live row exists or the cooldown applies; the handler tells which with
  `GetChannelCommunityState`), `CancelCommunityChannelRequest`,
  `ResolveCommunityChannelRequest` (approve/reject, `:one`, pending only),
  `RemoveCommunityChannel` (`:execrows`), `ListCommunityChannelRequests`
  (channel fields + `requested_at`), `GetChannelCommunityState(channel_id)`
  (live row and the latest rejection per community, for the manage sheet),
  the `active`/`removed_at` filters from decision 8.
- `channel.sql`: `ListModeratedChannels(persona_id)` with each channel's live
  community row, for the suggest picker.
- `notification.sql`: `RecountPendingChannelRequests(community_ids,
  recipient_id)`, `ListCommunityManagerIDs(community_id)`.

### REST (persona tier)

| Method | Path | Who | Answer |
|---|---|---|---|
| POST | `/communities/:id/channels/:channel_id/request` | channel `CanModerate` | 202 `pending`; 409 `channel_in_community` / `channel_request_pending` / `recently_rejected` |
| POST | `/communities/:id/channels/:channel_id/cancel` | channel `CanModerate` | 200; 404 nothing pending |
| POST | `/communities/:id/channels/:channel_id/remove` | `CanManage` or channel `CanModerate` | 200; 404 not in it |
| GET | `/communities/:id/channel-requests` | `CanManage` | rows |
| POST | `/communities/:id/channel-requests/:channel_id/{approve\|reject}` | `CanManage` | 200; 404 nothing pending |
| GET | `/channels/:channel_id/community` | channel `CanModerate` | `{community, status, rejected_until?}` |
| GET | `/channels/moderated` | any persona | channels it moderates + live community status |

Channel 404 for non-readers (existing rule), 403 `not_moderator` /
`not_community_manager` otherwise.

### Code

- `handlers/communities/channels.go` (request, cancel, remove, list,
  approve, reject) using both `access.LoadChannel` and `access.LoadCommunity`.
- `handlers/channels/create.go`: non-manager path (decision 7);
  `handlers/channels/community.go` (`GET …/community`, `GET /moderated`).
- `nats`: `EventChannelRequest`, `EventChannelCommunity`,
  `CommunityChannelPayload{ChannelID, Reason}`.
- `/control`: `channel_request.*` for community managers; `community.update`
  for channel subscribers.
- `shared/pkg/notifications`: three specs, `Data.ChannelID`.
- `notifier/internal/community.go`: the handler; `worker.go`: the filter.
- `notifications.Handler`: `COMMUNITY` subjects look up community summaries
  per page (like `ListChannelSummaries`) for names in the list.

## Frontend

- `types/community.ts` / `services/communities.ts`: the endpoints above.
- Community page: **"Suggest a channel"** button for any persona that
  moderates at least one channel not already in a community (hidden
  otherwise); it opens a picker of `GET /channels/moderated` with each
  channel's status (in another community / pending / pick).
- `MembersSheet`: Requests tab gets a **Channels** section (or the sheet a
  "Channel requests" tab) for managers, with approve/reject; live on
  `channel_request.*`.
- Community channel grid: a "Remove from community" item for managers.
- Channel `ModerationSheet`: a **Community** tab showing the status (in X /
  pending at X with Cancel / rejected by X until date / none), with "Leave
  community"; refetches on `community.update`.
- Create channel in a community as a non-manager: after create, a toast
  "Request sent to <community>".
- `components/notifications/describe.ts`: the three kinds (request links to
  the community page with the requests sheet open; approved/rejected link to
  the community).

## Docs

- `CLAUDE.md` Communities: request flow, statuses, live-row rule, cooldown,
  events, new kinds; Notifications: `COMMUNITY` subject and the notifier
  filter.

## Order and deploy

1. Migrations 030/031, schemas, queries, `make generate-models`.
2. Backend, notifier.
3. Frontend.
4. Deploy: migrations, backend, notifier, frontend.

## Verification

- `go build ./...` / `go vet ./...` in `shared`, `backend`, `notifier`;
  `pnpm build` and `pnpm lint`. There are no tests.
- On dev, community owner + channel owner + stranger browsers:
  - channel owner suggests a channel: managers get the notification and the
    request live; approve → channel appears in the grid and count live,
    requester notified, manage sheet shows "in X".
  - reject → requester notified; asking again is 409 for 30 days; another
    community can be asked.
  - a channel in a community or with a pending request can't ask elsewhere.
  - cancel, leave, remove: grid/sheet update live, no notifications.
  - non-manager creates a channel "in" a community: standalone + pending.
  - a moderator demoted while a request is pending: its notification
    disappears.
  - a stranger (not a channel moderator) gets 403 on every channel-side call.

## Open questions

- Should a private community accept suggestions from non-members? (Plan: yes,
  managers filter.)
- Rejection is told to the requester (ticket says so), unlike community join
  requests. Keep?

## Settled

- Private communities accept suggestions from non-members; managers filter.
- The requester is told about a rejection.

## Implementation notes

- The request logic lives in `communities.RequestChannel` (pre-check of the
  live row for the 409 codes; a unique violation from a race also answers
  `channel_request_pending`). `channels` imports `communities`, so the
  channel-request handlers sit in `communities/channels.go`.
- Managers review channel requests in a third **Channels** tab of
  `MembersSheet`; the page shows "n channels want to join" and
  `?members=channels|requests|members` opens the sheet on that tab (the
  `channel_request` notification links there).
- "Suggest a channel" shows only when the viewer moderates a channel that's
  free or waiting on this community; the dialog also links to creating a new
  channel for the community.
- The channel page's "Part of …" badge follows `community.update` through a
  small `GetChannelCommunity` query fetched with `no-cache`, so the posts
  query and its paging aren't touched.
- A channel request notification's actor is shown with the personal
  anonymous key (0), not a channel's.
