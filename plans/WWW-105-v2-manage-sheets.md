# WWW-105 — Frontend: manage and members sheets to v2

Implements the WWW-99 frames (links in WWW-105's Jira comment; ids in `plans/WWW-77-figma-handoff.md`): a **Manage** sheet and a **Members** sheet for both channels and communities. Decisions already made in WWW-99: two sheets per entity; channel Info (name, description) gets its backend here, visibility stays read-only; community `⋯` menu = Copy link, Suggest a channel, then for managers Manage, Members & requests, Create channel.

## What exists today

- **Channel:** one `ModerationSheet` (`sm:max-w-md`) with five tabs: Requests, Members (Remove button), Interests (`ChannelInterestsEditor`), Community (`ChannelCommunityPanel`), Settings (`ChannelSettingsPanel`, a min-age select). No Look UI, although `PATCH /channels/:channel_id` takes theme, cover and logo since WWW-80.
- **Community:** "Edit community" opens the old Formik `CommunityForm` in a sheet (one Save, URL text fields for thumbnail/banner, no theme or cover). `MembersSheet` (`?members=`) has Members (row `⋯`), Requests, Channels tabs.
- WWW-104 left reusable pieces: `components/create-form` (`ThemeField` with the "Community's" swatch, `CoverField`, `AgeField`, `VisibilityField`, `LogoUpload`, `CreatePreview`, `InterestsSection`, `BASE_ERRORS`, `useFieldErrors`) and `components/community-picker`. `components/settings` has `SettingsSection` (own Save, off until dirty).

## Backend

1. **`PATCH /channels/:channel_id`** takes `name` and `description` too (`CanModerate`, as today).
   - `name` trimmed, 1–100 characters, else 400 `invalid_name`; `description` at most 500 characters, else 400 `invalid_description`. Same limits the create form already enforces in the UI; `POST /channels/create` gets the same two checks so the server agrees with both forms.
   - `UpdateChannel` query: `name = COALESCE(sqlc.narg(name), name)`, same for `description`. Response adds `name`, `description`.
   - Publishes `info.update` as today; the channel page already refetches on it, and so does every open view of it.
   - Then `make generate-models` (sqlc only; GraphQL unchanged).
2. **`GET /channels/:channel_id/community`**: its `community` adds `theme` and `thumbnail`, so the Community card shows the community's `Logo` and the Look card's "Community's" swatch shows the right palette even when the channel has its own theme.

Nothing else changes server-side. The visibility warnings use counts the page already has (`followers_count`, the pending request count).

## Frontend

### Shared: `components/manage`

- `ManageSheet`: right `Sheet`, 640 px from `sm`, full screen below it with a back arrow instead of the close X. It wraps its content in the entity's `data-theme`. Header: entity `Logo`, name, overline "Manage". Then a sticky `SectionNav` of jump links (scrolls horizontally on mobile), then the `SettingsSection` cards.
- `useSectionSpy` gets options `{ root, hash }`: inside a sheet the read line is measured from the sheet's scroll container, and `hash: false` keeps jumps out of the URL (the community page already spies its own `#channels/#about/#people`).
- `MembersSheetFrame`: right `Sheet`, 480 px, full screen on mobile, with `SectionNav` tabs whose labels carry `Badge variant="count"`.
- `MemberRow`: `PersonRow` plus role `Tag` (Owner / Moderator) and a row `⋯` menu; the owner's row has none. Replaces the inline buttons in both sheets.
- `ConfirmDialog` (if `components/ui` has no equivalent yet): replaces every `window.confirm` here: remove member, take a channel out, step down, go private, go public, remove moderator.
- `LookSection`: the WWW-98 pickers in a `SettingsSection`: live preview on top (`CreatePreview`), `LogoUpload`, `ThemeField` (with `inherit` for channels in a community), `CoverField`. Sends only changed fields.

### Channel

- `pages/(dashboard)/channels/[id]/manage/` replaces `ModerationSheet`, `ChannelInterestsEditor`, `ChannelSettingsPanel`, `ChannelCommunityPanel` (all deleted):
  1. **Info**: name and description with counters; 400 `invalid_name` / `invalid_description` inline.
  2. **Look**: `LookSection`; "Community's" first when the channel is in a community (sends `theme: ""`).
  3. **Interests**: `InterestPicker`, "n / 5" in the footer note, Save off at zero.
  4. **Audience**: `AgeField` with the "Younger people won't see it at all, members included" helper and `invalid_min_age` inline (`PUT …/min-age`); visibility as a read-only `Tag` + line.
  5. **Community**: one card per state. None: "Suggest to a community" opens `community-picker` and calls the existing request endpoint. Pending: Logo, name, Pending `Tag`, Cancel request. In: Take out of community (confirm). Rejected: "You can ask again on {date}" plus the picker for another community. 409 codes (`channel_request_pending`, `recently_rejected`, `channel_in_community`) shown inline.
- `ChannelMembersSheet` (new): tabs Members and Requests (n), opened from the hero `⋯` (new item "Members & requests") and from the People tab's "See all" for moderators; `?members=members|requests` like the community.
- Hero `⋯`: Copy link, then for moderators Manage, Members & requests.

### Community

- `pages/(dashboard)/communities/[slug]/manage/` replaces the "Edit community" sheet; `CommunityForm.tsx` is deleted (create no longer uses it since WWW-104).
  1. **Info**: name, link (`flookaa.com/communities/…`, `invalid_slug` / `slug_taken` inline), description.
  2. **Look**: `LookSection`, no inherit swatch.
  3. **Interests**: "n / 5".
  4. **Rules**: textarea, counter of 5000, "Shown before anyone joins".
  5. **Audience**: `AgeField`; visibility `RadioCard`s for `can_own`, a read-only line for other managers; before Save, an inline warning ("Going private ends {followers_count} follows" / "Going public admits {n} pending requests") and a confirm dialog.
  Each section `PATCH`es only its own fields; the page already refetches on `info.update`.
- `MembersSheet` restyled onto `MembersSheetFrame` + `MemberRow`; tab "Channel requests (n)" ("Channels (n)" on mobile). `ChannelRequestRow` becomes the Figma pattern: `Logo` (channel theme), name, "Asked by {name} · {date}" (see Decision), Approve / Reject (ghost). "Decline" becomes "Reject" to match Figma.
- Hero `⋯` reordered to the agreed order; "Edit community" becomes "Manage".

### States

Every list: `SkeletonList` ×3, `EmptyState compact` (Members "Only you so far", Requests, Channel requests), `ErrorState compact` with retry. Sections: Save `loading`, toast on success, field errors inline.

## Decision (user, 2026-10-29): channel request rows show who asked

`GET /communities/:id/channel-requests` items add `requested_by: {persona_id, display_name, thumbnail, anonymous}` (null for rows without a requester), resolved as the manager viewing the list sees that persona (`ResolvePersonasForViewer`, one batch per page):

- **Public persona:** its real name and avatar.
- **Private persona the manager can see** through a connection (following, followed, the same user's personas, as in Persona access): its real name and avatar.
- **Otherwise:** the random per-channel name, `access.AnonymousName(persona, channel_id)`, with no thumbnail (the frontend draws `GeneratedAvatarFallback`).

The row reads "Asked by {name} · {date}", and the name opens `PersonaLink` like other rows. The query adds `cc.requested_by`. CLAUDE.md's Communities section gets the field.

## Done when

- Both Manage sheets and both Members sheets match the WWW-99 frames at 1440 / 834 / 390, light and Deep Tide Dark, and in the entity's palette.
- A moderator can rename a channel and change its look, interests, age and community from Manage; a community manager can edit every field the endpoint takes, with the owner-only visibility rule.
- `pnpm build` and `pnpm lint` clean; `go build ./...` clean. Browser-checked with Playwright on a channel and a community I manage (user logs in when asked).
- CLAUDE.md updated: channel `PATCH` fields and codes, the `/community` response fields.

## Gotchas

- Deploy the backend before the frontend (Info sends `name`/`description`).
- No hex in components; tokens only. Sheet content must sit inside the entity's `data-theme` while the app shell keeps the viewer's.
- `useSectionSpy` change must not alter the settings and community pages' behaviour (defaults stay as now).
