# WWW-92 — Cover image upload for channels and communities

Follow-up to WWW-80, which shipped generated cover patterns only. Managers can upload a photo cover through `s3` and drag it to choose what stays in view. It replaces the pattern wherever the cover is shown, and removing it brings the pattern back. Personas are out of scope.

Who can change it is unchanged: `CanManage` on a community, `CanModerate` on a channel.

## Order of work

1. **Figma first.** Add the photo variant to `Hero` (`14:257`, Desktop and Mobile) and, in the WWW-99 identity section, the upload control, the drag state and the two-width preview. Check `whoami`, use the `figma-use` skill, and record new ids in `plans/WWW-77-figma-handoff.md`.
2. **User approves the design.**
3. Backend, then frontend.

## Decisions

1. **Reuse the `banner` column for the photo.** WWW-80 left this open. `channels.banner` and `communities.banner` already exist (`VARCHAR(255) NOT NULL`), are on the list and single responses, and are `bannerImageUrl` in GraphQL (already in `GetChannel`). Only the position needs new columns.
2. **No scrim.** The ticket asks for `hero-overlay` to keep hero text readable, but text never sits on the cover since WWW-82, so there is nothing to protect. The token stays for later use.
3. **Drag positioning, not a crop tool.** The band is roughly 4:1 or wider on desktop and about 2.6:1 on a phone, so a normal photo loses most of its height and a centre-crop can cut off the subject. A cropped rectangle has one ratio and the band's ratio changes with the width, so we store a focal point and keep the original file. The browser crops around that point at every width (`object-cover` + `object-position`). The ticket's 3:1 and 16:9 are dropped, and hero heights stay as they are (150 px on mobile, 280 px from `md`). One focal point can't guarantee the same framing on desktop and phone, so the editor shows both. Separate framing per width would be a later ticket.
4. **Manage sheets and create forms.** Both channel and community create forms take the photo and its position (added after QA, at the user's request), so nobody has to create first and open Manage after.
5. **The pattern stays stored underneath.** Removing a photo sets `banner: ""` and the chosen pattern shows again. The pattern picker stays visible, labelled as the fallback while a photo is set.

## Data

Migration `043_cover_position` (up and down) adds to both `channels` and `communities`:

- `banner_x SMALLINT NOT NULL DEFAULT 50`
- `banner_y SMALLINT NOT NULL DEFAULT 50`
- A CHECK that each is 0–100.

The values are percentages, so 50/50 is a centre-crop. `shared/external/db/postgres/schemas/channel.sql` and `community.sql` follow.

## Backend

| Change | Detail |
|---|---|
| `backend/internal/logo` | `Valid` is the same rule covers need (empty or an s3 file URL). Reuse it, with a short name note if needed. |
| `PATCH /channels/:channel_id` | Add `banner` (absent = unchanged, `""` = remove), 400 `invalid_cover`, and `banner_x`, `banner_y` (absent = unchanged), 400 `invalid_cover_position` outside 0–100. `UpdateChannel` gains the three `COALESCE(sqlc.narg(...))` fields and the answer returns them. It already publishes `info.update`. |
| `PATCH /communities/:community_id` | `banner` is already accepted and written, but not validated. Add 400 `invalid_cover` to `lookError`, and `banner_x`, `banner_y` as on channels. `UpdateCommunity` gains the two position fields. It already publishes `info.update`. |
| `POST` create, both | `banner` is accepted unvalidated today. Add the same check, so an external image can't be set through the API. `banner_x`, `banner_y` are taken too, optional, and default to the centre, so the seeder is unchanged. |
| Responses | `banner_x`, `banner_y` next to `banner` on channel list items and `Community` responses. |
| `ListShowcaseCommunities` | Add `c.banner`, `c.banner_x`, `c.banner_y`, and the same fields on `ShowcaseCommunity`, so the visitor home shows photos. |
| GraphQL `Channel` | Add `bannerX: Int!`, `bannerY: Int!` in `schema.graphqls`, set in the resolver next to `BannerImageURL`, and add both to `GetChannel.graphql`. |

Then `make generate-models` in `shared/` and `pnpm codegen` in `front-end/`. The backend deploys before the frontend, with migration 043 applied first.

**Existing data:** no UI has ever written `banner`, so every row should be `''`. Before deploying, run this once:

```sql
SELECT 'channels', count(*) FROM channels WHERE banner <> ''
UNION ALL SELECT 'communities', count(*) FROM communities WHERE banner <> '';
```

Any non-empty row was set directly through the API and would start rendering, so it gets looked at before the deploy.

## Frontend

- **`components/cover`:** optional `src` and `position` (`{x, y}`) props. When set it renders an `<img>` with `object-cover`, `object-position: x% y%`, empty `alt` and responsive `srcSet`. It falls back to the pattern on `onError`, so a broken file never leaves a blank band. `responsiveImage.ts` stays where it is and gains `fullWidthImage`, because a cover is drawn at the full window width, not the post column's.
- **Heroes:** `ChannelHero` passes `channel.bannerImageUrl` and its position, `CommunityHero` passes `community.banner` and its position. `visitor.tsx` passes the showcase fields.
- **`components/create-form/CoverUpload`:** new, same states as `LogoUpload` (upload, replace, remove, uploading, try again, server error), through `uploadFile`, same accepted types. The upload logic it shares with `LogoUpload` moves to `create-form/useFileUpload`.
- **`components/manage/CoverPositioner`:** new, shown once a photo is set.
  - **Drag:** the photo is dragged inside a band at the desktop ratio, with pointer events for mouse and touch and no library. Dragging follows the finger, and the axis that has no overflow doesn't move.
  - **Keyboard:** the band is focusable and the arrow keys move the point, with an accessible name from i18n. The percentages are physical, so they don't flip in RTL; the drag follows the pointer either way.
  - **Second preview:** a small band at the phone ratio updates alongside, so the phone framing is visible while dragging.
  - **Reset:** a new photo goes back to 50/50.
- **`components/manage/LookSection`:** `Look` gains `banner`, `banner_x`, `banner_y`, sent only when changed like the other fields. `CreatePreview` takes an optional `banner` and position so the preview shows the photo. `invalid_cover` and `invalid_cover_position` map to the new field.
- **`channels/create` and `communities/create`:** `CoverUpload` above the pattern picker, and the fields sent on create.
- **Services and types:** `banner`, `banner_x`, `banner_y` on the channel, community and showcase types and on both update calls.
- **i18n:** new strings, `errors.invalid_cover` and `errors.invalid_cover_position` in `en` and `ar`, with `_female` variants where the Arabic addresses the reader.

## Realtime

Nothing new. `info.update` already makes both pages refetch, so open pages get the new cover live.

## Docs

`CLAUDE.md`, the **Look** paragraph under Channel access: covers are a pattern plus an optional photo in `banner` with its focal point in `banner_x`/`banner_y` (migration 043), the `invalid_cover` and `invalid_cover_position` codes, and remove the "photo covers are WWW-92" note.

## Checks

There are no automated tests in this repo. `pnpm build` and `pnpm lint`, `go build` for `backend`, then in the browser:

- Upload, replace and remove on a channel and a community, in the manage sheet.
- Drag with a mouse and by touch, move with the arrow keys, and save: the hero shows the same framing after a reload.
- A tall photo and a panoramic photo both drag along the right axis, and a new photo resets to centre.
- `PATCH` with `banner_x: 101` answers 400 `invalid_cover_position`.
- A second tab on the page updates live, including a position change.
- Desktop and mobile widths, Arabic RTL, and light and dark.
- A non-manager gets 403 and sees no control.
- `PATCH` with an external URL answers 400 `invalid_cover`.
- A broken file falls back to the pattern.
- The visitor home shows a community's photo.
