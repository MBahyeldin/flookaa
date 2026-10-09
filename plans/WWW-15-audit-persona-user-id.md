# WWW-15 — Audit API responses that expose user_id alongside a persona

Branch `WWW-15-audit-persona-user-id`, from `release/caterpie-v1010`. Epic WWW-12
(persona privacy and following).

## Goal

Another persona must not be able to learn which user owns a persona, or that
two personas belong to the same user. This ticket finds what the API leaks
today and removes it. Visibility rules (who may see a private / only_me
persona at all) are WWW-16, not this ticket.

## Audit

Every route, the GraphQL schema, the `/control` reply, NATS payloads, the Redis
persona cache and the upload URLs were checked for `user_id` and for anything
that links personas to each other.

### Responses about *your own* account (fine)

Returned only to the logged-in user, so they can carry `user_id`:

| Endpoint | Fields |
|---|---|
| `GET /auth/info` | user `id`, name, email |
| `GET /users/profile`, `PATCH /users/profile` | user `id`, profile, location |
| `GET /persona/list`, `/persona/current`, `/persona/update/:id` | your own personas, `is_default`, `privacy`, `name` |
| `jwt` cookie | `user_id`, `persona_id` |

### Responses about *other* personas

| Where | Persona fields returned | `user_id`? | Other link? |
|---|---|---|---|
| GraphQL `Post.author`, `Comment.author` (`resolvePersonaCached`) | `id`, full name, thumbnail | no | no |
| `GET /channels/:id/members` | `persona_id`, `name`, first/last name, thumbnail | no | no |
| `GET /channels/:id/requests` | `persona_id`, `name`, first/last name, thumbnail | no | no |
| `GET /notifications` (`latest_actor`, `ResolvePersonaByID`) | `id`, first/last name, thumbnail | no | no |
| `GET /channels` | `owner_id` (a persona id) | no | no (existence of a hidden owner is WWW-16) |
| `/control` reply, NATS payloads | persona ids only | no | no |
| Redis `persona:<id>` cache | `ResolvePersonaByIDRow` (no `user_id`) | no | no |
| Upload URLs (`s3`) | `/files/<uuid>` | no | no (random UUID, not content hash) |

**Result: no response sends `user_id` to another persona.** One loose end:
**dead code that reads `user_id` in GraphQL**. `getUserIdFromContext` in
`shared/pkg/graph/resolvers/resolver.go` has no callers. Removing it keeps
GraphQL persona-only.

### Decided

- **A persona's `name` is not private.** Anyone who can see the persona (it is
  public, or they have access to it) may see its name. Hiding it, like every
  other field, for personas you can't see is WWW-16.
- **The default persona is "you", and editable.** The `create_default_persona`
  trigger (migration 003) creates it from the user's real first/last name and
  thumbnail, public, with slug `firstname-lastname`; the user can change all
  of it. Reusing your real name or photo on another persona links the two by
  your own choice. Slugs are unique per user, not globally, so they don't
  identify a user.

## Changes

1. **Remove `getUserIdFromContext`** from the GraphQL resolvers.
2. **Write the rule down** in CLAUDE.md, under "Auth": a response about
   another persona never carries `user_id`, `is_default`, or any other field
   that ties it to the account or to the user's other personas.

No migration, no query or GraphQL schema change, no regeneration.

## Out of scope

- Hiding private / only_me personas and their ids (`owner_id`, actors,
  authors, members): WWW-16.
- Opt-in links between public personas: WWW-17 / WWW-18.

## Acceptance

- `grep -rn "user_id" shared/pkg/graph/resolvers` finds nothing.
- CLAUDE.md states the rule.
- `go build ./...` and `go vet ./...` pass in `shared/` and `backend/`. There
  are no tests in the repo.
