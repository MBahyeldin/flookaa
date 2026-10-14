# WWW-38 — Styled divider block

Branch `WWW-38-styled-divider`, from `release-caterpie-v1010`. Epic WWW-13
(Portable Text custom blocks). Builds on WWW-24 (registry), WWW-29 (tokens),
WWW-36 (insert UX) and follows the WWW-37 callout pattern.

## Goal

The existing `break` block gets an optional `style`, so a divider can be a
plain line, a dashed line, a row of dots or a small ornament. Posts that
already use `break` have no `style` and render exactly as today.

## Shape (permanent)

```graphql
break {
  _type, _key
  style: BreakStyle    # line | dashed | dots | ornament; absent = line
}
```

- **Extend `break`, don't add a block.** Same `_type`, one new optional field,
  which the "fields may be added" rule allows. No migration: old documents
  simply lack it.
- **`style` is safe on a block object.** Portable Text reserves `style` on
  text blocks (`normal`, `h1`…) only; `BlockBlock.style` and `BreakBlock.style`
  are separate GraphQL types and separate Go structs.
- **Four values:**
  - `line`: today's `<hr>`;
  - `dashed`: a dashed `<hr>`;
  - `dots`: three centred dots (`• • •`);
  - `ornament`: a short line, a centred glyph (lucide `SparkleIcon`), a short
    line.

## Decisions

1. **Validation.** gqlgen checks the enum; `parseBreak` just copies `Style`.
   zod: `style: z.enum(styles).optional()`. A divider has no text, so
   `TextLength` and `portableTextLength` are unchanged.
2. **Colours.** Lines and dots use `border-border` / `text-muted-foreground`;
   the ornament glyph uses `text-primary`, so a palette or persona theme
   restyles it. No free colours, no outer margins (the wrapper spaces blocks).
   Contrast checked on `/dev/themes`, light and dark.
3. **Height and accessibility.** Every style sits in the same fixed-height
   `<div role="separator">` (`h-4`, content centred), so switching style never
   moves the text around it. A separator's children are presentational, so a
   screen reader announces one separator for any style.
4. **Insert and edit.** Adding a field means `fields.length > 0`, so "+" and
   `/break` now open a small form with one select, Style (default `line`),
   and the popover gets the Edit button. One extra click per divider; the
   alternative (insert a plain line immediately, change style via Edit) keeps
   today's one-click insert but hides the styles. I'm going with the form;
   say if you'd rather keep one-click insert.
5. **Editor.** `BreakEditor` keeps its selected/focused chip styling but shows
   the chosen style's `View` inside it instead of the bare icon, so Write
   matches Preview.
6. **Registry.** Same name `break`, title "Divider" (was "Break"), description
   "A line, dots or an ornament between two parts of a post." `examples`: one
   per style plus one with no `style`, to cover old posts.

## Steps

1. GraphQL (`portableText.graphqls`): the `BreakStyle` enum and an optional
   `style: BreakStyle` on `BreakBlock` and `BreakBlockInput`.
2. Go (`block-objects/break.go`): copy `Style` in `parseBreak`.
3. `make generate-models` in `shared/` (local codegen Postgres), then
   `pnpm codegen` in `front-end/`.
4. `front-end/src/components/portable-text/blocks/break.tsx`: schema, the
   Style field, a `View` per style, `BreakEditor` showing the View, examples,
   new title and description.

## Acceptance criteria

- "+" and `/break` offer Divider; the form inserts the chosen style, and Edit
  reopens it with the current value.
- Each style renders the same in Write, Preview and the feed.
- An existing post with a plain `break` renders unchanged, and saving it again
  is accepted by the server.
- An unknown `style` is flagged in Preview and refused by the server.
- The ornament follows the palette under every theme on `/dev/themes`, and
  all styles read in light and dark.
- `go build ./...` passes in `shared/` and `backend/`. `pnpm build` and
  `pnpm lint` pass. There's no test runner in the repo.
- Deploy the backend before the frontend.

## Out of scope

- Custom glyphs, colours, widths or spacing.
- Section titles on the divider.
