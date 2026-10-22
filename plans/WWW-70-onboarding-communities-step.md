# WWW-70 — Onboarding: follow or join communities step

Branch `WWW-70-onboarding-communities-step`, from `release-caterpie-v1010`.
Task of epic WWW-56, after WWW-69 (suggestions). Backend (step registration)
and frontend.

## Goal

- A third onboarding step, "Join your communities": cards from the persona's
  community suggestions, each with Join and Follow, an "n selected" counter,
  Continue, and Skip.
- Out of scope: the channels step (WWW-72), the personas step (WWW-71),
  member avatar stacks (they'd reveal members of private communities).

## Decisions

1. **Step** `communities`, id 3 (fixed, as agreed in WWW-63), `Skippable:
   true`. Users already `onboarding_completed` never see it (optional steps
   aren't caught up on); users still before the interests step get it after
   interests.
2. **Done** (needed for `next`): the default persona has a live community
   membership (`active` or `pending`, `left_at IS NULL`) or a live follow, in
   a community that isn't deleted. New query `DefaultPersonaInCommunity`.
3. **As which persona**: the onboarding page already makes the default
   persona current, so the step fetches suggestions for the current persona
   and acts through the existing Persona-tier endpoints
   (`/communities/:id/join|leave|follow|unfollow`). No new endpoints.
4. **Actions are immediate**, like on the community page, not queued until
   Continue (no partial-failure handling on Continue):
   - **Join** → `join` (public: "Joined"; private: "Requested"). Clicking
     again leaves / cancels the request (with the page's confirms).
     A community with rules opens the same "Agree and join" dialog first,
     moved out of the community page into a shared component.
   - **Follow** → `follow` / `unfollow` toggle. Not rendered on private
     communities (hide, don't disable).
   - The card's state comes from each action's answer, so no refetch.
5. **Counter**: communities on this screen the persona now joined, asked to
   join, or follows. Continue is disabled at 0; Skip is always there. The
   footer's left note reads "n selected".
6. **List**: one request, `getSuggestedCommunities(personaId, {limit: 50})`.
   No paging: suggestions drop what the persona joined, so an offset would
   skip items, and onboarding needs only the best matches. Empty list → "No
   communities match your interests yet." and Skip.
7. **Card**: banner, avatar, private and age badges, name, description,
   interest chips, member count, Join/Follow buttons. Not a link (the step
   shouldn't navigate away). The body of `CommunityCard` is split out so the
   list page and the step share it.
8. **Not realtime**: the persona's own actions update the cards from their
   answers; nobody else changes what this screen shows that matters to the
   step (an approval of a pending request still counts as selected).

## Backend

### SQL (then `make generate-models`), no migration

- `community.sql` → `DefaultPersonaInCommunity :one` (`user_id`) returning
  `done`, shaped like `DefaultPersonaHasInterests`.

### Code

- `root.go`: `onboarding.Step{ID: 3, Key: "communities", Skippable: true,
  Done: q.DefaultPersonaInCommunity}`.

## Frontend

- `pages/onboarding/steps/Communities.tsx`: loads suggestions, renders the
  cards in a responsive grid, holds per-card state, `OnboardingFooter` with
  `left="n selected"`, `continueDisabled` at 0.
- `steps.ts`: `communities: { title: "Join your communities", Component }`.
- `pages/(dashboard)/communities/CommunityCard.tsx`: split into
  `CommunityCardBody` (shared) and the linked list card; the step adds an
  actions row under the body.
- `components/communities/CommunityRulesDialog.tsx`: the "Agree and join"
  dialog, used by the community page and the step.

## Docs

- CLAUDE.md, Onboarding: `communities` (3) is registered; a short
  "Communities" bullet (Done rule, immediate actions, counter, no paging).

## Order and deploy

- Backend first (the step is registered server-side; a frontend without the
  step entry would show nothing for it). No migration.

## Verification

- `go build ./...` / `go vet ./...` in `shared` and `backend`; `pnpm build`
  and `pnpm lint`. There are no tests.
- On dev, a new user through onboarding:
  - after interests, the step shows communities sharing those interests,
    progress "3 / 3";
  - Join on a public one → "Joined", counter 1, Continue enabled; Join again
    → leave confirm, counter 0;
  - no private community is listed;
  - a community with rules → "Agree and join" dialog first;
  - Continue moves on (completes onboarding until WWW-72 exists); Skip
    moves on with nothing joined;
  - Back returns to interests; coming forward again lists only communities
    not yet joined (counter starts at 0; Skip or pick more);
  - an older, completed user never sees the step.

## Revision: public-only suggestions

Asked during review, folded into this ticket.

- `SuggestCommunities` and `SuggestChannels` add `visibility = 'public'`, so
  private communities and channels are never suggested (WWW-69 decision 6
  reversed; its plan is amended).
- The step loses its private-only UI ("Request to join", "Requested"); Follow
  is always shown. The leave confirm only needs the "Leave" wording.
- `Done` keeps counting pending memberships (a persona may have asked to join
  a private community elsewhere).
- CLAUDE.md's Suggestions paragraph says public only.

## Implementation notes

- `CommunityCardBody` takes `children`, rendered as the last row inside the
  card content; the step puts the Join/Follow buttons there.
- Joining or leaving a public community adjusts the card's member count
  locally from the action's answer.
- Checked locally: `DefaultPersonaInCommunity` against a migrated, seeded
  database (none → false, follow → true, unfollowed → false, rejected →
  false, pending → true). The step itself wasn't run in a browser: the dev
  backend doesn't have the step until this is deployed.
