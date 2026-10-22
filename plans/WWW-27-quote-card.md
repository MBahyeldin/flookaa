# WWW-27 — Quote card block

Branch `WWW-27-quote-card`, from `release-caterpie-v1010`. Epic WWW-13
(Portable Text custom blocks). Builds on WWW-24 (registry), WWW-29 (tokens),
WWW-36 (insert UX) and follows the WWW-37 callout pattern.

## Goal

A highlighted quote with an optional attribution (a name and a role), good for
testimonials and cited lines. Its colours come from theme tokens only, so a
palette or persona theme restyles it. You insert it from the "+" picker or with
`/quote`.

## Shape (permanent)

```graphql
quote {
  _type, _key
  text: String!     # required, multiline plain text
  name: String      # optional, one line: who said it
  role: String      # optional, one line: e.g. "CEO, Acme"
}
```

- **The `_type` is `quote`, not `quoteCard`.** The name describes the content
  rather than its look, so a later restyle doesn't make the name wrong.
- **No Portable Text inside.** `text` is a plain string, as in the callout's
  `description`. Line breaks are kept, and it has no marks or links.
- **The attribution is plain text.** It has no avatar, and `name` doesn't
  link to a persona. A link would point at an id the reader may not be allowed
  to see, and the quoted person often isn't on the platform. Either can be
  added later as a new optional field.
- **`role` without `name` is allowed.** The attribution shows whichever fields
  are set, separated by ", ".

## Decisions

1. **Validation (Go, mirrored in zod):**
   - `text` must be non-blank after trimming.
   - `name` and `role` are each at most 120 UTF-16 units, with no line breaks.
   - `text`, `name` and `role` all count toward the post's 4096-character
     limit, through `TextLength` in Go and `portableTextLength` on the
     frontend.
2. **Look.**
   - The quote is a `<figure>` holding a `<blockquote>`, plus a
     `<figcaption>` when there's an attribution.
   - The card is `rounded-md border bg-card px-5 py-4`. A large lucide
     `QuoteIcon` sits in `text-primary/40`, top-start and `aria-hidden`.
   - The text is `text-lg italic text-foreground`, `whitespace-pre-wrap`.
     The name is `font-semibold`, and the role is `text-muted-foreground`.
   - There are no free colours and no outer margins. I'll check contrast on
     `/dev/themes` in light and dark for every palette.
3. **Direction.** The text and the caption get `dir="auto"`. The icon uses
   logical positioning (`start-*`), so in an Arabic quote it sits on the
   right. The icon isn't mirrored.
4. **Form.** There are three fields, in order: Quote (a textarea, required),
   Name (text) and Role (text, placeholder "e.g. Founder, Acme"). It's edited
   through `BlockSurface`, like Callout, and has no separate `Editor`.
5. **Registry.** The block goes in category `layout`, after Callout. Its title
   is "Quote" and its description is "A highlighted quote, with who said it."
   The lucide icon is `QuoteIcon`. `examples` has a full testimonial, a
   name-only quote, a quote with no attribution, and an Arabic one.
6. **The `blockquote` text style stays.** Text blocks already have a
   `blockquote` style (in `schema.ts`, and with the markdown `>` shortcut): an
   inline quote with a bar on the start side and no attribution. It isn't
   changed. The quote card is a separate block for a quote that stands on its
   own, with an attribution.

## Steps

1. GraphQL (`portableText.graphqls`): add `quote` to `BlockType`, then the
   `QuoteBlock` and `QuoteBlockInput` types, and a `quote` field on both
   `Blocks` and `BlockInput`.
2. Go (`block-objects/quote.go`): write `parseQuote`, and add its cases to
   `ParseBlock`, `Key` and `TextLength`.
3. Run `make generate-models` in `shared/` against the local codegen Postgres,
   then `pnpm codegen` in `front-end/`.
4. `front-end/src/components/portable-text/blocks/quote.tsx`: write the
   schema, fields, `View` and examples, and add the block to `blocks`.
5. `portableTextLength`: count a quote's `text`, `name` and `role`.

## Acceptance criteria

- "+" and `/quote` both offer Quote. Its form inserts the card, and Edit
  reopens the form with the current values.
- The attribution shows "name, role", only the name, only the role, or
  nothing, depending on which fields are set. Line breaks in the text show in
  Write, Preview and the feed.
- Preview flags blank text, and a name or role over 120 characters or
  containing a line break. The server refuses them too. Quote text counts
  toward the 4096-character counter, and the server enforces the same total.
- The card restyles under every palette on `/dev/themes` and reads in light
  and dark mode.
- An Arabic quote reads right to left, with the icon on the right.
- Existing posts render unchanged.
- `go build ./...` passes in `shared/` and `backend/`, and `pnpm build` and
  `pnpm lint` pass. The repo has no test runner.
- Deploy the backend before the frontend.

## Out of scope

- An avatar or a persona link on the attribution.
- A source URL or citation link.
- Rich text in the quote.
- Changes to the existing `blockquote` text style, or converting one into a
  card.
