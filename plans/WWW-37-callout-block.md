# WWW-37 — Callout block

Branch `WWW-37-callout-block`, from `release-caterpie-v1010`. Epic WWW-13
(Portable Text custom blocks). Depends on WWW-24 (registry), WWW-29 (status
tokens) and WWW-36 (insert UX), all in the release branch.

## Goal

A highlighted box in a post: an optional title, a plain-text description, a
tone (info, success, warning, error) and an icon. Its colours come from theme
tokens only, so a palette or persona theme restyles it. It's inserted from the
"+" picker or `/callout`, like any other block.

## Shape (permanent)

```graphql
callout {
  _type, _key
  tone: CalloutTone          # info | success | warning | error; absent = info
  icon: CalloutIcon          # absent = the tone's default
  title: String              # optional, one line
  description: String!       # required, multiline plain text
}
```

- **No Portable Text inside.** `description` is a plain string (your call).
  Line breaks are kept (`whitespace-pre-wrap`), and there are no marks or
  links.
- **`tone`, not `type`.** gqlgen already maps `_type` to Go's `Type`, so a
  `type` field would collide (`ImageBlockInput.Type` is `_type`). The values
  are the ones you gave, with `error` in place of the ticket's `accent`.
- **`icon` is a name, not a ReactNode**, because only data can be stored.
  `CalloutIcon`: `info`, `check`, `alert`, `error`, `lightbulb`, `star`,
  `heart`, `megaphone`, `none`. When it's absent, the tone picks the icon:
  info → `info`, success → `check`, warning → `alert`, error → `error`.
  `none` hides it.

## Decisions

1. **Validation (Go, mirrored in zod):**
   - `description` must be non-blank after trimming.
   - `title` is at most 120 UTF-16 units, with no line breaks.
   - Both enums are checked by gqlgen.
   - Both strings count toward the post's 4096-character limit:
     `TextLength` in Go and `portableTextLength` on the frontend. Otherwise a
     callout could carry text past the limit.
2. **Colours.** Each tone maps to one token:
   - info → `primary`, so it follows the palette;
   - success → `success`;
   - warning → `warning`;
   - error → `destructive`.

   The box is `rounded-md border border-s-4` with `bg-<token>/10`,
   `border-<token>/30` and `border-s-<token>`. The icon uses `text-<token>`;
   the title and description use `text-foreground`. There are no outer margins
   and no free colours. Contrast is checked on `/dev/themes` in light and
   dark for every palette.
3. **Direction.** The title and description get `dir="auto"`, and the accent
   bar uses the logical `border-s`, so it sits on the right of an Arabic
   callout.
4. **Form.** The fields, in order:
   - Tone (select, default `info`);
   - Icon (select; unset shows the placeholder "Tone default" and stores
     nothing). Radix Select can't hold an empty item, so once an icon is
     picked, "Tone default" can't be chosen again. Picking the tone's own icon
     looks the same;
   - Title (text);
   - Description (textarea, required).

   It's edited through `BlockSurface` like Image. There's no separate `Editor`:
   the editor shows the `View`, as Image does.
5. **Accessibility.** The box is an `<aside>` with `role="note"`. The icon is
   `aria-hidden`.
6. **Registry.** It's in category `layout`, after Break, titled "Callout",
   with description "A highlighted note: info, success, warning or error."
   `examples` has one callout per tone, plus a title-less one with `icon:
   none`.

## Steps

1. GraphQL (`portableText.graphqls`): add `callout` to `BlockType`, the
   `CalloutTone` and `CalloutIcon` enums, `CalloutBlock`,
   `CalloutBlockInput`, and a `callout` field on `Blocks` and `BlockInput`.
2. Go (`block-objects/callout.go`): `parseCallout`, with its case in
   `ParseBlock`, `Key` and `TextLength`.
3. `make generate-models` in `shared/` (local codegen Postgres), then
   `pnpm codegen` in `front-end/`.
4. `front-end/src/components/portable-text/blocks/callout.tsx`: the schema,
   fields, `View` and examples. Add it to `blocks`.
5. `portableTextLength`: count a callout's `title` and `description`.

## Acceptance criteria

- "+" and `/callout` both offer Callout. Its form inserts a box that shows
  the chosen tone's colours and icon. Edit reopens the form with the current
  values.
- The tone default and `none` icons behave as described. Line breaks in the
  description show in Write, Preview and the feed.
- A blank description, or a title over 120 characters or with a line break, is
  flagged in Preview and refused by the server. Callout text counts toward the
  4096 counter, and the server enforces the same total.
- The box restyles under every palette (`/dev/themes`) and reads in both light
  and dark mode.
- An Arabic callout reads right to left, with the bar on the right.
- Existing posts render unchanged.
- `go build ./...` passes in `shared/` and `backend/`. `pnpm build` and
  `pnpm lint` pass. There's no test runner in the repo.
- Deploy the backend before the frontend.

## Out of scope

- Rich text or links in the description.
- Custom colours or icons outside the lists above.
- Collapsible callouts (that's the Accordion, WWW-28).
