# WWW-97 — Figma: account settings and persona settings

Figma only, no code, in "Flookaa v2" (`cB5tjyC1Vpx9aMQsrX0kDY`, Sara's team), on the existing page `Notifications & Settings` `109:6`. Follows `plans/WWW-77-figma-handoff.md`; WWW-103 implements it. Frames at 1440 / 834 / 390 with Theme and Breakpoint modes set.

## Goal

WWW-103 can rebuild `/settings/profile` and `/persona-manager/:id` without inventing UI: every section, field, validation error and state. WWW-89 gets the language switch's place, WWW-122 its change-password form.

## What exists today

- **Account** (`/settings/profile`): title + lead, `EmailCard` (address, Change → `ChangeEmailDialog`: code to the new address, resend, cancel), then one generic form (first/last name, date of birth, gender) with Cancel / Save. No password section (WWW-122), no language (WWW-89). Light/dark lives in the sidebar footer only.
- **Persona** (`/persona-manager/:id`): back link, persona name, View profile; one generic form in the persona's `data-theme` (label `name`, names, `@slug`, avatar, bio, description, theme, privacy, `show_on_profile`) with one Save; then a separate Interests card with its own Save. `cover_pattern` (migration 035) has no field. The follow-request link and the followers/requests sheet live on the profile page (`?followers=`), not here.

## Proposal

### Layout (both pages)

App shell like Feed; one 640 px column. `h1` + lead, then a sticky `Section Nav` of jump links (like the community page), then one bordered card per section, each with its **own Save** (each section is its own endpoint already), disabled until something changes. Mobile: same column with 16 px gutter, Section Nav scrolls horizontally.

### Account settings — `Desktop / Settings / Account`

Sections, in order:

1. **Profile** — first + last name side by side (stacked on mobile), date of birth, gender (two `Chip`s, Male / Female). Save.
2. **Email** — current address + Verified tag, "Change email" outline button → the change dialog (enter address → enter code, resend countdown, cancel). Google-only accounts: the row says "Managed by Google", no button.
3. **Password** (for WWW-122) — current password, new password with the sign-up `Password Checklist`, Save. Google-only accounts: a note instead of the form.
4. **Language** (for WWW-89) — `English` / `العربية` as a two-option segmented control; applies at once, no Save.
5. **Appearance** — Light / Dark segmented control, same as the sidebar toggle; applies at once.

### Persona settings — `Desktop / Settings / Persona`

The whole page in the persona's palette (the shell keeps the viewer's). Header: back arrow, persona avatar + display name, private label `name` as a muted tag, "View profile" outline button.

1. **Basics** — avatar (upload / remove), label `name` (private, helper says so), first + last name, `@slug` (prefix inside the field), bio (counter). Save.
2. **Look** — live `Hero` Persona preview on top, theme picker (6 palette swatches, selected ring), cover pattern picker (4 `Cover` thumbnails: horizon / waves / hills / stripes). The preview follows the picks before saving. Save.
3. **Privacy** — three radio cards (Public / Private / Only me, one line each on what others see). Under Public: "Show on my profile" switch with its hint. Under Private: the follow-request link row (copy, reset with confirm). Save; switching away from Private or Public shows the inline warning of what gets cleared (link / show-on-profile / pending invitations).
4. **Interests** — the onboarding `InterestPicker` chip rows with "n / 20", Save.
5. **Followers** — counts row ("128 followers · 3 requests") with "Manage" → the **Followers sheet**: tabs Requests / Followers, rows with Approve / Reject or Remove (confirm), empty and error states. Same sheet the profile page opens.

### States (one frame each, Desktop unless noted)

- Field errors: account (`invalid_date_of_birth`, weak password with the checklist failing, wrong current password), persona (`invalid_slug`, `slug_taken`, avatar upload failed).
- Saving (button `loading`), saved toast, page loading (Skeleton sections), load error (`Error State` with Retry).
- Change-email dialog: address step, code step, wrong code, cooldown.
- Followers sheet: Requests, Followers, empty, mobile (full-height sheet).

Content in Deep Tide Light; the persona page also in one dark palette and one other light palette, so the theme scoping shows.

## Decisions (user, 2026-10-27)

1. One Save per section, no page-wide save bar.
2. The change-password section is designed here first; WWW-122 implements it from these frames.
3. Appearance is Light / Dark only.
4. Persona settings gets the Followers section and sheet; the profile page keeps opening the same sheet.

## Done when

- Both pages at 3 widths, all sections and states, built from Components/Patterns instances and bound variables only.
- Screenshots show no overlaps or clipped text; contrast AA in every palette shown.
- Ids in `plans/WWW-77-figma-handoff.md`; frame links in WWW-103's Design section, the language switch location in WWW-89, the password section in WWW-122.

## Gotchas

- `whoami` must be Sara's account before any write.
- Arabic/RTL frames are not needed here (WWW-91 / WWW-95); the language switch only shows its place.

## Build notes (2026-10-27)

- Built from the Notifications shell (same sidebar, 640 px column); Settings or Personas is the active sidebar entry.
- New components in `Settings` `119:330`: Switch, Segmented Control, Radio Card, Theme Swatch, Cover Option, Checklist Rule. Section cards are plain frames (card fill, border, `radius/lg`, 24 px padding), not a component, since each holds different content.
- Each section saves on its own; Save is disabled until something changes (Basics is shown edited). Language and Appearance apply at once and have no Save. Email has no Save: Change email opens the dialog.
- Look's preview is the `Hero` Persona/Mobile variant, so it fits the column. Its Theme mode follows the picked swatch (see the Ember state).
- Mobile: two-field rows stack, the avatar is `lg`, View profile becomes an outline icon button, the hero preview is scaled to 78 %, and the 6-cell code input is scaled to the dialog width.
- The followers sheet is the existing WWW-118 design (`78:1476` / `78:1682` / `78:1909`); the Followers section's Manage opens it.
- Leaving Private warns before Save: the follow-request link is turned off and pending invitations are cancelled; followers stay. Public shows the Show on my profile switch with the note that the label becomes public.
- Every text/surface pair used is ≥ 4.5:1 in all 7 palettes. Swatches keep their own palette's light colours on a dark page.
- Ids are in `plans/WWW-77-figma-handoff.md` (2026-10-27 WWW-97 entry).
