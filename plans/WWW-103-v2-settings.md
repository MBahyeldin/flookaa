# WWW-103 — Frontend: account settings and persona settings to v2

Implements the WWW-97 frames (page `Notifications & Settings` `109:6`; ids in `plans/WWW-77-figma-handoff.md`, 2026-10-27 WWW-97 entry). Same routes, new layout, existing hooks and endpoints. Frontend only: no endpoint or validation rule changes.

## Goal

`/settings/profile` and `/persona-manager/:id` look like Figma: one 640 px column, `h1` + lead, a sticky `SectionNav` of jump links (`hooks/useSectionSpy`, like the community page), one bordered card per section with its **own Save**, disabled until that section changes. The onboarding Personas step's "Manage" sheet reuses the persona sections.

## Shared pieces

- `components/settings/SettingsSection` — card (`bg-card`, border, `rounded-lg`, 24 px padding), `id` for the jump link, title, optional lead, body, and a footer slot holding Save (`Button loading`, disabled unless `dirty`).
- `components/settings/SettingsPage` — column, header slot, `SectionNav` over the sections, the loading frame (`126:5232`, Skeleton sections) and the error frame (`126:5384`, `ErrorState onRetry`).
- New UI primitives from the Figma `Settings` section `119:330`, under `components/ui/`:
  - `segmented-control` (on `toggle-group`): two or more options, one selected.
  - `radio-card` (Title, Body, Icon; Default/Selected): a radio group whose items are cards.
  - `theme-swatch` (palette name, selected ring; the swatch sits in its own `data-theme` with the palette's light colours, as in Figma). Replaces the inside of `components/inputs/theme`, so the wizard's Basics step gets it too.
  - `cover-option` (`Cover` thumbnail + name, selected ring).
  - `Switch` exists (`ui/switch`); restyle to the Figma variants only if it differs. `Checklist Rule` is the existing `PasswordChecklist` row; it only needs restyling if it differs.
- Each section keeps its own small state (`useState` draft + saved value, `dirty` = not equal), not Formik. The Formik forms `Form.profile` and `Form.personaSettings` and their field groups (`lib/formFields/profile.tsx`, `personaSettingsFormGroups`) are removed once nothing uses them. `privacyChangeHint` stays (the wizard uses it).

## Account settings (`/settings/profile`, frames `122:3144` / `122:3405` / `122:3617`, states `124:4305`)

1. **Profile**: first + last name side by side (stacked on mobile), date of birth (`dateOfBirthSchema`), gender as two `Chip`s, then country / state / city (the existing `dropdown-country|state|city` inputs, state and city reset when the parent changes; three in a row from `md`, stacked on mobile). Figma has no location rows; they follow the same field style. `PATCH /users/profile` with only the changed fields; `invalid_date_of_birth` / `invalid_gender` shown under the field. Toast "Profile saved". The account profile picture is dropped from the page: nothing shows it, and a Google sign-up already passes its picture to the default persona (`users.thumbnail`, copied by the `create_default_persona` trigger), so the column stays.
2. **Email**: address + Verified tag, "Change email" → the existing `ChangeEmailDialog`, restyled to `126:4705` (address step, 6-cell code step, wrong code, resend countdown). Google-only: "Managed by Google", no button.
3. **Appearance**: Light / Dark `segmented-control`, applies at once through the same theme context as the sidebar toggle. No Save.

Not built here (hidden, not disabled):
- **Password** — WWW-122 builds it from the frames; it needs `POST /users/password`, which doesn't exist yet.
- **Language** — WWW-89 adds it; there's no language preference or i18n yet.

## Persona settings (`/persona-manager/:id`, frames `123:3492` / `123:4053` / `123:4483`, Deep Tide Dark `126:5538`, Ember `126:5842`, states `125:4418`)

The page content sits in the persona's `data-theme` (the Look section's picked theme while unsaved, as today); the shell keeps the viewer's palette. Header: back arrow to `/persona-manager`, avatar + display name, the private label `name` as a muted `Badge`, "View profile" (outline; an icon button on mobile).

1. **Basics**: avatar upload/remove (`useInputImage`, the wizard's upload row; upload failure shown under it), label `name` with "Only you see this", first + last name, `@slug` (prefix inside the field, `SLUG_PATTERN`; `invalid_slug` / `slug_taken`), bio with a counter. Save sends only changed fields to `/persona/update`, then `applySavedPersona`.
2. **Look**: live `Hero` persona preview (the hero's compact variant) over the 6 theme swatches and the 4 cover options; the preview and the page palette follow the picks before saving. Save sends `theme` / `cover_pattern`.
3. **Privacy**: three radio cards (Public / Private / Only me, notes from the wizard's `PRIVACY_OPTIONS`). Public shows the "Show on my profile" switch with its hint. Private shows the follow-request link row: the existing `ShareInviteLink` logic (copy, reset with confirm) laid out inline. Leaving Private or Public shows `privacyChangeHint`'s warning above Save. Save sends `privacy` (+ `show_on_profile`).
4. **Interests**: `InterestPicker` with `showCount`, Save via `usePersonaInterests` (unchanged logic, new card).
5. **Followers** (left out, with its jump link, for an `only_me` persona: nobody can follow it): "n followers · n requests" (from `GET /persona/:persona_id`, which the profile page already loads; shown once it answers) and "Manage" → the existing `FollowersSheet`, opened in place (not by navigating to the profile). Counts refetch when the sheet closes. Empty: "No followers yet".

Persona not found or not yours: today's message, as an `EmptyState`.

The onboarding Personas step's sheet renders sections 1–4 (no Followers, no header), so the step keeps working with the new sections.

## Files

- New: `components/settings/` (SettingsPage, SettingsSection), `components/ui/{segmented-control,radio-card,theme-swatch,cover-option}.tsx`, `pages/(dashboard)/settings/profile/{ProfileSection,EmailSection,AppearanceSection}.tsx`, `pages/(dashboard)/persona-manager/[id]/{BasicsSection,LookSection,PrivacySection,InterestsSection,FollowersSection}.tsx`.
- Changed: both pages' `index.tsx`, `ChangeEmailDialog`, `components/inputs/theme`, `pages/onboarding/steps/Personas.tsx`, `FollowersSheet` / `ShareInviteLink` only as far as they need to be opened from another page.
- Removed: `settings/profile/form.tsx`, `EmailCard.tsx`, the Formik profile + persona settings forms and their field groups.
- `CLAUDE.md` frontend conventions: one line on `components/settings`.

## Decisions (user, 2026-10-27)

1. Keep the geo fields (country / state / city) in the Profile section; drop the account profile picture from the page.
2. Hide the Followers section for `only_me` personas.
3. Persona not found: today's message as an `EmptyState`.

## Done when

- Both pages match the frames at 1440 / 834 / 390 in Deep Tide light and dark, plus one other palette on the persona page.
- Every section saves on its own, Save is off until something changes, and the state frames show (errors, `loading`, toast, page loading, page error).
- The onboarding Personas sheet still edits a persona.
- `pnpm build` and `pnpm lint` are clean. Browser check with Playwright (user logs in); saves only on a test persona.

## Gotchas

- `tsc-check` only fails on `.tsx` errors; run `npx tsc -b` and read the `.ts` errors too.
- `/persona/update` must get only changed fields; sending `show_on_profile` while private violates the CHECK.
- The Look preview changes `data-theme` on the page content only, never the shell.

## Change during build (user, 2026-10-27)

The followers endpoints (`/requests`, `/followers`, approve/reject/remove), the follow-request link and invitation answers only answered for the **current** persona, so persona settings got 403 `not_your_persona` for the user's other personas. User chose to open them to any of the user's own personas: `followers.requireSelf` now uses `auth.OwnPersona` (like `/interests`). Backend deploys before the frontend.
