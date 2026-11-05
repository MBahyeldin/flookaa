# WWW-109 — Composer as a slim bar that expands

Twelfth ticket of epic WWW-86, on top of WWW-82 (channel page, today's `ComposerBar` stub) and WWW-107 (blocks). Frontend only: no schema, resolver, mutation or backend change, and no codegen. The editor (`@portabletext/editor`), its plugins, the block registry and `CreatePost` stay as they are; this ticket rebuilds the frame around them.

Design: "Flookaa v2", Composer `16:496` (Collapsed / Expanded), in context Desktop / Channel `17:2`, Mobile `17:812`. WWW-118: writing with the `/` menu `86:16057`, Preview tab and invalid block `87:7783`, mobile insert sheet `86:16681`, Block Menu `83:11913`. Pulled read-only on 2026-10-23.

Posts have no title or kicker (WWW-78 rejected), so the Figma "Title (optional)" line is not built.

## Decisions (2026-10-23)

- **Formatting appears on selection.** No fixed toolbar: selecting text shows a floating toolbar (paragraph style, bold, italic, underline, strike-through, link, bullet and numbered list). Markdown shortcuts and Ctrl/⌘ keys keep working.
- **"Posting as {persona}" is a label**, no chevron. Switching persona stays in the sidebar.

## Collapsed bar (`ComposerBar`, same file)

As today: 32 px persona avatar, "Write in {channel}…", Image and Voice icons, one bordered `bg-card rounded-lg` row, members only. Changes:

- The Image and Voice icons become their own buttons (`aria-label` "Add an image" / "Add a voice note"): each opens the composer **and** that block's insert form at once. The rest of the bar opens the composer with the caret in the body.
- Desktop/tablet: expands in place (the bar is replaced by the composer card). Mobile (< 768, `useIsMobile`): opens the full-screen sheet below, the bar stays.

## Expanded composer (`components/post-creator`, rewritten in place)

One card, `bg-card` with a 1 px `border-primary` border while open, `rounded-lg`, 16 px padding.

1. **Header**: 28 px avatar + "Posting as {first} {last}" (14 medium). At the end, the **Write / Preview** tabs (the underline `Tabs` variant, as in `87:7783`); hidden until the draft has content, since previewing nothing is noise.
2. **Body**: the editor without its own border or background, so it reads as the card. Placeholder "Share something with the club…". Height grows with the content from 120 px up to 60vh, then scrolls (today it's a fixed 300 px box).
3. **Shortcut row**, above a `border-t`: ghost buttons with icon + label, **Image, Voice, Checklist, Steps, More blocks**. The first four open that block's insert form (the same `BlockSurface` + `ObjectForm` the `+` button uses); "More blocks" opens the full picker (list on desktop, `BlockGrid` sheet on mobile, as `86:16681`). The toolbar's `+` button goes away: this row replaces it. The `/` menu stays.
4. **Footer**: "Visible to everyone who can read this channel" (12 muted, globe icon) on the start side; **Cancel** (outline) and **Post** (`loading` while sending) on the end. Post is disabled while the draft is empty, over the limit or has an invalid block.

### Floating formatting toolbar

A new `toolbar/selection-toolbar.tsx`, mounted inside the editor in place of `PortableTextToolbar`. It shows while the selection is expanded inside a text block and the editor has focus, positioned above the selection rect (flipping below near the top of the viewport) with the existing `Popover` + `PopoverAnchor` measuring pattern the slash menu uses. It reuses the existing `StyleButton`, `DecoratorButton`, `AnnotationButton`, `ListButton` and `BlockObjectPopover` (each still mounted exactly once). Subscript, superscript and code are left out of it (rare; their keyboard shortcuts still work). `bg-card`, border, `shadow-sm` (it's a raised overlay). It never steals focus, so typing over the selection replaces it as usual.

`PortableTextToolbar` and `InsertBlockButton` are replaced (nothing else rendered them). The toolbar is force-mounted and hidden while closed, because the `@portabletext/toolbar` hooks start disabled and only enable on an editor event after they mount.

### Invalid blocks, inline (`87:7783`)

Today the composer says "n blocks need fixing — see Preview". Instead, in Write, each invalid block in the editor gets a 1 px `border-destructive` outline and, under it, "{Block}: {first issue}. Fix it to post." (12, `text-destructive`). The editor's `RenderBlock` reads the invalid keys from a small context the composer provides (from `validateBlocks`, already computed per change). Clicking the block opens its edit popover, as today. Preview keeps `showInvalid`.

### Length

The `n/4096` counter is hidden until the draft passes 90 % of the limit, then shows next to Post (`text-destructive` once over). Figma shows no counter; this keeps the warning without the noise.

### Cancel

Cancel with an empty draft closes at once. With content, a confirm dialog ("Discard this post?" / "Discard" destructive, "Keep writing"), the composer's own `Dialog` (`Dialog.context` is only an open flag). On the mobile sheet, Escape and ✕ do the same as Cancel. Not on the desktop card: Escape there belongs to the `/` menu, block forms and the selection toolbar. After a successful post the composer clears and collapses, as today.

## Mobile sheet

Below 768 the composer is a full-screen `Sheet` (`side="bottom"`, full height, no rounded top):

- **Top bar**: ✕ (same as Cancel) on the start side, "New post in {channel}" (14 medium) in the middle, **Post** (`size="sm"`) on the end.
- Then the header line (Posting as, Write/Preview), the body filling the height, and the shortcut row pinned to the bottom of the sheet, scrolling horizontally if it doesn't fit 390. The visibility note sits above the shortcut row. Shortcut buttons are 44 px tall.
- Block forms and "More blocks" open as the existing bottom sheets on top.
- The selection toolbar works the same way inside the sheet.

### Added during review (2026-10-23, asked by the user)

- The selection toolbar shows every decorator the server accepts (bold, italic, code, underline, strike-through, subscript, superscript) on desktop; on phones bold, italic and link stay inline and `⋯` swaps in the rest plus the lists (both groups stay mounted).
- Editor plugins turned on: markdown shortcuts, `:emoji` picker (restyled as a themed caret popover), link on paste over a selection, rich HTML paste.
- Posts render code, subscript, superscript and links (`safeUrl`, external links open in a new tab); the editor's heading and quote sizes match the display.
- Phones: the shortcut row is Image and "More blocks" (the full block grid sheet), since a sideways-scrolling row hid blocks.
- Editing a block: its Edit/Remove popover no longer closes when the selected block itself is clicked, a dismissed popover comes back on the next click on the block, and after Save the pill returns for another edit (the toolbar machine only reopens on a selection change, so clicking the block that was just inserted did nothing).
- Blocks are unchanged.

## Departures from Figma

1. No title line (WWW-78 rejected).
2. No persona chevron (decision above).
3. Formatting on selection: Figma doesn't show formatting at all.
4. Character counter near the limit only.
5. The mobile sheet has no frame; built from the Expanded variant at 390 as the ticket says.

## Steps

1. `post-creator`: new layout (header, borderless body, shortcut row, footer), tabs shown with content, counter rule, Cancel confirm, Escape.
2. Shortcut row: open a given block's form or the picker through `BlockSurface`; remove the toolbar `+`.
3. `selection-toolbar.tsx` replacing the fixed toolbar in `editor.tsx`; delete `PortableTextToolbar` and the flag if unused.
4. Inline invalid blocks: context from the composer, outline + message in `RenderBlock`.
5. `ComposerBar`: separate Image/Voice buttons, in-place expand on desktop, full-screen sheet on mobile.
6. Editor auto-height (120 px → 60vh).
7. CLAUDE.md: one line under Frontend conventions on the composer (slim bar, selection toolbar, shortcut row, mobile sheet).

## Verification

- `pnpm build` and `pnpm lint` in `front-end/`.
- Browser at 1440 and 390, `tide` and one other palette, light and dark, against `16:496`, `86:16057`, `87:7783`, `86:16681` (a channel page needs the dev API; otherwise checked on `/dev/themes` if the composer can mount there):
  - The bar opens the composer; its Image / Voice buttons open the composer with that form open.
  - Selecting text shows the floating toolbar; bold, a heading, a link and a list apply; typing over a selection works; it hides on collapse and blur.
  - Image, Voice, Checklist, Steps and More blocks insert blocks; `/` still works.
  - A callout with no description shows the red outline and message in Write and disables Post; fixing it enables Post.
  - Write/Preview appear only with content; Preview renders as the card will.
  - The counter appears past 3687 characters and turns red over 4096.
  - Cancel with a draft asks first; posting clears and collapses, and the post arrives live on the channel page.
  - Mobile: the sheet fills the screen, ✕ and Post work, the shortcut row stays above the keyboard.
  - Arabic text mirrors in RTL; the toolbar and shortcut row follow.

## Out of scope

- Title and kicker (rejected), persona switching in the composer.
- Composer anywhere but the channel page (the feed, WWW-112, decides whether it has one).
- Post editing, drafts saved across reloads, scheduled posts.
- Comment attachments (WWW-111).
