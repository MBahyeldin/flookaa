# WWW-36 — Block insert UX for mobile and desktop

Branch `WWW-36-block-insert-ux`, from `release-caterpie-v1010`. Epic WWW-13
(Portable Text custom blocks). Depends on WWW-24 (block registry), which is
in the release branch. Frontend only.

## Goal

Inserting and editing blocks scales from today's two blocks to the dozen
coming in WWW-37..44, on both a phone and a desktop:

- On mobile, a "+" button opens a bottom sheet with a grid of blocks, and
  editing a block opens in a sheet.
- On desktop, you can insert with the same "+" in the toolbar or by typing
  `/`. Editing a block happens in a popover next to it.
- Every container shows the same form component.

## What's there today

- `PortableTextToolbar` renders one `BlockObjectButton` (a toggle icon) per
  block. On mobile they're buried in the "…" overflow menu. Twelve blocks
  would mean twelve unlabeled icons.
- `BlockObjectButton` opens a centred `Dialog` with `InsertBlockObjectForm`.
  It sends `insert` even for blocks with no fields (`break`), after an empty
  form and an Insert click.
- `BlockObjectPopover` (on a selected block) shows Edit and Remove. Edit
  opens a second `Dialog` with `ObjectForm`.
  - `ObjectForm` duplicates `InsertBlockObjectForm`. It passes
    `defaultValues[field]` as each field's `value` instead of the live
    `values`. That's harmless today, because the inputs keep their own state
    from `initValue`.
  - The popover is mounted inside `secondaryGroups`, so on mobile it exists
    only while the "…" menu is open. Tapping a block there shows no
    Edit/Remove.
  - The popover also assigns `window.onscroll` and the editable's `onscroll`
    directly, on every render, which clobbers any other handler.
- There's no slash menu. `plugin-emoji` shows the trigger-character pattern
  (a behavior on `insert.text`), but as an 870-line xstate machine.
- `ui/sheet.tsx` (with `side="bottom"`) and `ui/popover.tsx` both exist.
  `useIsMobile` breaks at 768px. No new dependencies are needed.

## Decisions

1. **One form: `ObjectForm`.** `InsertBlockObjectForm` is deleted, and
   `ObjectForm` is the only form. It's kept generic, because the link
   annotation uses it too. It takes `fields`, `defaultValues`, `submitLabel`
   ("Insert" / "Save") and `onSubmit`, and passes the live Formik `values`. It
   doesn't validate with the zod schema here. WWW-55's preview gate already
   catches invalid blocks before Post, and adding a second validation UX now
   would be scope creep.
2. **One responsive container: `BlockSurface`** (`toolbar/block-surface.tsx`). It takes `open`,
   `onOpenChange`, `title`, an `anchor` and `children`.
   - On mobile it's a `Sheet side="bottom"`: `max-h-[85dvh]`, and it scrolls.
     The shared sheet close button becomes 44px.
   - On desktop it's a `Popover`, on its trigger or on a measured anchor.
     It uses `w-80`, `max-h-[70vh] overflow-y-auto` and
     `collisionPadding`, so it flips instead of leaving the screen.
   - Insert and edit both go through it. That's "same form component in both
     containers".
3. **One "+" insert button replaces the per-block toggles.** It sits at the
   right end of the toolbar, outside the overflow menu, on every width.
   - Mobile: it opens the **picker sheet**. That's a 2-column grid of tiles
     (icon, title, one-line `description`), grouped under category headings
     (`media`, `layout`) in registry order. Tapping a tile moves the same
     sheet to that block's `BlockForm`, with a back arrow to return to the
     grid.
   - Desktop: it opens a **picker popover** with a single-column list
     (icon, title, description) and arrow-key navigation. Picking moves the
     same popover to the form.
   - A block with no `fields` (`break`) is inserted at once, and the picker
     closes. No empty form.
4. **Slash menu, on desktop and mobile.** `toolbar/plugin.slash-menu.tsx`
   - **Trigger:** `/` typed as the first character of an empty text block.
     This keeps URLs, "and/or" and dates from triggering it. The menu shows
     while that block's whole text matches `^/[\w-]*$`, and the caret is at
     its end.
   - **Filtering:** the text after `/` filters blocks by title, then name.
     The match is a case-insensitive prefix, falling back to substring.
   - **Keys:** ↑/↓ moves, Enter picks, and Escape closes and leaves the text.
     They're registered as behaviors on `keyboard.keydown`, guarded on the
     menu being open, so they don't reach the editor. With no matches the
     menu shows "No blocks match" and Enter does nothing.
   - **Picking:** it deletes the `/query` text, then either inserts the
     block directly (no fields) or opens `BlockSurface` anchored at the
     caret rect.
   - **How it's built:** it doesn't copy the emoji machine. It reads the
     focus block with `useEditorSelector` and registers only the key
     behaviors. It's on by default as a new `slashMenuPlugin` feature flag.
   - Mobile keeps "+" as the main path; `/` simply works there too.
5. **Editing a block.** Selecting a block object still shows the small
   Edit / Remove bar (`BlockObjectPopover`). Edit now opens
   `BlockSurface` (a sheet on mobile, a popover on desktop anchored to
   the block) instead of a `Dialog`.
   - The bar anchors to the block element through Radix `virtualRef`, with
     `hideWhenDetached`, so it follows scrolling. The `onscroll` handlers are
     removed instead of moved.
   - The popover is mounted at toolbar level, outside the "…" menu, so it
     works on mobile.
6. **Touch targets of at least 44px on mobile.** On mobile, toolbar buttons,
   picker tiles, sheet actions and the Edit/Remove bar get `min-h-11
   min-w-11`. Desktop sizes stay as they are.
7. **Colours from semantic tokens only** (`bg-popover`, `bg-accent`,
   `text-muted-foreground`), so persona themes (WWW-30..33) restyle the
   picker too.
8. **Retired blocks: not yet.** No block is retired, so there's no `hidden`
   flag yet. The picker reads `blocks` in one place (`insertableBlocks()`),
   so it can be added there when the first block retires.

9. **Text direction in Preview and the feed** (added during review; the
   user asked to fix it on this branch). The editor sets `dir="rtl"` on Arabic
   lines, but `displayBlocks` renders plain `<p>`/`<li>`, so mixed
   Arabic/English text reorders in Preview and the feed. Every displayed text
   block, list and list item gets `dir="auto"`, and so does the image caption.
   Quote and list indents use logical `ps`/`border-s`.

## Steps

1. `ObjectForm` as the one form; delete `InsertBlockObjectForm`.
2. `BlockSurface` (sheet / popover by `useIsMobile`).
3. `BlockPicker` (grid on mobile, list on desktop) and the "+" toolbar
   button. Remove `BlockObjectButton` and its overflow-menu group.
4. `BlockObjectPopover`: Edit through `BlockFormSurface`, scroll handlers
   in an effect, 44px targets on mobile.
5. Slash-menu plugin, its feature flag, and its mount in `editor.tsx`.

## Acceptance criteria

- Mobile (< 768px):
  - "+" is always visible in the toolbar.
  - It opens a bottom sheet with Image and Break as tiles. Image opens its
    form in the same sheet, and Insert places it. Break inserts immediately.
  - Tapping a block, then Edit, opens its form in a bottom sheet with the
    current values. Changes show as you type, and Save updates the block.
  - Every tappable control there is at least 44×44px.
- Desktop:
  - "+" opens a list popover; arrows, Enter and click all work.
  - In an empty line, typing `/im` shows Image; Enter removes `/im` and
    opens the Image form beside the caret.
  - `/br` + Enter inserts a break with no form.
  - Escape closes the menu and leaves `/im` as text.
  - Typing `a/b` mid-line, or `/` in a non-empty line, shows no menu.
  - Editing a block opens its form in a popover next to the block.
- The previous dialogs are gone. Posting, Preview (WWW-55) and the feed are
  unchanged.
- An Arabic line with English words reads in the same order in Write,
  Preview and the feed. Its list markers and quote bar sit on the right.
- `pnpm build` and `pnpm lint` pass. There's no test runner in the repo, so
  there are no tests to add.

## Out of scope

- New blocks (WWW-37 onwards) and the in-app blocks gallery (WWW-45).
- Drag-to-reorder blocks.
- Inline schema validation in the form (WWW-55's Preview gate covers it).
- Moving text formatting out of the toolbar on mobile.
