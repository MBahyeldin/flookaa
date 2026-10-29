# WWW-99 — Figma: manage and members sheets for channels and communities

This ticket is Figma only, with no code. The work goes in "Flookaa v2" (`cB5tjyC1Vpx9aMQsrX0kDY`, Sara's team), on the page `Channel & Community` `3:5`, below the create forms (WWW-98). It follows `plans/WWW-77-figma-handoff.md`, and WWW-105 implements it. Sheets are shown open over `Desktop / Channel` `17:2` and `Desktop / Community` `20:1038`. Mobile frames are full screen at 390 px. Theme and Breakpoint modes are set on every frame.

## Goal

WWW-105 can rebuild every manager surface on the channel and community pages without inventing UI. That covers each field and action the endpoints already take, with their errors and their empty, loading and error states.

## What exists today

### Channel: one tabbed "Manage channel" sheet

The sheet opens from the hero's `⋯` menu (`ModerationSheet`, `sm:max-w-md`) and has five tabs:

- **Requests:** approve or reject.
- **Members:** remove, with Owner and Moderator badges.
- **Interests:** `ChannelInterestsEditor`.
- **Community:** `ChannelCommunityPanel`, covering request, pending, rejected-until, remove and cancel.
- **Settings:** a minimum-age select only.

Gaps:

- No Look section. `PATCH /channels/:channel_id` (theme, cover pattern, logo) has had no UI since WWW-80.
- The backend can't change a channel's name, description or visibility.
- Channel moderators can't be appointed. There's no endpoint for it.

### Community: two separate sheets

- **"Edit community":** opens from the `⋯` menu. It is the old generic `CommunityForm` in a `sm:max-w-2xl` sheet, with one Save, text fields for thumbnail and banner, and no theme or cover pickers. `PATCH /communities/:id` already takes name, slug, description, rules, visibility, interests, min age, theme, cover pattern and logo.
- **"Members & requests"** (`MembersSheet`, `?members=`) has three tabs:
  - **Members:** a row `⋯` menu with Remove, Make moderator, Remove moderator and Step down.
  - **Requests:** approve or reject.
  - **Channels:** channel requests, approve or reject.
- **Permissions:**
  - Changing visibility and appointing or removing moderators need `CanOwn`. Everything else needs `CanManage`.
  - Going private ends every follow. Going public admits every pending request.

## Proposal

### Shape: Manage sheet and Members sheet for both entities

Both entities get the same two surfaces, so channels and communities read alike:

- **Manage** (`⋯` › Manage):
  - Built like the Settings page (WWW-103): a header with the entity's `Logo`, its name and "Manage", then a sticky `Section Nav` of jump links, then one `SettingsSection` card per section.
  - Each section has its own Save, disabled until something changes. Every section already maps to its own field set on the endpoint.
  - Desktop: a 640 px right sheet with `Shadow/sm`. Mobile: full screen with a back arrow.
  - The sheet sits in the entity's `data-theme`, so the Look preview recolours it.
- **Members** (`⋯` › Members & requests, and "See all" on the People strip): a 480 px right sheet, full screen on mobile. `Section Nav` tabs:
  - Members
  - Requests (n)
  - Channel requests (n), community only

  Rows are `Person Row`, with a row `⋯` `Menu` for the actions.

### Channel Manage sections

1. **Info:** name (counter) and description (counter). *Only if decision 2 says yes.*
2. **Look:**
   - A live `Hero` Channel preview on top.
   - Logo upload (`Logo` with initials fallback, Upload and Remove).
   - The `Theme Swatch` row, starting with "Community's" when the channel is in a community.
   - `Cover Option` × 4.

   The Look card reuses the WWW-98 pickers as they are.
3. **Interests:** the `InterestPicker` chip rows, with "n / 5".
4. **Audience:** age limit as four `Chip`s (13+, 16+, 18+, 21+) with the "Younger people won't see it at all, members included" helper. Visibility shows as a read-only line ("Private · joins need approval"), because the endpoint can't change it.
5. **Community:** one card per state:
   - **None:** "Suggest to a community" opens the WWW-98 community picker, with only the "Your communities" and "You manage" groups.
   - **Pending:** the community's `Logo` and name, a `Tag` reading Pending, and Cancel request.
   - **In:** the community, with "Take out of community" (confirm).
   - **Rejected:** the community, with "You can ask again on {date}", and the picker for another community.

### Community Manage sections

1. **Info:** name, link (the full `flookaa.com/communities/…` field, with `slug_taken` inline) and description.
2. **Look:** as on the channel, without the "Community's" swatch.
3. **Interests:** "n / 5".
4. **Rules:** a textarea with a counter of 5000 and the helper "Shown before anyone joins".
5. **Audience:**
   - Age chips.
   - Visibility as two `Radio Card`s (Public and Private), for the owner only. Managers see a read-only line.
   - The inline warning before Save: going private ends {n} follows, going public admits {n} pending requests.

### Members sheet

- **Members:**
  - Each row is `Person Row` with avatar, name (or anonymous name with a generated avatar), "Joined {date}", and an Owner or Moderator `Tag`.
  - The row `⋯` menu holds Remove (confirm dialog) on both entities. On the community it also holds Make moderator and Remove moderator (owner only), and Step down (your own row).
  - The owner's row has no menu.
- **Requests:** rows with Approve (primary, `sm`) and Reject (ghost). After an answer the row collapses.
- **Channel requests** (community only): a compact channel row (`Logo`, name, followers, "Requested by {persona}"), with Approve and Reject.
- The tab label carries the pending count as `Badge` `count`.

### States (one frame each)

- **Empty:** for Members (only you), Requests and Channel requests.
- **Loading:** `SkeletonRow` × 3.
- **Error:** `Error`, with retry.
- **Field errors:**
  - `invalid_name`
  - `slug_taken`
  - `invalid_rules` (too long)
  - `invalid_min_age` ("You can't set a limit above your own age")
  - no interest picked
  - logo upload failed
- **Save:** the section's Save loading, and the success toast.
- **Confirm dialogs:** remove member, take a channel out, go private, go public.
- **Look preview:** a frame in another palette (Ember) with a logo and cover picked.
- **Mobile:** both Manage sheets full length, and the Members sheet with the row menu open.
- **Dark:** one Deep Tide Dark frame of the channel Manage sheet.

## Open questions

1. **Two sheets (Manage + Members) per entity, or one tabbed sheet like today's channel sheet?**
   - I recommend two sheets.
   - Settings sections and people lists scroll very differently. Seven or eight tabs don't fit a phone.
   - The community already works this way.
2. **Channel Info (name and description):**
   - The backend can't edit them today.
   - I recommend designing the section and adding `name` and `description` to `PATCH /channels/:channel_id` in WWW-105, so a channel can fix a typo in its name.
   - Channel visibility stays read-only. Switching it needs its own rules (what happens to pending requests and private posts), so it would be a separate ticket.
3. **Community "Edit" entry:** with Manage in place, "Edit community" and "Create channel" sit in the `⋯` menu next to Manage. I propose: Copy link, Suggest a channel, then for managers Manage, Members & requests and Create channel.

## Decisions (user, 2026-10-29)

All three recommendations accepted: two sheets per entity (Manage + Members); channel Info (name, description) designed here, with the backend added to `PATCH /channels/:channel_id` in WWW-105 and visibility left read-only; community `⋯` menu = Copy link, Suggest a channel, then for managers Manage, Members & requests, Create channel.

## Done when

- Both Manage sheets, the Members sheet (channel and community variants), and every state listed above exist at desktop and mobile. They are built from Components/Patterns instances and bound variables only.
- Screenshots show no overlaps or clipped text, and contrast is AA in every palette shown.
- Ids are in `plans/WWW-77-figma-handoff.md`, and frame links are in WWW-105's Design section.

## Gotchas

- `whoami` must be Sara's account before any write.
- Reuse these instead of making new ones:
  - from WWW-97: `Theme Swatch`, `Cover Option`, `Radio Card`, `SettingsSection` layout (`119:330`)
  - from WWW-98: `Community Option` `130:17001` and the community picker frames
  - from WWW-118: `Person Row` `76:436`
- No RTL frames (WWW-91 / WWW-95).

## Build notes (2026-10-29)

- Each sheet is shown over its entity page (`Sunday League`, Forest; `Tech Builders`, Slate) and set in that palette. Manage frames are as tall as the whole sheet. Members frames are 900 px.
- Manage cards are the WWW-98 create-form cards, each with the WWW-97 settings `Footer` (Save, disabled until something changes). Look adds the live `Hero` Mobile preview on top. Interests keeps the count and Save in one footer row.
- Channel Audience shows visibility as a read-only `Tag` plus helper. Community Audience keeps the `Radio Card`s for the owner. A moderator sees the read-only line (States).
- New on Patterns:
  - `Person Row` `Type=Member`: the name with an Owner or Moderator `Tag` (`Show role`), "Joined …", and a `⋯` `Icon Button`. The owner's row hides the `⋯`.
  - `Channel Request Row`: `Logo`, name, "Asked by …", Approve and Reject.
- Row menu items: Make moderator / Remove moderator (owner only), View profile, Remove from community, and Step down on your own row.
- Mobile:
  - Manage is a full-screen page with a back arrow, and its `Section Nav` scrolls.
  - The Look preview fills the card width, and the logo buttons wrap.
  - Members is a full-screen sheet, and its third tab reads "Channels (1)".
- Deep Tide Dark: swatch palettes are set on each swatch's `Tile` only, so their labels follow the sheet's palette. The WWW-98 dark frame sets them on the whole swatch, which leaves its labels low-contrast on dark.
