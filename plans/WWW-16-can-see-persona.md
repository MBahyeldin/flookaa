# WWW-16 — Enforce persona privacy: CanSeePersona and anonymous personas

Branch `WWW-16-can-see-persona`, from `release/caterpie-v1010`. Epic WWW-12
(persona privacy and following).

## Goal

Private and `only_me` personas can do everything a public persona can: join
channels, post, comment, reply, like. Someone who may not see them gets an
**anonymous view** of them: a generated name and avatar instead of the real
ones. One function in `shared/pkg/access` decides which view a viewer gets,
and every place that shows another persona goes through it.

## The rule

| Target's privacy | Sees the real persona | Everyone else |
|---|---|---|
| `public` | everyone | — |
| `private` | the persona itself, its user's other personas, its approved followers | anonymous |
| `only_me` | the persona itself, its user's other personas | anonymous |

"Approved follower" = a `persona_followers` row with `status = 'active'` and
`unfollowed_at IS NULL`.

"Its user's other personas" is only used inside the check, so switching
persona never hides your own personas from you. Never visible in a response
(WWW-15 rule).

## The anonymous view

- **Name**: an adjective, an animal and a number, e.g. "Quiet Otter 37".
- **Avatar**: no thumbnail. The frontend draws a generated avatar (colour and
  icon picked from a hash of the name), so nothing is uploaded or stored.
- **Same within a channel, different across channels.** The name is derived
  from `hash(persona_id, channel_id)`. One person in a thread always reads as
  the same "Quiet Otter 37", and a different name in the next channel.
- **Ids stay real.** `persona_id` / `authorId` are returned unchanged. Someone
  can tell that comments in different channels come from the same persona
  id, but not who it is. No endpoint returns the real name, avatar or profile
  of a persona you can't see, so the id leads nowhere. Because the id is
  already public, the hash needs no secret.
- Everything else that would identify the persona (real first/last name,
  `name` label, thumbnail, bio, slug) is left out of the anonymous view.

## Decided for v1

- **Moderators get no exception.** A private persona asking to join a private
  channel shows up anonymously in the join requests and member list, and
  moderators approve or reject it as "Quiet Otter 37". The goal is to keep
  personas as private as possible. A persona that misbehaves is removed from
  the channel (existing `/members/:persona_id/remove`).
- **Global Administrators get no exception either.**
- Revisit both if moderators can't work this way (e.g. "asking to join
  reveals you to that channel's moderators").

## Where personas show up, and what changes

| Surface | Channel context | In this ticket |
|---|---|---|
| GraphQL `Post.author`, `Comment.author` | the post's channel | yes |
| `GET /channels/:id/members`, `/requests` | the channel | yes |
| Notification actors | the notification's channel scope | no, WWW-22 uses the same function |
| GraphQL `getChannel.owner` | the channel | yes (found while coding; the WWW-15 audit missed it) |
| `GET /channels` `owner_id` | id only, no name | nothing to change |
| WebSocket frames | ids only | nothing to change |

## Changes

1. **Migration 013 `persona_follow_status`**
   - New type `persona_follow_status_enum ('pending', 'active', 'rejected')`.
     Same values as `channel_membership_status_enum`, but its own type: the
     channel name would be confusing on a persona table, and follows may need
     their own values later (e.g. invitations, WWW-35).
   - Add `status persona_follow_status_enum NOT NULL` to `persona_followers`,
     **with no default**: every insert must state the status, so a forgotten
     one is an error instead of a silent approval. The table is empty (no
     follow API yet), so no backfill. If it ever isn't, the migration fails
     instead of guessing. `active` + `unfollowed_at IS NULL` defines
     "approved follower". WWW-20 builds the follow API on it.
   - Down: drop the column, then drop the type.
   - `schemas/persona.sql` updated to match.
2. **Query `ListVisiblePersonas(viewer_id, target_ids[])`** in
   `queries/persona.sql`: for a batch of targets, returns the ids the viewer
   may see (public, self, same user, or approved follower of a private one).
   One query per page of posts or members, not one per author. Then
   `make generate-models`.
3. **`shared/pkg/access/persona.go`**
   - `VisiblePersonas(ctx, q, viewerID, targetIDs) (map[int64]bool, error)`.
   - `AnonymousName(personaID, channelID int64) string`: deterministic, from
     fixed adjective and animal lists plus a 2-digit number.
   - Package doc with the rule table above.
4. **GraphQL authors**: the resolver gets visibility for the page's authors in
   one call. A hidden author becomes `Persona{id, username: <anonymous name>,
   fullName: <anonymous name>, profileImageUrl: null}`. No schema change.
5. **Member and join-request lists**: same treatment. Hidden personas keep
   `persona_id`, so moderators can still approve, reject and remove them, with
   `first_name` = anonymous name, `last_name` / `name` / `thumbnail` empty.
6. **Frontend**: a `GeneratedAvatar` used by the existing avatar fallbacks
   (post card, comment item, moderation sheet), which picks a colour and icon
   from a hash of the name. It applies to every persona without a thumbnail.
7. **CLAUDE.md**: a "Persona access" section next to "Channel access": the
   rule, the anonymous view, and "every response that shows another persona's
   name or avatar goes through `access.VisiblePersonas`".

## Persona cache (added in review)

The Redis cache `persona:<id>:info` (30 min) stored every persona, including
private/only_me bio and slug, and was never invalidated.

8. **Public personas only.** `SetPersonaInfo` skips non-public personas;
   `GetPersonaInfo` treats a cached non-public entry as a miss and deletes it.
9. **A cache hit is public, so it's visible without a query.** GraphQL resolves
   a page's personas with the cache first; only misses go to Postgres, in one
   batched `ResolvePersonasForViewer(viewer_id, ids)` that returns the fields
   and `visible`. Public rows are cached. It replaces `ListVisiblePersonas`,
   so the rule lives in one query. A deleted persona shows anonymously
   instead of failing the page.
10. **`UpdatePersona` evicts the persona's cache entry.** The users handler
    gets the `PersonaStore`.
11. **Member and join-request lists** select `p.privacy` and only check
    non-public personas.

## Out of scope

- Follow / request / invitation API: WWW-20, WWW-34, WWW-35.
- Profile and connected-personas endpoints: WWW-18, WWW-19. A persona you
  can't see is not found there.
- Notification actors: WWW-22.
- An `isAnonymous` flag in GraphQL (would need a schema change, deploy and
  `pnpm codegen`). Can come later if the UI needs an "anonymous" badge.

## Acceptance

- A private persona's post or comment shows its real name to itself, to its
  user's other personas and to approved followers. Everyone else sees one
  anonymous name per channel and a generated avatar.
- An `only_me` persona shows its real name only to itself and its user's
  other personas.
- The same private persona has different anonymous names in two channels.
- Moderators see anonymous names in member and request lists and can still
  approve, reject and remove those personas.
- Public personas look unchanged.
- `make migrate-up` then `make migrate-down` then `make migrate-up` works.
- `go build ./...` and `go vet ./...` pass in `shared/` and `backend/`, and
  `pnpm build` and `pnpm lint` pass. There are no tests in the repo.
