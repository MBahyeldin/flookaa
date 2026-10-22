# WWW-24 — Portable Text block registry and renderer

Branch `WWW-24-block-registry`, from `release-caterpie-v1010`. It's the first
ticket of the blocks work (WWW-13, Portable Text custom blocks for posts),
and the base for every block ticket after it (WWW-36 insert UX, WWW-37
onwards, the WWW-45 gallery) and for WWW-33, which puts a persona's theme on
its posts.

## Goal

Adding a block means writing one definition file per side and nothing
else. The server validates every block, and a post renders the same way
everywhere, whatever blocks it holds.

No new block ships in this ticket. Image and Break move onto the new
registry, and posts look the same as before. Break is the exception: it
renders today only in the editor, and after this ticket it renders in posts
too.

## What's there today

Adding a block now touches eight places across three layers, and the frontend
and backend registries don't know about each other:

| Layer | Where |
|---|---|
| GraphQL | `portableText.graphqls`: `BlockType` enum, output type, input type, `Blocks`, `BlockInput @oneof` |
| Go | a parser in `shared/util/portableText/block-objects/` plus its entry in `Provider` |
| Frontend | a `BlockObject` instance, `registerAll`, the `AllBlockObjectsValuesType` union, and the render path in `post-card` |

### How a post is stored

`CreatePost` is the only writer of Portable Text, and nothing updates it
afterwards (the only `UpdateOne` is the soft delete). It runs in three
steps:

1. gqlgen decodes the request into `models.PortableTextInput` and validates
   its shape: types, required fields, enums, and exactly one field per
   `@oneof`.
2. `rawContent = json.Marshal(input.Content)` re-encodes that struct. The
   `omitempty` tags give the one-key envelope (`{"image": {...}}`).
3. `content = ParseContent(input)` copies the same struct into the output
   types, field by field.

Both fields go into Mongo in the same `InsertOne`. **Only `rawContent` is
ever read:** the frontend's `Post` and `Comment` fragments request it and not
`content`. For comments, `rawContent` is the marshalled `SimpleInput` string
and `content` is nil.

### Problems found while reading

1. **A post containing a Break block crashes its card.** The editor schema
   adds `break` by hand (`schema.ts`), but `BlockObjectsProvider` registers
   only `image`. `post-card` passes `getBlockTypes()` (`["image"]`) to
   `deNormalizeBlocks`, which throws `Unsupported block type: break` while
   rendering. The same happens to any block type the running bundle doesn't
   know yet, for example a post made with a newer frontend while a tab still
   runs the old one.
2. **The image's width and height are dead fields.** The form declares them
   with `interfaceType: "number"`, but `FieldRender` has no number input, so
   they never render and no post has ever stored them. If they did render,
   they would send numbers into GraphQL's `width: String` / `height: String`
   (with a stale comment, "tailwind css classes only"), which gqlparser
   rejects. The renderer reads them as pixel attributes.
3. **The renderer is inlined in `post-card`.** It builds the components map
   on every render. Nothing else can show a post body the same way, which
   the blocks gallery (WWW-45) and theme previews (WWW-31) will need.
4. **The registry is a class behind a React context** (`BlockObjectsProvider`,
   `BlockObjectsProvider.context.tsx`, instantiated in `main.tsx`). It holds
   only static data, so the context adds nothing. Its `BlockObject` class
   also drops `icon` and `defaultValues` in its constructor. It has no
   description, category or examples, which the insert menu (WWW-36) and the
   gallery (WWW-45) need.
5. **`content` and `rawContent` can drift.** They're made separately from
   the same input:
   - `ParseContent` logs a block whose parser fails and leaves it out, while
     `rawContent` keeps it. This happens, for example, when a block is added
     to GraphQL but its parser is missing from `Provider`.
   - Each parser copies fields by hand, so a field added to an input and not
     copied is in `rawContent` only.
   - `ParseBlock` finds the parser by reflection and prints every field.
6. **The server checks shape only.** GraphQL's type check is all the
   validation there is, and `ParseContent` adds none. A direct call to
   `/query` can store:
   - any image `src` or link `href`, including `javascript:`
   - empty required strings
   - a post of any size: the 4 KB limit (`MAX_POST_LENGTH`) exists only in
     `post-creator`
   - marks pointing at markDefs that don't exist, and duplicate `_key`s
7. **Playground leftovers ship with the editor:**
   - the `stock-ticker` inline object
   - the `image` inline object
   - the `comment` annotation
   - `debug-menu` and the patch, selection and value previews, with their
     states in `toolbar/machine.ts` and `highlight-json-machine.ts`

   Inline objects can't even be saved: `children` accepts only `SpanInput`,
   so a post containing one fails the mutation.

## Decisions

1. **A block the reader's bundle doesn't know renders nothing.** There is no
   placeholder. The rest of the post renders, and a reload picks up the new
   bundle. A placeholder would mostly show up in the window just after a
   deploy, and that's noise. It can come later if blocks start arriving from
   somewhere other than this frontend.
2. **Every block keeps its own typed GraphQL input** under
   `BlockInput @oneof`. There is no generic `{ type, data: JSON }` block. The
   server validates every block's shape, so validation doesn't live only in
   the frontend's zod schemas. Poll (WWW-48) and Quiz (WWW-49) store state on
   the server and need typed fields anyway.
3. **`rawContent` is the only thing anything renders from, and it is made
   from the parsed `content`.** The Go parse is the server's validator: it
   checks every block and fails the mutation on the first error. Then
   `rawContent = json.Marshal(content)`, not the input. A block or field the
   parser drops is then missing from both, never from one, so the two can't
   drift. `content` stays in Mongo as the structured, server-checked copy,
   for future server-side reads such as search or poll state.
4. **Block `_type` names and their fields are a permanent contract.** Stored
   posts keep them forever. Fields may be added, but never renamed, retyped
   or removed. A block that is retired stays in the registry and in
   GraphQL, and only leaves the insert menu.

## Changes

1. **GraphQL** (`shared/external/graph/portableText.graphqls`):
   - `ImageBlock` / `ImageBlockInput` `width` and `height` become `Int`,
     matching the renderer (problem 2), and the stale comment goes. This
     breaks nothing:
     - No client sends either field.
     - No stored post has them.
     - `rawContent` is read back as a JSON string, not through these types.
   - Otherwise the block types stay as they are: one typed input per block
     under `BlockInput @oneof` (decision 2).
   - The `comment` annotation goes from the schema: `MarkDefType.comment`,
     `CommentMarkDef`, `CommentMarkDefInput` and both `MarkDefs` /
     `MarkDefInput` fields (problem 7). Decision 4 doesn't apply, because
     annotations aren't blocks and no editor has produced one outside the
     playground. If a stored post has one, it still renders: its text shows
     with no mark.
   - Then run `make generate-models` in `shared/` and `pnpm codegen` in
     `front-end/`.
2. **Go parsers** (`shared/util/portableText/block-objects/`):
   - `root.go`: `ParseBlock` becomes a plain `switch` on which `BlockInput`
     field is set, one case per block calling that block's `parse` function.
     It replaces the reflection loop, the `BlockObject` interface and the
     `Provider` list.
   - `block.go`, `image.go`, `break.go` keep one `parse` function each, with
     no parser structs. Each one validates and returns an error naming the
     block's `_key`:
     - **all blocks:** a non-empty `_key`, unique within the post
     - **`block`:** at most 6 list levels, every mark is a decorator in the
       editor schema or the `_key` of one of the block's markDefs, and every
       link `href` is `http(s):`, `mailto:` or a same-site path (`/…`, not
       `//…`)
     - **`image`:** `src` is `https:` or `http:`, or a same-site path
       (uploads are `https://s3.flookaa.com/files/…`, or `/files/…` without
       `VITE_S3_BUCKET_BASE_URL`). `width` and `height`, when given, are
       1–4096.
   - The comment-annotation case in `parseMarkDef` goes.
3. **`ParseContent`** (`shared/util/portableText/parseContent.go`):
   - Its signature becomes `(*models.PortableText, string, error)`: the
     parsed content, its `rawContent` (decision 3), and the first block
     error.
   - Post limits, checked here: at most 4096 characters of span text,
     counted the way `portableTextLength` does in `post-creator`, and at most
     200 blocks. Characters are counted in UTF-16 units
     (`len(utf16.Encode([]rune(text)))`), like JavaScript's `.length`. Go's
     `len` counts bytes, so Arabic text or emoji would hit the server limit
     before the composer's counter does.
   - The `Printf`/`log` lines go.
4. **Resolver** (`shared/pkg/graph/resolvers/schema.resolvers.go`,
   `CreatePost`):
   - It calls `ParseContent` before the insert, returns its error as is
     (for example `invalid image block <key>: src must be http(s) or a
     same-site path`), and stores both returned values.
   - Its own `json.Marshal(input.Content)` goes.
   - `CreateComment` doesn't change: comments are `SimpleInput` strings.
5. **Block registry** (new `front-end/src/components/portable-text/blocks/`):
   - `defineBlock.ts`: `defineBlock<T>(def)` returns a plain object with:
     - **meta:** `name` (the `_type`, permanent, see decision 4), `title`,
       `description` (one line, for the insert menu and gallery), `icon`,
       and `category` (`"media" | "layout"` for now; later blocks add
       `"text"` and `"interactive"`)
     - `fields` (the existing `FormField[]`, used by the insert form) and
       `defaultValues`
     - `schema`: a zod schema for `T`, mirroring the Go checks
     - `View: (props: { value: T }) => ReactNode`: posts and the gallery
     - `Editor?: (props: { value: T; selected: boolean; focused: boolean })
       => ReactNode`: the editor. When it's missing, the editor shows `View`
       inside a selection frame.
     - `examples: T[]`: at least one sample value. The gallery (WWW-45)
       renders them, and they're this ticket's manual-check fixtures.
   - `image.tsx`: today's `blockObjects/blocks/Image.tsx` moved, with its zod
     schema, `description`, `category: "media"` and an example added. The
     dead width and height form fields go (problem 2). The schema and `View`
     keep them as optional numbers, for a later upload flow that knows the
     image's real size. Its `my-3` goes (see change 7). There's no `Editor`.
   - `break.tsx`: `category: "layout"`.
     - `View` is an `<hr>` using `border-border`.
     - `Editor` is the existing separator chip, moved out of `editor.tsx`.
   - `index.ts`: exports `blocks = [image, breakBlock]` and
     `blockByName(name)`. That list is the only place a block is registered.
6. **Editor** (`portable-text/editor.tsx`, `schema.ts`, `toolbar/`):
   - `playgroundSchemaDefinition` takes `blocks`. The hand-written `break`
     entry goes, because Break is now in the list.
   - `RenderBlock` draws `blockByName(name)` with `Editor ?? View`. The Break
     special case goes, because Break's chip is now its `Editor`.
   - The toolbar's insert button and popover keep working as they are,
     reading `fields` and `defaultValues` from `blocks`.
   - **Playground leftovers go** (problem 7):
     - the `stock-ticker` and `image` inline objects, and with them
       `renderChild`, `StockTickerSchema`, `InlineImageSchema` and the
       toolbar's `extendInlineObject` cases
     - the `comment` annotation, `CommentAnnotationSchema` and its
       `renderAnnotation` and toolbar cases
     - `debug-menu.tsx`, `value-preview.tsx`, `selection-preview.tsx`,
       `editor-patches-preview.tsx`, `portable-text-preview.tsx` and
       `highlight-json-machine.ts`
     - the `debug mode` and three preview states and their events in
       `toolbar/machine.ts`, and `editorStyle`'s `debugModeEnabled` variant
7. **Renderer** (new `portable-text/PostContent.tsx`):
   - `<PostContent rawContent={post.rawContent} theme?={…} />` is the only
     way to show a post body.
   - It parses `rawContent`, de-normalizes it and renders it with
     `@portabletext/react`. The components map is `displayBlockComponents`
     plus one `types` entry per registry block (`View`), built once at
     module level (problem 3).
   - **Unknown and invalid blocks are skipped, never thrown** (decision 1,
     fixes problem 1):
     - A block whose name isn't in the registry renders nothing: no
       placeholder, no gap.
     - So does one whose value fails the block's `schema.safeParse`. That
       covers posts stored before the server checks existed.
     - Bad JSON renders an empty body instead of crashing the card.
     - Each case logs one `console.warn`, for developers only.
   - **The theme wrapper:**

     ```tsx
     <div className="post-content space-y-4" data-theme={theme}>…</div>
     ```

     Nothing passes `theme` yet, so this ticket adds no theme. It sets two
     rules for every block from WWW-37 onwards:
     - **Colours come only from the semantic tokens** (`bg-card`,
       `text-foreground`, `border-border`, `text-primary`, `bg-muted`…),
       never from raw palette classes (`bg-blue-500`).
     - **No block reads the page's theme.** Each block reads the tokens in
       effect on its wrapper.

     WWW-29 defines palettes as token overrides under `[data-theme=…]`, and
     WWW-33 passes the post author's theme. Any block that follows the rules
     then takes on the persona's colours without changing.
   - **Spacing between blocks belongs to the wrapper.** Its `space-y-4`
     replaces `post-card`'s, which already spaces the blocks, because
     `@portabletext/react` renders them as siblings. Block objects carry no
     outer margins of their own. Images lose their `my-3`, so they sit
     slightly closer to the text around them than they do now. Text styles
     keep their classes from `displayBlocks.tsx`.
8. **Callers**:
   - `post-card`: its inlined `PortableTextReact` block becomes
     `<PostContent rawContent={post.rawContent} />`. `PostDialog` and the
     channel page get it through `post-card`.
   - `post-creator`: imports `blocks` instead of calling
     `useBlockObjectsProvider()`. It shows the server's error message when
     publishing fails, instead of only logging it, because a post can now be
     rejected for its content.
   - `utils/normalizeBlocks.ts` / `deNormalizeBlocks.ts` keep the GraphQL
     envelope (`{ image: {...} }`). Their `types` parameter is dropped, and
     they take the known names from the registry. `deNormalizeBlocks` drops
     unknown blocks instead of throwing.
9. **Removed** (problem 4):
   - `blockObjects/BlockObject.ts`, `blockObjects/BlockObjectsProvider.ts`
     and `blockObjects/blocks/Image.tsx` (moved)
   - `src/BlockObjectsProvider.context.tsx` and its provider in `main.tsx`
   - every `useBlockObjectsProvider()` call: `editor.tsx`, `post-creator`,
     `post-card`
   - Found while implementing:
     - `backend/util/portableText/`, a stale copy of the parsers from the
       `init` commit. Nothing imported it, and it stopped compiling once the
       comment annotation left GraphQL.
     - `portable-text/renderBlock.tsx`, an unused render function with its
       own hard-coded image case.
     - The `shiki` and `prettier` dependencies, used only by
       `highlight-json-machine.ts`.
10. **Docs** (CLAUDE.md):
    - "Frontend conventions": the line about `components/portable-text/`
      covers `blocks/` and `PostContent`.
    - "Data split": posts store `content` (parsed and server-checked) and
      `rawContent` (marshalled from `content`), and everything renders from
      `rawContent`.
    - A short "Adding a Portable Text block" checklist:
      1. Pick the `_type` name and fields with care: they're permanent.
         Fields may be added, never renamed, retyped or removed.
      2. GraphQL `BlockType` value, output type, input type, and a `Blocks` /
         `BlockInput` field.
      3. A Go `parse` function that validates, and its `switch` case.
      4. `make generate-models` and `pnpm codegen`.
      5. A `defineBlock` file in `components/portable-text/blocks/` with
         meta, `fields`, a zod `schema` that mirrors the Go checks, `View`,
         `Editor` if it differs, and `examples`, added to `blocks`.
      6. Colours from semantic tokens only, and no outer margins.
    - It also notes that `PostContent` skips unknown blocks.

## Deploy order

1. Deploy the backend.
2. Then deploy the frontend.

There's no migration. The old frontend keeps working against the new
backend: it never sends `width`, `height`, inline objects or comment
annotations, and every block it sends passes the new checks unless its URL
or size breaks them. The new frontend skips blocks it doesn't know, so it
can't crash on anything a newer deploy writes.

## Out of scope

- New blocks: WWW-37 onwards.
- The insert UX: WWW-36. The current toolbar button and popover stay as they
  are, reading `blocks`.
- The blocks gallery page: WWW-45. This ticket only gives each block its
  `examples`.
- Theme palettes and tokens (WWW-29), and passing a theme (WWW-33).
- Comments. They are plain strings (`SimpleInput`), not Portable Text.
- Rewriting stored posts. Old `rawContent` stays as written, and the renderer
  skips whatever no longer validates.

## Verification

There are no tests in the repo, so all of this is checked by hand.

1. **Build:**
   - `make generate-models` in `shared/` and `pnpm codegen` in `front-end/`.
   - `go build ./...` and `go vet ./...` in `shared/` and `backend/`.
   - `pnpm lint` and `pnpm build`. `npx tsc -b` must be clean too: it
     reports errors in `.ts` files, which `pnpm build` lets through.
2. **Old posts:** existing text and image posts in a channel look the same as
   before.
3. **Break:** insert a Break and publish. The post shows a divider, and the
   card no longer crashes. The post dialog (`?post=<id>`) shows it too. In
   the editor, Break still shows the separator chip.
4. **Image insert:** the form shows only URL, alt and caption. The image
   publishes and renders as before.
5. **In sync:** for a new post, `rawContent` in Mongo equals the JSON of
   `content`.
6. **Server checks** (send `createPost` straight to `/query`). Each of these
   is rejected with a message naming the block, and nothing is written to
   Mongo:
   - an image with `src: "javascript:alert(1)"`
   - a link with `href: "javascript:alert(1)"`
   - a mark naming a markDef that doesn't exist
   - two blocks with the same `_key`
   - more than 4096 characters of text
   - more than 200 blocks
7. **Publish error:** in the composer, one rejected post shows the server's
   message, and the draft stays.
8. **Unknown block:** edit a post's `rawContent` in Mongo to add a
   `{"poll": {...}}` block. The rest of the post renders with no placeholder
   and no extra gap, and the console shows one warning.
9. **Invalid stored block:** in Mongo, set an image's `src` to `""`. The
   image is skipped and the rest renders.
10. **Theme wrapper:** in devtools, set `data-theme="x"` on a `.post-content`
    and override `--primary` under `[data-theme="x"]`. Only that post's
    tokens change.
11. **Leftovers gone:** the toolbar has no stock ticker, inline image,
    comment or debug controls, and nothing imports the deleted files.
