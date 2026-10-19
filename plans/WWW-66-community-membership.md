# WWW-66 — Communities: membership and following (separate)

Branch `WWW-66-community-membership`, from `release-caterpie-v1010`.
Task of epic WWW-56, after WWW-65 (communities). Backend and frontend.

## Goal

- A persona can **follow** a public community and **join** any community, as
  two separate relationships in two tables.
- Public communities are joined at once; private ones take a request that a
  community manager approves or rejects.
- The community page shows member and follower counts, the viewer's own
  Join/Follow state, the member list, and (managers) the request list, all
  live.
- `private` starts meaning something: joining needs approval, and following
  is refused.
- Out of scope: community moderators and rules (WWW-67), channels requesting
  to join (WWW-73), age limits (WWW-68), suggestions (WWW-69), the onboarding
  step (WWW-70), and a home feed (there is none yet; following is recorded
  here so a later feed can read it).

## Decisions

1. **One row per pair**, like `persona_followers`, not a row per stint like
   `channel_members`:
   - `community_members (community_id, persona_id) PK`, `status`
     (`community_membership_status_enum` `pending`/`active`/`rejected`, no
     default, every insert states it), `joined_at`, `resolved_at` (set on
     approve or reject), `left_at`.
     Live member = `status = 'active' AND left_at IS NULL`; pending request =
     `status = 'pending' AND left_at IS NULL`. Joining again after leaving
     revives the row.
   - `community_followers (community_id, persona_id) PK`, `followed_at`,
     `unfollowed_at`. Unfollow is soft; a later follow revives the row.
   - Both `ON DELETE CASCADE` on community and persona; index on
     `persona_id` for "my communities" later (WWW-69/70).
2. **Follow is public only**: following a private community is 400
   `cannot_follow_private`. Following never grants anything; joining never
   follows, and following never joins.
3. **Join**:
   - Public: `active` at once (200 `{status: "active"}`).
   - Private: `pending` (202 `{status: "pending"}`). A repeat answers
     `pending` and changes nothing.
   - A **rejected** request has a **7-day cooldown** from `resolved_at`.
     Inside it, joining again answers `pending` and changes nothing, and the
     viewer's status reads `pending` (the rejection isn't told). After it,
     joining revives the row as a new pending request (or `active` if the
     community has gone public).
   - Already a member: 200 `active`, no change.
4. **Leave** ends an active membership or cancels a pending request (sets
   `left_at`). A rejected row can't be left (400 `not_a_member`), so leaving
   can't clear a rejection. The owner can't leave (400 `owner_cannot_leave`).
5. **The owner is a member**: `communities.Create` inserts the owner's
   `active` membership in the same transaction, and migration 028 backfills
   one for every existing community (seeded ones included). The seeder goes
   through `Create`, so nothing else changes there.
6. **Managers** (`CanManage`: owner or global Administrator; WWW-67 adds
   moderators): list, approve and reject pending requests, list members, and
   remove members (soft, `left_at`; the owner can't be removed, 400
   `owner_cannot_be_removed`). A removed persona may join again (a private
   community makes it a new request). Others get 403 `not_community_manager`.
7. **Who sees the member list**: on a public community every persona; on a
   private one its active members and managers (others 403
   `members_only`). Followers are a count only; there is no follower list
   in this ticket.
8. **Persona visibility**: member and request rows go through
   `access.VisiblePersonas` like channel lists, with non-public personas
   anonymous unless the viewer sees them. The anonymous name gets a new
   per-community key, `access.AnonymousCommunityName(personaID,
   communityID)` (hash of `persona:%d:community:%d`), so it differs from
   the persona's channel names and across communities. Ids stay real.
9. **Privacy changes** (`PATCH /communities/:id`, in one transaction with
   the update):
   - public → private: every active follow ends (`unfollowed_at`), since
     private communities can't be followed. Members stay.
   - private → public: pending requests become active members (joining a
     public community is immediate, so nobody is left waiting). Rejected
     rows stay rejected.
10. **Counts** are recounts, never stored: `members_count` (live members) and
    `followers_count` (live follows, other persona not deleted), on every
    `Community` response (list, by-slug, by-id). Plus, for the viewer:
    `membership_status` (`none`/`pending`/`active`; `rejected` reads
    `pending`) and `following` (bool). `ListCommunities` gains the counts
    and the viewer fields in the same query.
11. **Channel access does not change**: membership in a community never
    grants anything in its channels.
12. **Realtime** (all on `STREAM_CHANNEL_EVENTS.COMMUNITY.<id>.…`, NATS
    only):
    - `member`, `follower`, `join_request` × `create`/`delete`, payload
      `{persona_id, reason}` (reuses `ChannelEventPayload` and the `Reason*`
      values: `joined`, `requested`, `approved`, `rejected`, `cancelled`,
      `left`, `removed`, `followed`, `unfollowed`), `actor_id` = who made
      the change. Same shape as the channel events, for future consumers.
    - `counts.update`, no payload, whenever a member or follower count
      changes.
    - `/control` owner `COMMUNITY`: every persona gets `info`, `channels`,
      `counts`; managers also get `join_request.*`. The page refetches the
      community (counts and the viewer's own status) on `counts`, the member
      list too when it's open, and the request list on `join_request`. A
      requester learns of approval through `counts` (the member count
      changes); a rejection changes nothing they can see, by design.
    - `notifier-channel` filters `STREAM_CHANNEL_EVENTS.CHANNEL.>` since
      WWW-65, so none of this reaches it.
13. **No notifications** in this ticket (no new kinds). If you want
    "request approved" or "new join request" notifications, that's a
    follow-up ticket with its own kinds.

## Backend

### Migration `028_community_membership`

- `community_membership_status_enum`, `community_members`,
  `community_followers`, indexes; backfill the owner memberships.
- Down drops both tables and the enum.
- `schemas/community.sql` updated to match.

### SQL (`queries/community.sql`, then `make generate-models`)

- `GetCommunityAccess` gains `is_member`, `membership_status` (raw row
  status or NULL), `is_following`.
- `JoinCommunity(community_id, persona_id, status)`: upsert that revives a
  left row or a rejection older than 7 days, and never touches an `active`
  live row or a recent rejection (`ON CONFLICT … DO UPDATE … WHERE`).
- `LeaveCommunity`, `RemoveCommunityMember` (both `:execrows`).
- `FollowCommunity` (upsert reviving `unfollowed_at`), `UnfollowCommunity`.
- `ListCommunityJoinRequests`, `ResolveCommunityJoinRequest(status)`,
  `ListCommunityMembers(limit, offset)` with `is_owner`, persona fields and
  `privacy`.
- `EndCommunityFollows(community_id)`,
  `ApproveAllCommunityJoinRequests(community_id)` for decision 9.
- Counts and viewer fields added to `GetCommunityByID`, `GetCommunityBySlug`,
  `ListCommunities` (`viewer_id` arg).

### REST (`/api/v1/communities`, persona tier)

| Method | Path | Answer |
|---|---|---|
| POST | `/:community_id/join` | 200 `{status: "active"}` / 202 `{status: "pending"}` |
| POST | `/:community_id/leave` | 200; 400 `not_a_member` / `owner_cannot_leave` |
| POST | `/:community_id/follow` | 200 `{following: true}`; 400 `cannot_follow_private` |
| POST | `/:community_id/unfollow` | 200 `{following: false}` (no-op if not following) |
| GET | `/:community_id/members?limit=&offset=` | `{members: [{persona_id, first_name, last_name, thumbnail, anonymous, is_owner, joined_at}]}`; 403 `members_only` |
| POST | `/:community_id/members/:persona_id/remove` | managers |
| GET | `/:community_id/requests` | managers; `{requests: [{persona_id, …, requested_at}]}` |
| POST | `/:community_id/requests/:persona_id/approve` / `reject` | managers; 404 when no pending request |

All 404 on a missing or deleted community.

### Code

- `handlers/communities/`: `membership.go` (join, leave, follow, unfollow),
  `members.go` (list, remove), `requests.go`, `events.go` (`publish`,
  `publishCounts`).
- `communities.Create` adds the owner membership; `update.go` applies
  decision 9 in its transaction.
- `access/community.go`: `IsMember`, `MembershipStatus`, `CanSeeMembers`;
  `access/persona.go`: `AnonymousCommunityName`.
- `shared/external/db/nats/communityEvents.go`: `EventCommunityCounts`.
- `/control` `community` case: `counts` for everyone, `join_request.*` for
  managers.

## Frontend

- `types/community.ts`: counts, `membership_status`, `following`;
  `services/communities.ts`: the new calls.
- Community page header: member and follower counts, **Join** (or
  "Request to join" on private; "Requested" with cancel when pending;
  "Joined" with a leave confirm when active; owners see no leave) and
  **Follow / Following** (hidden on private communities, per hide-inactive
  rule). Counts open a **Members** sheet (members list with `PersonaLink`,
  managers get Remove with a confirm); managers get a **Requests** tab with
  Approve/Reject, badge with the pending count.
- `CommunityCard`: member count next to the channel count.
- Live updates per decision 12.

## Docs

- `CLAUDE.md` Communities section: the two tables and their rules, privacy
  effects, who sees members, the events and what `/control` serves.

## Order and deploy

1. Migration, schema, queries, `make generate-models`.
2. Backend handlers, access, `/control`.
3. Frontend.
4. Deploy: migration 028, backend, frontend.

## Verification

- `go build ./...` / `go vet ./...` in `shared` and `backend`; `pnpm build`
  and `pnpm lint` in `front-end`. There are no tests.
- On dev, two browsers:
  - public: join, leave, follow, unfollow; counts update live in the other
    browser; owner can't leave.
  - private: follow refused and hidden; join → pending; manager sees the
    request live, approves → requester's page turns "Joined" live; reject →
    requester still reads "Requested", re-join changes nothing; with
    `resolved_at` moved back 8 days in SQL, re-join files a new request.
  - member list: a private persona shows its anonymous community name to a
    stranger, the real one to a follower of it; non-member of a private
    community gets 403.
  - remove a member, they rejoin; switch public → private ends follows,
    private → public admits pending requests.
  - a community channel's access is unchanged by community membership.

## Implementation notes

- Counts and viewer fields come from one batched `ListCommunityStats` per
  page rather than extra columns on the three community queries.
- The owner membership is a CTE in `CreateCommunity`, so the handler and the
  seeder both get it without a separate call.
- Cancelling a rejected request hides the row (status `none`); re-asking
  inside the cooldown brings the same rejection back unchanged, so the
  requester sees "Requested" again and nothing else changes.
- Single-community responses add `is_owner` (hides Leave for the owner).
- `PersonRow` moved from the channel `ModerationSheet` to
  `components/persona-link/PersonRow.tsx`, shared with the community sheet.

## Amendment (2026-10-19, in review)

- A private community's channel list on its page is for active members and
  managers, the same rule as its member list (`access.Community.CanSeeInside`,
  renamed from `CanSeeMembers`). `GET /channels/?community_id=` answers 403
  `members_only` to anyone else, and the page shows a locked block with the
  Join button instead of the grid, refetching once the viewer joins.
- Nothing else is hidden: the channels stay in the general `/channels` list
  with their "Part of" link, `channels_count` stays on the card, and each
  channel's own visibility decides who can open it.

## Settled

- Rejected requests: re-ask after a cooldown (7 days).
- Private member list: active members and managers.
- private → public: pending requests are approved automatically.
