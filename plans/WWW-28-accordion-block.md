# WWW-28 — Accordion block

Branch `WWW-28-accordion-block`, from `release-caterpie-v1010`. Epic WWW-13
(Portable Text custom blocks). Builds on WWW-24 (registry), WWW-29 (tokens),
WWW-36 (insert UX) and WWW-39 (the list input), and follows the Steps pattern.

## Goal

A list of collapsible sections, each a title that opens to show its text, for
FAQs, rules and long details. You insert it from the "+" picker or with
`/accordion`. The editor can add, remove and reorder sections with the list
input from WWW-39. Its colours come from theme tokens only, so a palette or
persona theme restyles it.

## Shape (permanent)

```graphql
accordion {
  _type, _key
  title: String              # optional, one line, above the sections
  items: [AccordionItem!]!   # 1–20 sections, in order
  allowMultiple: Boolean     # optional, absent = true
  defaultFirstOpen: Boolean  # optional, absent = false
}

AccordionItem {
  _key: ID!                  # unique within the block
  title: String!             # required, one line
  text: String!              # required, multiline plain text
}
```

- **The `_type` is `accordion`.**
- **An optional block title**, like the callout's: at most 120 UTF-16 units,
  no line breaks. It sits above the sections and names the whole block
  ("Frequently asked questions").
- **Steps gets the same `title` field** in this ticket (`StepsBlock.title`,
  `StepsBlockInput.title`). WWW-39 left it out in favour of a heading text
  block, but a title that belongs to the block moves and deletes with it.
  It's a new optional field, so existing steps blocks are unchanged.
- **`AccordionItem` is its own type**, not a reuse of `StepItem`. The two
  look alike today, but each block's fields must be free to grow on their
  own, and a shared type would tie them together for good.
- **`text` is required.** A section with nothing inside has nothing to open.
- **Two optional behaviour flags.** `allowMultiple` (default `true`) lets
  readers keep several sections open; `false` closes the others when one
  opens. `defaultFirstOpen` (default `false`) opens the first section on
  load. Both are nullable, so posts written without them keep the defaults,
  and Go stores exactly what was sent rather than filling in defaults.
- **Readers' open state isn't stored.** What a reader opens lasts until they
  leave the page.
- **No Portable Text inside.** `title` and `text` are plain strings, as in
  Steps. Line breaks in `text` are kept.

## Decisions

1. **Validation (Go, mirrored in zod):**
   - `items` holds 1 to 20 sections.
   - Each item has a non-empty `_key`, and the keys within a block are
     unique.
   - `title` must be non-blank after trimming, at most 120 UTF-16 units, and
     have no line breaks.
   - `text` must be non-blank after trimming, with no limit of its own.
   - Every `title` and `text` counts toward the post's 4096-character limit,
     through `TextLength` in Go and `portableTextLength` on the frontend.
     The block `title` counts too, in both blocks.
   - The optional block `title` is checked as in the callout. Steps,
     Accordion and Callout share one `checkTitle` helper.
   - The item checks are the same as Steps', so `steps.go` and the new
     `accordion.go` share one small helper for keys and titles instead of
     copying the loop.
2. **Native `<details>`/`<summary>`.** Each section is a `<details>`, so it
   opens with a click, Enter or Space with no JavaScript, screen readers
   announce it as expandable, and the browser's find-in-page opens a closed
   section that holds the match. No new dependency and no shadcn accordion.
   - `defaultFirstOpen` sets `open` on the first `<details>` at mount only;
     after that the reader is in charge.
   - `allowMultiple: false` uses an `onToggle` handler: when a section opens,
     the block closes its other sections through refs. I'm not using the
     native exclusive `<details name>` because older Safari and Firefox
     ignore it, and the block should behave the same everywhere.
   - Find-in-page opening a section also fires `onToggle`, so the one-open
     rule holds there too.
3. **Look.**
   - The block title, when set, is a `font-semibold text-lg text-foreground`
     line above the box with `dir="auto"`, and the box is
     `aria-labelledby` it. Steps shows its title the same way above the
     `<ol>`.
   - One rounded `border border-border` box, with sections divided by
     `divide-y divide-border` and a `bg-card` fill.
   - The summary is a row with the title (`font-semibold text-foreground`)
     and a `ChevronDownIcon` at the end that turns 180° when open. The
     default disclosure marker is hidden. The row reaches 44px on mobile, and
     has a `focus-visible` ring in `ring`.
   - The text is `text-muted-foreground whitespace-pre-wrap` under the title,
     with the same inner padding.
   - No free colours and no outer margins. I'll check contrast on
     `/dev/themes` in light and dark for every palette.
4. **Direction.** Titles and texts get `dir="auto"`. The chevron uses
   logical spacing (`ms-auto`), so in an Arabic post it sits on the left.
5. **In the editor.** The block renders through `BlockSurface` with the same
   `View` as the feed, so sections can be opened there to check them. The
   form, not the preview, is where text is changed.
6. **Form.** A Title text field (optional, placeholder "Frequently asked
   questions"; "How to …" for Steps) first in both blocks, then Sections (a list, `itemLabel` "Section",
   `addLabel` "Add section"), with item fields Title (text, required,
   placeholder "Question or heading") and Content (textarea, required). Below
   it, two switches with the existing `SwitchInput`: "Allow several open"
   (on by default) and "Open the first section" (off by default). A new
   block starts with one empty section. No separate `Editor`.
7. **Validation of the flags.** Both are plain booleans, so there's nothing
   to check beyond the GraphQL type. zod has them as `z.boolean().optional()`.
8. **Registry.** The block goes in category `layout`, after Steps. Its title
   is "Accordion" and its description is "Sections that open on tap." The
   lucide icon is `ChevronsUpDownIcon`. `examples` has a three-question FAQ
   with the defaults, a one-at-a-time FAQ with the first section open, a
   single section with a multi-line text, and an Arabic one.

## Steps

1. GraphQL (`portableText.graphqls`): add `title: String` to `StepsBlock`
   and `StepsBlockInput`. Add `accordion` to `BlockType`, then
   `AccordionItem`, `AccordionItemInput`, `AccordionBlock` and
   `AccordionBlockInput` (both with the nullable `allowMultiple` and
   `defaultFirstOpen`), and an `accordion` field on both `Blocks` and
   `BlockInput`.
2. Go (`block-objects/accordion.go`): write `parseAccordion`, pull the shared
   key/title checks out of `parseSteps`, and add the cases to `ParseBlock`,
   `Key` and `TextLength`.
3. Run `make generate-models` in `shared/` against the local codegen Postgres,
   then `pnpm codegen` in `front-end/`.
4. `front-end/src/components/portable-text/blocks/accordion.tsx`: write the
   schema, fields, `View` and examples, and add the block to `blocks`.
5. `portableTextLength`: count each section's `title` and `text`, next to
   the steps case.

## Acceptance criteria

- "+" and `/accordion` both offer Accordion. The form opens with one empty
  section. You can add sections up to 20, remove them down to one, and move
  them up and down. Insert puts the accordion in the post, and Edit reopens
  the form with the current sections in order.
- In Write, Preview and the feed, sections open and close on click, Enter
  and Space. Line breaks in the content show.
- With the defaults (or a block saved without the flags), every section
  starts closed and sections open independently.
- With "Open the first section" on, the first section is open on load and
  can be closed.
- With "Allow several open" off, opening a section closes the one that was
  open, including when find-in-page opens it.
- Edit reopens the form with both switches as saved.
- Preview flags a blank title or content, a title over 120 characters or with
  a line break, an empty list, more than 20 sections, and duplicate or
  missing item keys. The server refuses them too. Section text counts toward
  the 4096-character counter, and the server enforces the same total.
- Steps still validates its items exactly as before after the shared helper.
- Both blocks take an optional title. It shows above the block, Edit reopens
  it, it counts toward the 4096 limit, and Preview and the server refuse one
  over 120 characters or with a line break. Steps and accordions saved
  without a title render as before.
- The block restyles under every palette on `/dev/themes` and reads in light
  and dark mode.
- An Arabic block reads right to left, with the chevron on the left.
- The form works in the mobile sheet and from the keyboard.
- Existing posts render unchanged.
- `go build ./...` passes in `shared/` and `backend/`, and `pnpm build` and
  `pnpm lint` pass. The repo has no test runner.
- Deploy the backend before the frontend.

## Out of scope

- Rich text, images or links inside a section.
- Remembering which sections a reader opened.
- Opening a section other than the first by default.
- Nested accordions.
- Hiding content from readers (that's the Spoiler, WWW-40).
