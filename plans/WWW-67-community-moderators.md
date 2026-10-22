# WWW-67 — Communities: moderators and rules

Branch `WWW-67-community-moderators`, from `release-caterpie-v1010`.
Task of epic WWW-56, after WWW-66 (membership). Backend and frontend.

## Goal

- A community has an owner and **moderators** (personas). The owner (or a
  global Administrator) appoints and removes them.
- Moderators run the day-to-day: approve/reject join requests, remove members,
  edit the community's info, interests and **rules**.
- `rules`: plain text shown on the community page and before joining.
- Out of scope: channels requesting to join (WWW-73), age limits (WWW-68),
  suggestions (WWW-69), notifications for appointments, and any permission
  inherited onto channels.

## Decisions

1. **Table `community_roles`**, mirroring `channel_roles`:
   `(community_id, persona_id, role_id) PK`, `deleted_at`, `updated_at`,
   `ON DELETE CASCADE` on all three, reusing the existing `roles` row
   `moderator`. Soft delete; appointing again revives the row. The owner gets
   no role row: ownership is `communities.owner_id`.
2. **Who's who** (`access.Community`):
   - `IsModerator`: a live `moderator` role **and** a live active membership.
   - `CanManage` = owner, moderator, or global Administrator (was owner or
     admin). Everything WWW-65/66 gated on `CanManage` now includes
     moderators: info/interests/rules edit, join requests, member list and
     removal, creating channels in the community.
   - New `CanOwn` = owner or global Administrator. Only it may appoint or
     remove moderators and change **visibility** (a privacy flip ends every
     follow or admits every request, so it stays with the owner). A moderator
     sending `visibility` gets 403 `not_community_owner`.
3. **Appointing** (`CanOwn`): `POST /communities/:id/moderators/:persona_id`.
   The target must be a live active member (400 `not_a_member`), not the owner
   (400 `owner_is_owner`). Already a moderator: 200, no change.
4. **Removing a moderator**: `POST /communities/:id/moderators/:persona_id/remove`,
   by `CanOwn`, or by the moderator itself (stepping down). It ends the role,
   not the membership. Not a moderator: 404.
5. **Moderators vs moderators**: a moderator can't remove another moderator
   from the community (403 `not_community_owner`); only `CanOwn` can. Nobody
   can remove the owner (unchanged).
6. **Leaving or being removed ends the persona's community roles**, in the same
   statement path as channels (`RevokeCommunityRolesForPersona` after
   `LeaveCommunity` / `RemoveCommunityMember`).
7. **No inheritance**: community moderators get nothing in the community's
   channels; `access.Channel.CanModerate` doesn't read `community_roles`.
8. **Rules**: `communities.rules TEXT NOT NULL DEFAULT ''`, up to 5000
   characters (400 `invalid_rules`), trimmed, plain text with line breaks kept
   (no markdown). Set on create (optional) and `PATCH`. Returned on every
   community response (list items too, so the join dialog needs no fetch).
9. **Join shows the rules**: on a community with non-empty rules, Join /
   Request to join opens a dialog with the rules and "Agree and join"
   (or "Agree and request"). No server-side acceptance record; the dialog is
   UI only.
10. **Member list** rows gain `is_moderator`; the list orders owner,
    moderators, then members by join date. Single-community responses gain
    `is_moderator` and `can_own` for the viewer.
11. **Realtime** (`STREAM_CHANNEL_EVENTS.COMMUNITY.<id>.…`, NATS only):
    - `moderator` × `create`/`delete`, payload `{persona_id, reason}`
      (reasons `appointed`, `removed`, `stepped_down`, `left`), `actor_id` =
      who made the change. `/control` serves `moderator.*` to every persona
      (it changes the member list badges, which everyone allowed to see the
      list may see).
    - Rules changes publish the existing `info.update`.
    - The page refetches the community on `moderator.*` (the viewer's
      `can_manage` may have changed, so the Requests tab and Manage button
      appear or disappear live), and the member list when it's open.
    - `/control` already decides `join_request.*` by `CanManage`, so a new
      moderator gets it on its next subscribe; the page resubscribes on
      `moderator.*` for itself.

## Backend

### Migration `029_community_moderators`

- `community_roles` table + index on `persona_id`; `communities.rules`.
- Down drops both. `schemas/community.sql` updated.

### SQL (`queries/community.sql`, then `make generate-models`)

- `GetCommunityAccess`: `is_moderator`, `can_own`; `can_manage` adds the
  moderator clause.
- `AssignCommunityModerator` (upsert reviving `deleted_at`, only when a live
  active membership exists; `:execrows`), `RemoveCommunityModerator`
  (`:execrows`), `RevokeCommunityRolesForPersona`.
- `ListCommunityMembers`: `is_moderator`, new order.
- `CreateCommunity` / `UpdateCommunity`: `rules`.

### REST (persona tier)

| Method | Path | Who | Answer |
|---|---|---|---|
| POST | `/communities/:id/moderators/:persona_id` | `CanOwn` | 200; 400 `not_a_member` / `owner_is_owner` |
| POST | `/communities/:id/moderators/:persona_id/remove` | `CanOwn` or self | 200; 404 not a moderator |
| PATCH | `/communities/:id` | `CanManage`; `visibility` needs `CanOwn` | gains `rules` |

Others get 403 `not_community_owner`. All 404 on a missing community.

### Code

- `handlers/communities/moderators.go` (appoint, remove); `members.go` and
  `membership.go` revoke roles on remove/leave and publish `moderator.delete`
  when one was held; `update.go` validates `rules` and the visibility gate.
- `access/community.go`: `IsModerator`, `CanOwn`.
- `nats`: `EventModerator`, reasons `appointed`, `stepped_down`.
- `/control` `community` case: `moderator` for everyone.

## Frontend

- `types/community.ts`: `rules`, `is_moderator`, `can_own`, member
  `is_moderator`; `services/communities.ts`: appoint/remove.
- Community page: a **Rules** section under the description (hidden when
  empty, `whitespace-pre-line`); Join goes through `RulesDialog` when rules
  exist.
- `CommunityForm` (create and manage): a Rules textarea with a counter.
  Visibility control only rendered for `can_own` (hide-inactive rule).
- `MembersSheet`: a "Moderator" badge; for `can_own`, a row action "Make
  moderator" / "Remove moderator"; Remove member hidden on moderator rows
  for a non-owner; a moderator sees "Step down" on its own row.

## Docs

- `CLAUDE.md` Communities: `community_roles`, `CanManage` vs `CanOwn`, rules,
  `moderator.*` events, "no inheritance onto channels".

## Order and deploy

1. Migration, schema, queries, `make generate-models`.
2. Backend.
3. Frontend.
4. Deploy: migration 029, backend, frontend.

## Verification

- `go build ./...` / `go vet ./...` in `shared` and `backend`; `pnpm build`
  and `pnpm lint`. There are no tests.
- On dev, owner + member + stranger browsers:
  - owner appoints a member: badge appears live; the moderator's page grows
    Manage and Requests live; appointing a non-member is 400.
  - moderator approves a request, removes a plain member, edits rules; can't
    change visibility (control hidden; API 403); can't remove another
    moderator or the owner.
  - moderator steps down / leaves / is removed: role ends, badge goes live.
  - rules show on the page and in the join dialog; empty rules join directly.
  - the moderator has no extra powers in a community channel.

## Settled

- Moderators can create channels in the community.
- Visibility is owner/admin only.
- Moderators can't remove each other.

## Implementation notes

- `GetCommunityAccess` returns `is_moderator` and `is_admin`; `CanManage()`
  and `CanOwn()` are methods on `access.Community`, so the rules live in Go
  in one place.
- Member row actions (make/remove moderator, step down, remove from
  community) sit in a "⋯" menu per row, rendered only when the viewer has at
  least one action on that row.
- A moderator's create/edit form doesn't render the Visibility field; the API
  refuses a visibility change from a moderator anyway (403
  `not_community_owner`), and accepts an unchanged value.
