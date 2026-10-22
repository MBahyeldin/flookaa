# WWW-71 — Onboarding: "Your personas" step and finish

Branch `WWW-71-onboarding-personas-step`, from `release-caterpie-v1010`.
Last task of epic WWW-56 (WWW-62 folded in). Frontend, plus the step
registration and a small change to persona creation.

Figma (Falokah UI `P6Fq1R9dGbB8Nw1DifUqSa`): step `2444:275`; "Your Default
Persona" modal `2647:609` (step 1), `2464:22585` (step 2), `2470:23364`
(step 3).

## Goal

- The last onboarding step, "Create Multiple Personas!": the user's
  personas, a three-step wizard to edit the default persona or add a new one,
  settings for the other personas, and Back / Finish / Skip, which complete
  onboarding and land on the dashboard as the default persona.
- Out of scope: a persona category field, changes to the persona settings
  page itself.

## Decisions

1. **Step** `personas`, id 5 (fixed since WWW-63), `Skippable: true`, `Done`
   always true (`onboarding.Always`): it's the last step, so Finish (`next`)
   and Skip both complete onboarding. Completed users never see it.
2. **Page** (Figma `2444:275`): title "Create Multiple Personas!", the
   Figma subtitle, "Your personas", then cards:
   - **Default persona**: filled card, "Default persona" badge, avatar, first
     name; footer "Manage persona" opens the wizard in edit mode.
   - **Each other persona**: same card without the badge, in the outline
     style; "Manage persona" opens its settings form and interests **in a
     sheet**. Not a link to `/persona-manager/:id`: the dashboard shows
     onboarding on every route until it's completed.
   - **Add another persona**: dashed card with a + and Public / Private /
     Only-me chips; a chip (or the +) opens the wizard in create mode with
     that privacy chosen (Public for the +).
3. **Wizard** ("Your default persona" / "New persona", "Step n of 3", a
   progress bar, Back / Next, ✕ closes without saving):
   1. **Basic information**: avatar (upload, s3), persona type chips
      Professional / Gaming / Creative / Business / Social / Other, which set
      the persona's private label (`name`; Other shows a text box), user name
      = `slug` (shown `@slug`, slug rule, `invalid_slug` / `slug_taken` on the
      field), theme (`ThemeInput`, not in Figma but in the ticket), bio
      (optional). Create mode adds first and last name (required: a persona
      needs them).
      - The chip is preselected when the label equals one of them; any other
        label selects Other with the text filled in.
      - The trigger's slug may break the rule: then the field shows its error
        as soon as the wizard opens.
   2. **Privacy**: three option cards with Figma's notes ("Anyone can view
      this persona", "Only people you share with can view", "Just for
      yourself, completely private") and the tip "You can change privacy
      settings at any time." In edit mode a change shows the settings page's
      warnings (leaving public unlinks it from the profile, leaving private
      ends the follow link and pending invitations).
   3. **Interests** (at least one): `InterestPicker`, prefilled in edit mode.
      "Save persona" saves everything.
   - **Saving, edit mode**: `POST /persona/update/:id` with only the changed
     fields (skipped if none), then `PUT /persona/:id/interests` if they
     changed, then the persona store is updated. A field error (slug) jumps
     back to step 1.
   - **Saving, create mode**: `POST /persona/create` (with the slug), then
     `PUT …/interests` for the new id, then the store is refetched. If the
     interests fail after the persona was created, the wizard stays on step
     3 in edit mode for the new persona, so a retry doesn't create a second
     one.
   - Next is disabled until the step is valid (step 1: slug valid, a type
     chosen or typed, names in create mode; step 3: one interest).
4. **Footer**: Back and "Finish" (Skip is redundant: both complete). After a
   successful move the step navigates to `/` (new optional `onMoved` on
   `OnboardingFooter`). The current persona is already the default one, and
   creating a persona doesn't switch to it.
5. **Not realtime**: only the user's own edits change this screen.

## Backend

- `onboarding.Always`; `root.go`: `onboarding.Step{ID: 5, Key: "personas",
  Skippable: true, Done: onboarding.Always}`.
- `CreatePersona`:
  - `description` becomes optional (the wizard has no description;
    settings still edit it).
  - Takes an optional `slug`: validated with `slug.Valid` (400
    `invalid_slug`), 409 `slug_taken` on the unique key, as in update.
    Without it the slug is generated as today.

## Frontend

- `pages/onboarding/steps/Personas.tsx`: page, cards, footer.
- `pages/onboarding/persona-wizard/`: the wizard (`PersonaWizard`), its
  three step bodies and a privacy option card. Plain controlled inputs with
  the existing `ProfilePictureInput`, `ThemeInput` and `InterestPicker`, not
  the generic `Form` (it has no multi-step or per-step validation).
- `steps.ts`: `personas: { title: "Create Multiple Personas!", Component }`;
  the subtitle is rendered by the step.
- `OnboardingFooter`: optional `onMoved(action)`.
- `persona-manager/[id]`: export `PersonaSettingsForm` and
  `PersonaInterestsSection`, and move the store update after a save into a
  shared `applySavedPersona`, used by the wizard too.
- `services/persona.ts`: `updatePersona`, `createPersona` returning the
  error code for field errors.

## Docs

- CLAUDE.md, Onboarding: `personas` (5) registered and a "Personas" bullet;
  persona creation's optional `description` and `slug`.

## Order and deploy

- Backend before frontend (create with a slug and no description). No
  migration.

## Verification

- `go build ./...` / `go vet ./...` in `backend`; `pnpm build` and
  `pnpm lint`. There are no tests.
- On dev, a new user through onboarding:
  - the step shows the default card, any others, and the add card; progress
    "5 / 5";
  - Manage persona on the default → wizard prefilled; change only the bio
    and save → the update request carries only `bio`; a taken slug sends it
    back to step 1 with the error; an invalid trigger slug shows its error
    on open; the type chip sets the label (visible in settings);
  - the Private chip on the add card → wizard with Private chosen; create
    with names, slug, type, interests → the new card appears;
  - Manage persona on the new card → settings sheet, saving works, the page
    stays in onboarding;
  - Finish → `/` as the default persona; Back returns to channels;
  - creating a persona from the persona manager still works (it sends a
    description).

## Revision: onboarding polish

Asked during review, folded into this ticket (frontend only).

- **Progress bar** (Figma `2237:283`): 672 px wide (`max-w-2xl`), 12 px
  tall, white track, the filled part a left-to-right gradient `#2aa1fd` →
  `#faf906` (sampled from Figma's fill image, a plain two-stop ramp, so CSS
  instead of the raster), "n / N" at 14 px under its right end. The two
  colours are brand tokens in `index.css`'s `@theme`
  (`--color-brand-start` / `--color-brand-end`, so `from-brand-start
  to-brand-end`), fixed rather than per palette.
- **Date of birth** (About you): the same field the profile form renders
  (`TextInput` with the profile's `date_of_birth` field: label with the
  calendar icon, the plain date input), instead of the step's own input with
  an icon laid over it. Validation and server errors are unchanged.

## Implementation notes

- `POST /persona/create` used to answer `{persona_id: <whole row with Go
  field names>}`; it now answers the id, which the wizard needs. No caller
  read it before.
- The wizard's avatar uses `useInputImage` directly: `ProfilePictureInput`
  wraps its picture in a `DialogTrigger`, which inside the wizard's own
  dialog would toggle it.
- A default persona still labelled with the column default `Default` opens
  with no type chosen (any other unknown label opens as Other).
- `OnboardingFooter` gained `onMoved` and `hideSkip`;
  `privacyChangeHint` is exported from `lib/formFields/persona.tsx`;
  the store update after a persona save is `lib/applySavedPersona.ts`.
- Not run in a browser: the dev backend doesn't have the step until this
  is deployed.
