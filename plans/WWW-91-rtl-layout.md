# WWW-91 — RTL layout

Arabic sets `<html dir="rtl">` (WWW-90) and the sidebar already moves (WWW-124). This ticket mirrors the rest of the app, and makes user text pick its own direction in either UI language. Frontend only.

Reference: Figma RTL page `3:9` (Channel, Community, Post, Onboarding 2 at 1440 and 390) for **what mirrors**. Those frames are stale clones until WWW-95, so content and layout come from the LTR frames.

## Where it stands

Most of the code already uses logical classes (`ms-`/`pe-`/`start-`/`border-s`, …), and post bodies, blocks and comments already have `dir="auto"`. A grep turns up 48 physical left/right classes in about 30 files, plus a few unmirrored arrows. They're listed below.

## Changes

**Rule:** a class that means "toward the start or end of the text" becomes logical (`ml-` → `ms-`, `pl-` → `ps-`, `left-` → `start-`, `border-l` → `border-s`, `rounded-l` → `rounded-s`, `text-left` → `text-start`, `space-x` → `gap-x`). Centring (`left-1/2 -translate-x-1/2`, the dialog's `left-[50%]`), Radix `data-[side=left|right]` (physical by design) and optical nudges (the play icon's `translate-x-px`) stay as they are.

### UI primitives (`components/ui/`)
- `sheet.tsx`: new `side` values `"start"` / `"end"` (`start-0`/`end-0`, `border-e`/`border-s`, slide animations swapped under `rtl:`), with `"end"` as the default. The close button goes `right-2` → `end-2`. `left`/`right` stay physical. Every side sheet then opens from the end: ManageSheet, MembersSheetFrame, FollowersSheet, the InterestFilter sheet, the onboarding persona sheet.
- `sidebar.tsx`: mobile sheet `side="start"`, replacing the `direction()` ternary from WWW-124. The swipe hook keeps its physical side.
- `dropdown-menu.tsx`: `pl-8`/`pr-2.5`/`left-2`/`ml-auto` become logical, and the sub-menu chevron gets `rtl:rotate-180`.
- `select.tsx`: `pr-8 pl-2 right-2` become logical.
- `switch.tsx`: the thumb moves the other way in RTL (`rtl:data-[state=checked]:-translate-x-[calc(100%-2px)]`).
- `toggle-group.tsx`: `rounded-l/r` and `border-l` become logical.
- `table.tsx`, `navigation-menu.tsx`, `dialog.tsx` close button (`right-4` → `end-4`): logical.
- `breadcrumb.tsx` and `app-breadcrumb`: the separator chevron gets `rtl:rotate-180`.

### App components
`portable-text/editor.tsx` (drag handle), `PostContent.tsx`, `blocks/image.tsx` (alignment `mr-auto`/`ml-auto`), `blocks/gallery.tsx` strip, `toolbar/block-surface.tsx`, `app-sidebar` (`pl-3`, the badge `-right-1`), `SidebarNavItem`, `settings/SettingsSection`, `post-card` (`mr-2`, PostHeader `space-x-3` → `gap-3`), `post-comment` (`pl-4 border-l-2` → `ps-4 border-s-2`), `mobile-header`, `notifications/*`, `inputs/voice`, `pages/home/visitor`, `SuggestChannelDialog`, `pages/(dashboard)/notifications`.

### Radix direction
Radix reads `dir` from its own `DirectionProvider`, not from `<html dir>`. Without it, tabs, toggle groups and menus keep LTR arrow-key order, and sub-menus open to the right. `App` wraps everything in `DirectionProvider dir={direction()}` (`@radix-ui/react-direction`, already a transitive dependency, now direct), keyed on the language like the rest of the app.

### Directional icons
Back arrows get `rtl:-scale-x-100`, the same as ChannelBar: `create-form/CreatePage`, `manage/ManageSheet`, `manage/MembersSheetFrame`, `persona-manager/[id]`, `toolbar/block-surface`. The Log out icon and the Send icons (comment box, Suggest a channel) mirror too.

`text-left`/`text-right` become `text-start`/`text-end` everywhere: buttons, radio cards, dialog headers, onboarding errors.

Kept physical: the image block's `left`/`right` alignment (the author picked a side) and the full-screen gallery viewer's `left-0 translate-x-0` (it undoes the dialog's centring).

### User content picks its own direction
- **Display:** `dir="auto"` on user text outside post bodies: the hero `name`/`tagline`, the about-block description and rules, tile names and descriptions, persona names and bios (`persona-link` card, `persona-row`, profile hero), community and channel names in the notifications list, the channel bar.
- **Names inside UI sentences**: `PersonaLink` wraps its children in `<bdi>`, which covers `<Trans>` sentences ("Created by …"). Names in plain `t()` sentences go through `isolate()` from `@/i18n` (FSI…PDI, the plain-text `<bdi>`): notifications, "Replying to …", the composer's "Posting as …", the rules dialog title, the invite banner, the empty wall, and the Suggest a channel dialog. Toasts and `confirm()` text are left alone. Isolating every value globally through i18next's `escape` was rejected: `<Trans>` then stops HTML-escaping values before it parses tags.
- **Truncated lines** (account card and menu, persona row and card, PersonaLink, tiles, profile Connected, post page bars) put `dir="auto"` on the truncating element itself, so an other-script name is cut at its own end, and add `text-match-parent` (a utility in `index.css`) so it still lines up with the UI. `<bdi>` only fixes order, not the cut side. `@handles` get `dir="ltr"`.
- **Typing:** `dir="auto"` on free-text fields, but only once they have text: an empty `dir="auto"` field resolves to LTR in Chromium even on an RTL page, which would put Arabic placeholders and the caret on the left. This covers each block style in the post editor (from the block's spans), the comment `SimpleInput`, `Textarea`, and `Input` of type text or search, set in the primitives. `Input` of type email, password, URL or tel, and the slug fields (community link, persona handle, admin slug), get `dir="ltr"`, since they're always Latin.

## Not changing
- Figma (WWW-95 refreshes the RTL frames).
- Emails, block `examples` and `/dev/*` pages, apart from what the shared components above change for free.
- Physical swipe gestures: the sidebar swipe already follows its side (WWW-124).

## Check
- `pnpm build`, `pnpm lint`, and the grep from "Where it stands" coming back with only the kept cases.
- Playwright, logged in, in English and Arabic at 1440 and 390: channel page, community page, post page and onboarding (against the Figma RTL frames), the Manage and Members sheets, dropdown submenus, select, switch, toggle group, breadcrumbs, back buttons, and the composer typing Arabic in the English UI and the reverse.
