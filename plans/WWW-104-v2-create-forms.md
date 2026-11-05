# WWW-104 — Frontend: create channel and create community forms to v2

Implements the WWW-98 frames (links in WWW-104's Jira comment) for `/channels/create` and `/communities/create`. Same routes, new layout. The create endpoints stay as they are, plus one new list for the community picker.

## What exists today

- `/channels/create` renders the generic `FormComponent` with `Form.channel` (`lib/formFields/channel`): name, description, visibility select, thumbnail and banner as URL text fields, interests. It has no theme, cover or logo field. It also has no `min_age` field, although the endpoint requires one. `?community=<id>` shows an "In / Will be suggested to" line.
- `/communities/create` renders `CommunityForm` (Formik, `Form.community`), and the community page reuses it for **editing**.
- Backend: `POST /channels/create` and `POST /communities/create` already take `theme`, `cover_pattern`, `thumbnail` (logo, `backend/internal/logo`), `min_age`, `interest_ids`, `community_id`. A channel created into a community you don't manage answers `community_status: pending`. There's no logo upload UI anywhere yet; `services/uploadFile` returns the s3 `…/files/<key>` URL that `logo` accepts.

## Backend: the picker list

`GET /api/v1/communities/mine` (Persona tier) → `{communities: [{id, name, slug, thumbnail, theme, members_count, can_manage}]}`.

- New query `ListPersonaCommunities(persona_id)`: live communities where the persona is the owner, a live moderator (active member), an active member, or a follower. `persona_meets_min_age` like every list. Global Administrators get no extra rows: the picker is "your communities", and an admin can still use `?community=`. Order: `can_manage` first, then name.
- No paging, because a persona's own communities are few. Search filters on the client.
- Gin 1.10 allows the static `/mine` next to `/:community_id`.
- `POST /channels/create` doesn't change. It still accepts any community the persona can see, so `?community=` from any community page keeps working.

## Frontend

### Shared layout: `components/create-form`

- `CreatePage`: title and lead, then two columns from `lg`. The form (sections as bordered cards like `SettingsSection`, but with no Save) sits on the left, and a sticky preview card (390 px) on the right. Below `lg`, the preview sits on top of the column and scrolls away. At the bottom: Cancel (back) and Create (`loading`); on mobile they share the width.
- `CreatePreview`: `Hero` inside a `data-theme` of the picked palette, with `Cover`, `Logo` (initials from the name), the picked interests as tags, the name (or a placeholder), the description as tagline, and the facts "Public · 13+". It uses the compact sizing on desktop and tablet as Figma does.
- `LogoUpload`: `Logo` plus Upload and Remove buttons, using `uploadFile` directly (not the Formik `useInpuImage`). It has uploading (spinner) and failed (error text with Retry) states. WWW-105's manage sheets can reuse it.

### `/channels/create`

Local state per field, one submit. The sections are:

1. **Basics**: name and description, both with counters.
2. **Community**: None, or the picked community's `Logo` and name, with "Goes straight in" or "Its managers review the request" and Change/Remove buttons. Change opens `CommunityPicker` (a `Dialog` from `md`, a `Sheet` below): a search field, then the groups "You manage" and "Your communities" in `Community Option` rows (logo, name, member count). It has loading, empty and no-results states. `?community=` preselects a community, fetched with `getCommunity` if it isn't in the list.
3. **Look**: `LogoUpload`, then `ThemeSwatchGroup` with a first "Community's" swatch when a community is picked (selected by default, sends `theme: ""`), then `CoverOptionGroup`.
4. **Audience**: visibility as two `RadioCard`s, and age as `Chip`s 13+/16+/18+/21+ with 13+ preselected.
5. **Interests**: `InterestPicker`, at most 5, with `showCount`.

Errors: the API codes map to inline field errors (`invalid_name`, `invalid_min_age` "You can't set a limit above your own age", `invalid_interests`, `invalid_logo`, `invalid_theme`/`invalid_cover_pattern`), and anything else goes to a toast. Client checks run first: name required, at least one interest. On success it navigates to the channel. A `pending` answer also shows the toast "Channel created. {community}'s managers will review your request to add it."

### `/communities/create`

The same frame. Basics adds **Link** (the slug follows the name until edited, `invalid_slug` and 409 `slug_taken` show inline), and **Rules** is its own section (counter of 5000, `invalid_rules`). There's no Community section and no "Community's" swatch (`tide` is preselected). The private card's text says requests need a manager's approval. On success it navigates to `/communities/<slug>`.

### Removed

`Form.channel` and `lib/formFields/channel` are removed, since only the create page uses them. The `banner` field is dropped from both create forms (photo covers come in WWW-92). `CommunityForm` and `Form.community` stay for the community page's edit until WWW-105 replaces it. Then create no longer uses them.

## Docs

CLAUDE.md: add `GET /communities/mine` to the community REST list, and a line that `components/create-form` is the create-page frame.

## Done when

- Both pages match the Desktop/Tablet/Mobile frames and the states board. The preview follows every pick, including palette and "Community's".
- Creating a standalone channel, a channel into a community you manage (it goes in) and one you don't (pending toast), and a community, all work against the API.
- `go build ./...`, `pnpm build` and `pnpm lint` are clean. CLAUDE.md is updated.

## Decisions (user, 2026-10-29)

1. The picker lists followed communities too (they become a request), as designed.
2. Global Administrators see only their own communities in the picker; `?community=` covers the rest.
3. The community edit form moves to the new frame in WWW-105, not here.
