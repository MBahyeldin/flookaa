# WWW-42 — Checklist block

Branch `WWW-42-checklist-block`, from `release-caterpie-v1010`. Epic WWW-13
(Portable Text custom blocks). Builds on WWW-24 (registry), WWW-29 (tokens),
WWW-36 (insert UX) and the list form field from WWW-39 (Steps).

## Goal

A list of items with a tick state the **author** sets ("Packing list",
"What's done for the release"). Readers see the author's ticks and can't
change them. You insert it from the "+" picker or with `/checklist`. No server
state beyond the post itself, no realtime events. Colours from theme tokens
only.

## Shape (permanent)

```graphql
checklist {
  _type, _key
  title: String              # optional, one line
  items: [ChecklistItem!]!   # { _key, text: String!, checked: Boolean! }
}
```

Input: `ChecklistBlockInput { _type, _key, title: String, items: [ChecklistItemInput!]! }`,
`ChecklistItemInput { _key, text: String!, checked: Boolean }` (absent = false;
the output always carries `checked`).

- **The `_type` is `checklist`.**
- **`text`**, not `title`: an item is one short line of text, no details field.
  A details line can be added later as an optional field.

## Decisions

1. **Validation (Go, mirrored in zod):**
   - A key, the optional `title` through `checkTitle`.
   - 1 to 50 items (lists are longer than steps). Each item through
     `checkItem` (key present and unique, text required, ≤ 120 UTF-16 units,
     one line), with the error label "item".
   - `title` and item texts count toward the 4096-character limit
     (`TextLength` in Go, `portableTextLength` on the frontend).
2. **Display.**
   - Optional title like Steps (`text-lg font-semibold`, `dir="auto"`),
     linking the list with `aria-labelledby`.
   - A `<ul>` with no bullets; each row a lucide `CheckIcon` in a small
     rounded box (`bg-primary text-primary-foreground` when ticked,
     `border border-border` empty when not), then the text.
   - Ticked text is `text-muted-foreground line-through`, so done items read
     as done in every palette without a new colour.
   - A small "2 of 5 done" line under the title (`text-sm
     text-muted-foreground`), always shown, title or not.
   - No outer margins; rows mirror in RTL (`flex`, `gap`, `ms/me`).
3. **Static, really.** No `<input type="checkbox">` in the view: a disabled
   checkbox invites clicks and reads as "you can't" rather than "the author
   did". Each row instead has a visually hidden "Done: " / "Not done: "
   prefix, so a screen reader hears the state.
4. **Form.**
   - Title (text, optional, placeholder "Packing list").
   - Items (`list`, item label "Item", "Add item", min 1, max 50), each with
     Text (text, required) and Done (`switch`). The switch already renders
     inside list items through `FieldRender`.
   - Ticking happens in this form: the author edits the block to tick items.
     Clicking a row in the editor surface does nothing (it's the same `View`).
5. **Registry.** Category `layout`, after Countdown. Title "Checklist",
   description "A list of items you tick off.", icon `ListChecksIcon`.
   `examples`: a mixed list with a title, all done, none done without a
   title, and an Arabic one.

## Steps

1. GraphQL (`portableText.graphqls`): `checklist` in `BlockType`,
   `ChecklistBlock`, `ChecklistItem`, the two inputs, and a `checklist` field
   on `Blocks` and `BlockInput`.
2. Go (`block-objects/checklist.go`): `parseChecklist` and the cases in
   `ParseBlock`, `Key` and `TextLength`.
3. `make generate-models` in `shared/` against the local codegen Postgres,
   then `pnpm codegen` in `front-end/`.
4. Frontend plumbing: the `checklist` case in `normalizeBlocks` /
   `deNormalizeBlocks`, and `portableTextLength`.
5. `components/portable-text/blocks/checklist.tsx`: schema, fields, `View`,
   examples (and `toForm` / `fromForm` only if the switch needs `checked`
   defaulted to `false`), added to `blocks`.

## Acceptance criteria

- "+" and `/checklist` both offer Checklist. Insert puts it in the post, and
  Edit reopens the form with the same title, items, order and ticks.
- Ticked items show a filled check and struck-through muted text; unticked an
  empty box. Readers can't change them, in the feed or in Preview.
- A screen reader hears each item's state.
- Preview flags, and the server refuses: no items, more than 50, a missing or
  duplicate item key, an empty item, and a title or item text over 120
  characters or with a line break.
- Title and item texts count toward the 4096 counter, and the server enforces
  the same total.
- The block restyles under every palette on `/dev/themes` and reads in light
  and dark mode. An Arabic checklist reads right to left.
- The form works in the mobile sheet and from the keyboard.
- Existing posts render unchanged.
- `go build ./...` passes in `shared/` and `backend/`, and `pnpm build` and
  `pnpm lint` pass. The repo has no test runner.
- Deploy the backend before the frontend.

## Out of scope

- Readers ticking items (personal or shared): that's server state, like
  Poll (WWW-48).
- Ticking straight from the editor surface without opening the form.
- Nested items, due dates, assignees.
