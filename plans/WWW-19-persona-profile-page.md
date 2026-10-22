# WWW-19 — Persona profile page with connected personas

Branch `WWW-19-persona-profile-page`, from `release-caterpie-v1010`. Epic
WWW-12 (persona privacy and following).

## Goal

A page at `/personas/:id` that shows a persona (avatar, name, `@slug`, bio)
and its connected personas from WWW-18. A persona the viewer only sees
anonymously has no page: the viewer gets "Persona not found".

## The rule

There is no endpoint yet for one persona's own fields; WWW-18 left the
profile header to this ticket. Add it, with the same visibility rule as
`/connected`:

`GET /api/v1/persona/:persona_id` (Persona tier, the viewer is
`auth.PersonaID(c)`):

- **404** `{"error":"persona not found"}` when the persona doesn't exist, is
  deleted, or is not visible to the viewer.
- **200** `{"id", "first_name", "last_name", "slug", "thumbnail", "bio"}`
  otherwise. Never `user_id`, `is_default`, `show_on_profile`, `privacy`,
  `name` or `description`: `name` is the owner's label for the persona
  ("Work"), account data like the others (WWW-15 rule). The display name is
  `first_name last_name`, as GraphQL authors already use.

It runs the existing `ResolvePersonasForViewer` for one id, which returns the
fields and `visible` in one query, so no new SQL.

The page shows the same view to everyone, the owner included. Account
settings stay in the persona manager.

## Changes

1. **Backend**
   - `users.Handler.ReadPersona` in
     `backend/internal/db/postgres/handlers/users/persona.go`: parse
     `:persona_id` (400 on a bad id), call `ResolvePersonasForViewer`, 404
     when no row or `!visible`, else respond with the fields above.
   - Route: `viewGroup.GET("", users.ReadPersona)` in
     `backend/cmd/server/api/v1/persona.go`, next to `/connected`. Gin 1.10
     resolves the static `GET /persona/list` and `/current` before the param.
2. **Frontend**
   - `types/persona.ts`: `PublicPersona` = `{id, first_name, last_name, slug,
     thumbnail?, bio?}`.
   - `services/persona.ts`: `fetchPersonaProfile(id)` returning the persona,
     `"not_found"` on 404, or `null` on any other failure;
     `fetchConnectedPersonas(id)` returning `PublicPersona[]`.
   - `pages/(dashboard)/personas/[id]/index.tsx`, route `/personas/:id` in
     `routes/AppRouter.tsx`:
     - Loads both calls in parallel. Reloads when `:id` changes or the
       current persona changes, since visibility depends on the viewer.
     - Header: `Avatar` + `AvatarImage` + `GeneratedAvatarFallback` (same as
       post cards), full name, `@slug`, bio.
     - "Connected personas": one card per item, linking to
       `/personas/<id>`. The section is not rendered when the list is empty.
     - Not found: a "Persona not found" empty state. Other errors: a short
       error message with a retry button.
   - Entry point: a "View profile" link per persona in
     `pages/(dashboard)/persona-manager`. Connected cards link to each other.
3. **Author and member links.** Real names link to `/personas/<id>`;
   anonymous ones stay plain text, since a link to a 404 is an inactive
   control and isn't rendered.
   - GraphQL: `anonymous: Boolean!` on `type Persona` in
     `shared/external/graph/schema.graphqls`, then `make generate-models`.
     `Resolver.resolvePersonas` sets it on the `AnonymousName` branch;
     `realPersona` leaves it false.
   - REST: `anonymous` (bool) on `channels.PersonaFields`, set by
     `anonymize`. Member and join-request lists carry it.
   - Frontend: add `anonymous` to the author selections in
     `src/graphql/**/*.graphql`, run codegen (see 4), and wrap the author
     avatar + name in a `Link` in `components/post-card` and
     `components/comment-section/item.tsx`, and the person row in
     `channels/[id]/ModerationSheet.tsx`, when `!anonymous`.
4. **Codegen source.** `codegen.yml` introspects production
   (`https://api.flookaa.com/query`), which won't have `anonymous` until
   Caterpie ships, so codegen can't run on this branch. Point it at the
   repo's schema files instead (`../shared/external/graph/*.graphqls`).
   The generated types then always match the branch, and codegen no longer
   needs the network.
5. **CLAUDE.md**
   - Tier table: `persona/:persona_id` alongside `persona/:persona_id/*`.
   - "Persona access": one bullet saying `GET /persona/:persona_id` returns
     the public fields of a visible persona and 404 otherwise, the profile
     page is `/personas/:id`, and persona views carry `anonymous` so only
     real names link to it.
   - Frontend commands: `pnpm codegen` reads `shared/external/graph`, not
     the live schema.

## Out of scope

- Notification actors (WWW-22 applies visibility to them first).
- Follow button and follower counts (WWW-21).
- The persona's channels or posts on the profile.
- Slug URLs: slugs are unique per user only, so the route uses the id.

## Acceptance

With user U owning A (public, linked), B (public, linked), C (public, not
linked), D (private), E (only_me), and a viewer V from another user:

- V opens `/personas/A`: A's header, connected section shows B, and the B
  card opens `/personas/B`, which lists A.
- V opens `/personas/C`: C's header, no connected section.
- V opens `/personas/D`: "Persona not found", unless V is an approved
  follower of D, then D's header and no connected section.
- V opens `/personas/E`: "Persona not found". One of U's own personas sees E's
  header and no connected section.
- The persona manager's "View profile" opens each of U's personas.
- In a channel, V sees A's posts, comments and member row as links to
  `/personas/A`. E's show as "Quiet Otter 37"-style plain text with no link.
  The GraphQL author and the REST member row carry `anonymous: true` for E.
- `pnpm codegen` runs offline and adds `anonymous` to the generated types.
- Switching the current persona on an open profile reloads it for the new
  viewer.
- `GET /persona/:id` never carries `user_id`, `is_default`,
  `show_on_profile`, `privacy`, `name` or `description`. No cookie → 401; a
  user without a current persona → 403 `persona_required`.
- `go build ./...` and `go vet ./...` pass in `shared/` and `backend/`; `pnpm build` and
  `pnpm lint` pass in `front-end/`. There are no tests in the repo.
