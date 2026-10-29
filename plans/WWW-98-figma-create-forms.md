# WWW-98 — Figma: create channel and create community forms

Figma only, no code, in "Flookaa v2" (`cB5tjyC1Vpx9aMQsrX0kDY`, Sara's team), on the page `Channel & Community` `3:5`, next to the channel and community screens. Follows `plans/WWW-77-figma-handoff.md`; WWW-104 implements it, WWW-99 reuses the identity pickers. Frames at 1440 / 834 / 390 with Theme and Breakpoint modes set.

## Goal

WWW-104 can rebuild `/channels/create` and `/communities/create` without inventing UI: every field the endpoints take, the new identity fields (theme, cover pattern, logo) with a live hero preview, and every validation and error state.

## What exists today

- **Create channel** (`/channels/create`, `?community=<id>` optional): one generic form in a card: name, description, visibility (select), thumbnail URL and banner URL as text fields, interests. A "In {community}" / "Will be suggested to {community}" line when it came from a community. No theme, cover or logo field, no min-age field although the endpoint requires `min_age`. Creating in a community you don't manage answers `community_status: pending` (toast).
- **Create community** (`/communities/create`, `CommunityForm`): name, link (`slug`, follows the name until edited), description, rules, visibility, thumbnail / banner as text, interests, min age. No theme/cover/logo pickers.
- **Endpoints**: channel `name` (required), `description`, `visibility` public/private, `interest_ids` 1–5, `min_age` 13/16/18/21, `community_id`, `theme` (`""` = the community's), `cover_pattern`, `thumbnail` (logo). Community adds `slug` (409 `slug_taken`, `create` reserved), `rules` (≤ 5000), and its theme is always set (default `tide`). Errors: `invalid_name`, `invalid_slug`, `invalid_rules`, `invalid_visibility`, `invalid_min_age` (also above your own age), `invalid_interests` / `invalid_interest`, `invalid_theme`, `invalid_cover_pattern`, `invalid_logo`, `slug_taken`. `banner` is unused by the v2 look (photo covers are WWW-92) and gets no field.

## Proposal

### Layout (both pages)

App shell like Settings. Desktop: page title + lead, then two columns: the form (640 px, sections as bordered cards like Settings) and a **sticky live preview** on the right (the `Hero` Channel / Community variant, in the picked palette, with the name, tagline from the description, tags from the picked interests, facts "Public · 13+"). Tablet and mobile: one column, the preview on top in a compact `Hero` Mobile variant that scrolls away. One **Create** button at the bottom (with Cancel), not one Save per section: nothing exists until it's created.

### Sections — `Desktop / Create channel`

1. **Basics** — name (counter), description (textarea, counter).
2. **Community** (optional) — "None" by default, or the picked community: its `Logo` + name, and a line "Goes straight in" (you manage it) or "Its managers review the request" (you don't), with Change / Remove. **Change** opens a community picker (dialog on desktop, sheet on mobile): search field, then two groups, "You manage" (goes straight in) and "Your communities" (ones the persona is an active member of or follows; a request), each row `Logo` + name + member count; empty and loading states. `?community=` preselects it.
3. **Look** — logo upload (`Logo` with initials fallback from the name, Upload / Remove, uploading and failed states), theme picker (`Theme Swatch` × 6; in a community a first swatch "Community's" showing that community's palette, selected by default), cover pattern picker (`Cover Option` × 4).
4. **Audience** — visibility as two `Radio Card`s (Public: anyone reads, members post / Private: members only, joins need approval), age limit as four `Chip`s 13+ / 16+ / 18+ / 21+ (13+ preselected, helper "Only people this age or older find it").
5. **Interests** — the `InterestPicker` chip rows with "n / 5".

### Sections — `Desktop / Create community`

Same frame, with: Basics adds **Link** (`flookaa.com/communities/` prefix inside the field, follows the name until edited, `slug_taken` inline) and **Rules** as its own section (textarea, counter of 5000, helper "Shown before anyone joins"). No Community section. Theme picker has no "Community's" swatch (default `tide` selected). Audience's private card says requests need a manager's approval.

### States (one frame each, Desktop unless noted)

- Field errors: empty name, `slug_taken`, `invalid_slug`, age above your own (`invalid_min_age`: "You can't set a limit above your own age"), no interest picked, rules too long, logo upload failed.
- Create `loading`; server error toast; the "request sent" outcome for a channel created into a community you don't manage (toast copy).
- Live preview following the picks: one frame per form in another palette (e.g. Ember, Forest) with a picked logo and cover.
- Mobile: both forms full length, preview on top.

Content in Deep Tide Light; one dark frame of the channel form to show the scoping.

## Decisions (user, 2026-10-28)

1. One page with a sticky live preview, not a wizard (Claude's recommendation: every field is visible and the preview reacts to all of them; a wizard hides the preview's purpose behind steps).
2. A new channel gets a community picker. It lists the communities the persona manages (straight in) and the ones it's an active member of or follows (a request). WWW-104 needs a backend list for it (one query, age-filtered like every list); a channel's Manage sheet (WWW-99) can reuse the picker for "suggest to a community".
3. Age limit preselected at 13+.

## Done when

- Both forms at 3 widths, all sections and states, built from Components/Patterns instances and bound variables only.
- Screenshots show no overlaps or clipped text; contrast AA in every palette shown.
- Ids in `plans/WWW-77-figma-handoff.md`; frame links in WWW-104's Design section, plus a note there that the community picker needs its backend list; the pickers noted on WWW-99.

## Gotchas

- `whoami` must be Sara's account before any write.
- Reuse WWW-97's `Theme Swatch`, `Cover Option`, `Radio Card` (`119:330` section); don't make new ones.
- Arabic/RTL frames are not needed here (WWW-91 / WWW-95).

## Build notes (2026-10-28)

- Built from the Persona settings frames (same shell, section cards, `Theme Swatch` / `Cover Option` / `Radio Card`). The active sidebar entry is Channels or Communities.
- Desktop: form column 640 px, preview column 390 px with the `Hero` Mobile variant in a bordered card (the sticky part). Tablet: the preview moves to the top of the column as the full-width `Hero` Desktop variant. Mobile: preview on top, `Hero` Mobile scaled to the 356 px column; Cancel and Create share the width.
- One Create button at the bottom; sections have no Save.
- The preview's palette is the picked theme: the "Community's" swatch shows the community's palette (Forest in the frames). Without a community, the swatch row starts at Deep Tide.
- Community section: the default frame has a community you manage picked; the states board shows None (Choose a community) and one you don't manage (a request). The picker lists "You manage" then "Your communities" with `Community Option` rows; loading, empty and no-results states sit next to it.
- The community link is shown as the full URL in the field (`flookaa.com/communities/…`), not as a separate prefix.
- The Deep Tide Dark frame picks Deep Tide so the preview shows the dark palette; other palettes have no dark mode in Figma.
