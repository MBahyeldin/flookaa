# WWW-72 — Onboarding: follow or join channels step

Branch `WWW-72-onboarding-channels-step`, from `release-caterpie-v1010`.
Task of epic WWW-56, after WWW-70 (communities step). Backend (step
registration) and frontend. Same layout as the communities step (no Figma).

## Goal

- A fourth onboarding step, "Find your channels": cards from the persona's
  channel suggestions (public only since WWW-70), each with Join and Follow,
  an "n selected" counter, Continue, and Skip.
- Out of scope: the personas step (WWW-71), member avatar stacks.

## Decisions

1. **Step** `channels`, id 4 (fixed since WWW-63), `Skippable: true`.
   Completed users never see it; users before the communities step get it
   after communities.
2. **Done**: the default persona has a live channel membership (`active` or
   `pending`, `left_at IS NULL`) or a live follow (`unfollowed_at IS NULL`),
   in a channel that isn't deleted. New query `DefaultPersonaInChannel`,
   shaped like `DefaultPersonaInCommunity`.
3. **As which persona**: the current persona, which the onboarding page made
   the default one, like the communities step. Existing endpoints only
   (`/channels/join|leave|follow|unfollow/:id`).
4. **Two groups** from the suggestion's `source`: "From your communities"
   (`community`) first, then "Based on your interests" (`interest`). A group
   with no cards isn't shown; with only one group present, no heading.
5. **Actions are immediate**, as in the communities step: **Join** →
   "Joined", clicking again leaves (confirm). **Follow** toggles "Follow" /
   "Following". The card updates from the answer (member and follower counts
   too). No success toasts (the button change is the feedback); failures
   toast.
6. **Counter**: cards on this screen the persona now joined or follows.
   Continue disabled at 0; Skip always there. Footer left note "n selected".
7. **List**: one request, `getSuggestedChannels(personaId, {limit: 50})`, no
   paging (same reason as the communities step). Empty → "No channels match
   your interests yet." and Skip.
8. **Card**: the body of `ChannelCard` (image, private and age badges, name,
   community name, description, interest chips, member and follower counts)
   is split into `ChannelCardBody`, shared by the channel lists and the
   step. In the step it has no links (the image and "Part of …" are plain),
   so it doesn't navigate away; the step renders its own button row.
9. **Not realtime**: the persona's own actions update the cards from their
   answers.

## Backend

### SQL (then `make generate-models`), no migration

- `channel.sql` → `DefaultPersonaInChannel :one` (`user_id`) returning
  `done`.

### Code

- `root.go`: `onboarding.Step{ID: 4, Key: "channels", Skippable: true,
  Done: q.DefaultPersonaInChannel}`.

## Frontend

- `pages/onboarding/steps/Channels.tsx`: loads suggestions, groups them,
  holds per-card state, `OnboardingFooter` with `left="n selected"`.
- `steps.ts`: `channels: { title: "Find your channels", Component }`.
- `pages/(dashboard)/channels/ChannelCard.tsx`: `ChannelCardBody`
  (`channel`, `membersCount`, `followersCount`, `linked`, `children`);
  `ChannelCard` keeps its state and buttons and renders the body.

## Docs

- CLAUDE.md, Onboarding: `channels` (4) registered; a short "Channels"
  bullet.

## Order and deploy

- Backend before frontend. No migration.

## Verification

- `go build ./...` / `go vet ./...` in `shared` and `backend`; `pnpm build`
  and `pnpm lint`. There are no tests.
- On dev, a new user through onboarding:
  - after joining or following a community, its channels show first under
    "From your communities", then interest matches; progress "4 / 4";
  - Join → "Joined", counter 1, member count +1; Join again → leave
    confirm, counter 0;
  - Follow → "Following", follower count +1, counter 1;
  - clicking a card's image or community name doesn't leave the step;
  - Continue completes onboarding (until WWW-71 exists); Skip moves on;
  - the channel lists still look and behave as before.

## Implementation notes

- `ChannelCardBody` takes `membersCount`/`followersCount` (`ChannelCard`
  keeps its local counts), `hideCommunity`, `linked`, `className` and
  `children`, rendered as the last row.
- If a channel turned private after the list loaded, Join answers `pending`:
  the card shows Join again and the counter doesn't count it.
- Checked locally: `DefaultPersonaInChannel` against a migrated, seeded
  database (none, unfollowed, rejected and deleted channel → false; follow,
  active member → true). The step wasn't run in a browser: the dev backend
  doesn't have it until this is deployed.
