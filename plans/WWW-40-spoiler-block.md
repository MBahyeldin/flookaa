# WWW-40 — Spoiler block

Branch `WWW-40-spoiler-block`, from `release-caterpie-v1010`. Epic WWW-13
(Portable Text custom blocks). Builds on WWW-24 (registry), WWW-29 (tokens)
and WWW-36 (insert UX).

## Goal

Content hidden behind a blur until the reader chooses to see it, with an
optional label saying what it hides ("Finale spoilers"). You insert it from
the "+" picker or with `/spoiler`. In this first version the content is
text; the shape already holds any post block, so images and other blocks can
be allowed later without changing it. Colours come from theme tokens only,
so a palette or persona theme restyles it.

## Shape (permanent)

```graphql
spoiler {
  _type, _key
  label: String          # optional, one line, shown while hidden and after
  content: [Blocks!]!    # the hidden blocks, same union as a post's blocks
}
```

Input: `SpoilerBlockInput { _type, _key, label: String, content: [BlockInput!]! }`.

- **The `_type` is `spoiler`.**
- **`label` is optional**: at most 120 UTF-16 units, no line breaks, checked
  by the existing `checkTitle` helper (with the error saying "label"). It's
  named `label`, not `title`, because it describes what's hidden rather than
  heading the content.
- **`content` reuses the post's own block union** (`Blocks` /
  `BlockInput`), not a spoiler-only type. A future image in a spoiler is then
  the same image block as in a post, with the same parser, renderer and
  stored form, and allowing it is a validation change, not a schema change.
  A spoiler-only union would have to copy every block it ever allows.
- **Version 1 allows only plain text blocks in `content`**: `block` with
  style `normal`, no `listItem`, no marks and no `markDefs`. That's exactly
  what the v1 form can write and read back, so Edit never loses anything.
  Any other block type, including a nested spoiler, is refused. Widening
  this later (marks, lists, images) is a new ticket.
- **Readers' reveal state isn't stored.** A revealed spoiler is hidden again
  when the reader leaves the page.

## Decisions

1. **Validation (Go, mirrored in zod):**
   - A key, and the label checks above.
   - `content` holds 1 to 20 blocks, each parsed by the same `parseBlock` as
     a top-level text block, then checked against the v1 allow-list. The keys
     of the content blocks are unique within the spoiler.
   - At least one content block has non-blank text.
   - `label` and every content span count toward the post's 4096-character
     limit: `TextLength` recurses into `content` in Go, and
     `portableTextLength` does the same on the frontend.
2. **Stored and read like top-level blocks.** In Mongo and `rawContent`,
   `content` is a list of the same `{ block: {...} }` envelopes as the post.
   `deNormalizeBlocks` recurses into a spoiler's `content`, and the code that
   wraps editor blocks into envelopes for the mutation does the same, so the
   `View` gets plain Portable Text.
3. **Rendering the content.** The `View` renders `content` with
   `<PortableText>` and the same display components as `PostContent`
   (`displayBlocks`), so text inside a spoiler looks like text in the post,
   `\n` inside a span renders as a line break, and a later image block needs
   little spoiler-specific code. v1 renders with `displayBlocks` (already its
   own module); the ticket that allows block objects inside adds the registry
   `types` map.
4. **Hidden means hidden, not just blurred.** While hidden, the content stays
   in the DOM (so the box keeps its size and the reveal doesn't jump) but is
   blurred (`blur-md`), `select-none`, `aria-hidden` and `inert`. So it can't
   be read by a screen reader, selected, copied, tabbed into, or found with
   find-in-page.
5. **Revealing.** The whole hidden box is one `<button>` with
   `aria-expanded="false"` that reads "Show spoiler" (or "Show spoiler:
   <label>"). Click, tap, Enter and Space reveal it. Once revealed, the
   content is plain and selectable, and a small "Hide" button at the end of
   the label row hides it again (`aria-expanded="true"`). Focus moves to the
   content on reveal and back to the button on hide, so keyboard users don't
   lose their place.
6. **Look.**
   - One rounded `border border-border bg-card` box, inner padding as the
     callout.
   - A label row: an `EyeOffIcon` (hidden) or `EyeIcon` (revealed) in
     `text-muted-foreground`, the label (`font-semibold text-foreground`,
     `dir="auto"`) or "Spoiler" when there's none, and while hidden a
     "Tap to reveal" hint in `text-muted-foreground`.
   - Content below the row, spaced like the post's blocks (`space-y-4`).
   - The blur fades out with a short `transition-[filter]`, off under
     `motion-reduce`.
   - Focus ring in `ring`; the hidden button reaches 44px on mobile.
   - No free colours and no outer margins. I'll check contrast on
     `/dev/themes` in light and dark for every palette.
7. **Direction.** The label gets `dir="auto"`, text blocks already do, and
   the row uses logical spacing (`ms-auto` for the Hide button), so an Arabic
   spoiler mirrors.
8. **In the editor.** It renders through `BlockSurface` with the same `View`
   as the feed, starting hidden, so the author sees what readers see and can
   reveal it to check. The form is where content is changed.
9. **Form (v1).** Label (text, optional, placeholder "What's hidden? e.g.
   Finale spoilers"), then Content (textarea, required, placeholder "The
   hidden part"). The block's form value maps to and from `content`:
   - On insert, the textarea splits on blank lines into one `normal` text
     block per paragraph, each with one span and a fresh key. Single line
     breaks stay inside the span.
   - On Edit, the paragraphs are joined back with a blank line.
   - Because v1 content is plain paragraphs only, this round-trips exactly.
     A richer content editor (nested editor, images) replaces the textarea in
     the ticket that widens the allow-list.
   This mapping lives in the block definition. If `defineBlock` has no hook
   for a form value that differs from the stored value, I'll add an optional
   `toForm` / `fromForm` pair to it and keep every existing block unchanged.
10. **Registry.** Category `layout`, after Accordion. Title "Spoiler",
    description "Content hidden until the reader taps it.", lucide
    `EyeOffIcon`. `examples`: one with a label, one without, one with two
    paragraphs and a line break, and an Arabic one.

## Steps

1. GraphQL (`portableText.graphqls`): add `spoiler` to `BlockType`, then
   `SpoilerBlock` (`content: [Blocks!]!`) and `SpoilerBlockInput`
   (`content: [BlockInput!]!`), and a `spoiler` field on both `Blocks` and
   `BlockInput`.
2. Go (`block-objects/spoiler.go`): `parseSpoiler` (label check, 1–20
   blocks, unique keys, each through `parseBlock` plus the v1 allow-list, at
   least one non-blank), and the cases in `ParseBlock`, `Key` and
   `TextLength` (recursive). `checkTitle` takes the field name so the
   spoiler's error says "label".
3. `make generate-models` in `shared/` against the local codegen Postgres,
   then `pnpm codegen` in `front-end/`.
4. Frontend plumbing: recursion in
   `deNormalizeBlocks` and in the envelope wrapping for the mutation, and the
   form-value mapping hook in `defineBlock` if needed.
5. `front-end/src/components/portable-text/blocks/spoiler.tsx`: schema,
   fields, `View` and examples, added to `blocks`.
6. `portableTextLength`: count `label` and the spans in `content`.

## Acceptance criteria

- "+" and `/spoiler` both offer Spoiler. Insert puts it in the post, and Edit
  reopens the form with the label and content as saved, paragraphs and line
  breaks included.
- In Write, Preview and the feed, a spoiler starts blurred with its label (or
  "Spoiler") and a reveal hint. Click, tap, Enter and Space reveal it; "Hide"
  blurs it again. Paragraphs and line breaks show as in the post's own text.
- While hidden, the content can't be selected or copied, isn't read by a
  screen reader, isn't reachable by Tab, and find-in-page doesn't find it.
- A screen reader announces a button "Show spoiler: <label>", collapsed, then
  expanded after reveal.
- Preview flags, and the server refuses: blank content, more than 20 content
  blocks, a content block that isn't a plain `normal` text block (marks,
  lists, images, a nested spoiler), duplicate content keys, and a label over
  120 characters or with a line break.
- Label and content count toward the 4096 counter, and the server enforces
  the same total.
- Other blocks' title errors read as before after `checkTitle` takes a field
  name. Top-level text blocks parse as before.
- The block restyles under every palette on `/dev/themes` and reads in light
  and dark mode. The blur fades without animation under reduced motion.
- An Arabic spoiler reads right to left, with Hide on the left.
- The form works in the mobile sheet and from the keyboard.
- Existing posts render unchanged.
- `go build ./...` passes in `shared/` and `backend/`, and `pnpm build` and
  `pnpm lint` pass. The repo has no test runner.
- Deploy the backend before the frontend.

## Out of scope

- Images, lists, marks or links inside a spoiler, and the nested editor they
  need. The shape is ready for them; a later ticket widens the allow-list.
- Inline (in-sentence) spoilers as a text decorator.
- Remembering what a reader revealed.
- Hiding the content from the API response: a spoiler is a reading courtesy,
  not access control, so GraphQL returns it to everyone who can read the
  post.
