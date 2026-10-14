# WWW-39 — Steps block

Branch `WWW-39-steps-block`, from `release-caterpie-v1010`. Epic WWW-13
(Portable Text custom blocks). Builds on WWW-24 (registry), WWW-29 (tokens)
and WWW-36 (insert UX), and follows the callout and quote pattern.

## Goal

A numbered sequence of steps, each with a title and optional text, for
recipes, guides and how-tos. You insert it from the "+" picker or with
`/steps`. The editor can add, remove and reorder steps. Its colours come from
theme tokens only, so a palette or persona theme restyles it.

## Shape (permanent)

```graphql
steps {
  _type, _key
  items: [StepItem!]!   # 1–20 steps, in order
}

StepItem {
  _key: ID!             # unique within the block
  title: String!        # required, one line
  text: String          # optional, multiline plain text
}
```

- **The `_type` is `steps`.**
- **Each item has a `_key`.** That's the Portable Text convention for arrays
  of objects. It gives React a stable key while steps are reordered, and lets
  a later feature (for example, linking to a step) point at one step. The
  frontend generates it when a step is added, and it never changes.
- **The numbers aren't stored.** A step's number is its position. There's no
  `start` field, and no block title: a heading text block above the steps
  does that job.
- **No Portable Text inside.** `title` and `text` are plain strings, as in
  the callout. Line breaks in `text` are kept.
- **`StepItem` has no `_type`.** It only exists inside `steps`, so nothing
  needs to tell it apart from other objects.

## Decisions

1. **Validation (Go, mirrored in zod):**
   - `items` holds 1 to 20 steps.
   - Each item has a non-empty `_key`, and the keys within a block are
     unique.
   - `title` must be non-blank after trimming, at most 120 UTF-16 units, and
     have no line breaks.
   - `text` is optional, with no limit of its own.
   - Every `title` and `text` counts toward the post's 4096-character limit,
     through `TextLength` in Go and `portableTextLength` on the frontend.
2. **A new list input for block forms.** Nothing in `FieldRender` edits an
   array today, so this adds:
   - `interfaceType: "list"` on `FormField`, with `itemFields: FormField[]`
     (the fields of one item), `minItems`, `maxItems` and `addLabel`.
   - `components/inputs/list/`: it renders each item as a small card with
     the item fields, a "Step N" label, and three icon buttons: move up, move
     down and remove. Up is hidden on the first item, down on the last, and
     remove when only `minItems` are left. An "Add step" button sits below
     the list and is hidden at `maxItems`. Buttons reach 44px on mobile.
   - Item fields reuse `TextInput` and `TextareaInput`, writing to
     `items.<i>.<name>` through Formik's `setFieldValue`.
   - Reordering uses buttons, not drag and drop: they work in the mobile
     sheet and from the keyboard. Drag can come later.
   - The input knows nothing about steps, so later list blocks (Accordion,
     Checklist, Gallery) can reuse it.
3. **Item keys.** The list input gives each new item a random 12-character
   key from `crypto.randomUUID()`. A new block starts with one empty step.
4. **Look.**
   - An `<ol>` with each step as an `<li>`. A numbered circle
     (`size-7 rounded-full bg-primary text-primary-foreground text-sm
     font-semibold`) sits at the start, and a thin `border-s` line in
     `border-border` joins the circles, stopping at the last one.
   - The title is `font-semibold text-foreground`. The text is
     `text-muted-foreground whitespace-pre-wrap` below it.
   - The numbers are drawn from the item's index, `aria-hidden`, because the
     `<ol>` already announces them.
   - No card background, no free colours and no outer margins. I'll check
     contrast on `/dev/themes` in light and dark for every palette.
5. **Direction.** Titles and texts get `dir="auto"`. The circle and the line
   use logical positioning (`start-*`, `border-s`), so in an Arabic post they
   sit on the right. The numbers stay Western digits.
6. **Form.** One field, Steps (a list), with item fields Title (text,
   required, placeholder "What to do") and Details (textarea, optional). It's
   edited through `BlockSurface` like the callout, and has no separate
   `Editor`.
7. **Registry.** The block goes in category `layout`, after Quote. Its title
   is "Steps" and its description is "A numbered how-to, one step at a time."
   The lucide icon is `ListOrderedIcon`. `examples` has a three-step recipe, a
   titles-only list, a single step, and an Arabic one.
8. **The numbered list style stays.** Text blocks already have numbered
   lists. They aren't changed. Steps is a separate block with a title and
   details per step and its own look.

## Steps

1. GraphQL (`portableText.graphqls`): add `steps` to `BlockType`, then
   `StepItem`, `StepItemInput`, `StepsBlock` and `StepsBlockInput`, and a
   `steps` field on both `Blocks` and `BlockInput`.
2. Go (`block-objects/steps.go`): write `parseSteps`, and add its cases to
   `ParseBlock`, `Key` and `TextLength`.
3. Run `make generate-models` in `shared/` against the local codegen Postgres,
   then `pnpm codegen` in `front-end/`.
4. Frontend list input: `"list"` in `FormFieldInterfaceTypes`, the new
   `FormField` options, `components/inputs/list/`, and its case in
   `FieldRender`.
5. `front-end/src/components/portable-text/blocks/steps.tsx`: write the
   schema, fields, `View` and examples, and add the block to `blocks`.
6. `portableTextLength`: count each step's `title` and `text`. The existing
   `objectTextFields` map only reads top-level strings, so steps gets its own
   case.

## Acceptance criteria

- "+" and `/steps` both offer Steps. The form opens with one empty step. You
  can add steps up to 20, remove them down to one, and move them up and down.
  Insert puts the numbered list in the post, and Edit reopens the form with
  the current steps in order.
- Numbers follow the order after a reorder. Line breaks in details show in
  Write, Preview and the feed.
- Preview flags a blank title, a title over 120 characters or with a line
  break, an empty list, more than 20 steps, and duplicate or missing item
  keys. The server refuses them too. Step text counts toward the
  4096-character counter, and the server enforces the same total.
- The block restyles under every palette on `/dev/themes` and reads in light
  and dark mode.
- An Arabic block reads right to left, with the circles and line on the right.
- The form works in the mobile sheet and from the keyboard.
- Existing posts render unchanged.
- `go build ./...` passes in `shared/` and `backend/`, and `pnpm build` and
  `pnpm lint` pass. The repo has no test runner.
- Deploy the backend before the frontend.

## Out of scope

- Images, links or rich text in a step.
- Drag-and-drop reordering.
- A custom start number, a block title, or nested steps.
- Ticking steps off (that's the Checklist, WWW-42).
