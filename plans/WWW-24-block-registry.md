# WWW-24 — Portable Text block registry and renderer

Branch `WWW-24-block-registry`, from `release-caterpie-v1010`. It's the first
ticket of the blocks work (WWW-13, Portable Text custom blocks for posts),
and the base for every block ticket after it (WWW-36 insert UX, WWW-37
onwards) and for WWW-33, which puts a persona's theme on its posts.

## Goal

Adding a block means writing one definition file per side and nothing
else, and a post renders the same way everywhere, whatever blocks it holds.

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

Problems found while reading:

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
   also drops `icon` and `defaultValues` in its constructor.
5. **The Go side finds the parser by reflection.** `ParseBlock` walks the
   `BlockInput` struct, prints every field, and tries each parser in turn. A
   block whose parser fails is dropped from `content` without an error,
   while `rawContent`, which the frontend actually renders, keeps it.

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

## Changes

1. **GraphQL** (`shared/external/graph/portableText.graphqls`):
   - `ImageBlock` / `ImageBlockInput` `width` and `height` become `Int`,
     matching the renderer (problem 2), and the stale comment goes. This
     breaks nothing:
     - No client sends either field.
     - No stored post has them.
     - `rawContent` is read back as a JSON string, not through these types.
   - Otherwise the schema stays as it is: one typed input per block under
     `BlockInput @oneof` (decision 2).
   - Then run `make generate-models` in `shared/` and `pnpm codegen` in
     `front-end/`.
2. **Go parsers** (`shared/util/portableText/block-objects/`):
   - `root.go`: `ParseBlock` becomes a plain `switch` on which `BlockInput`
     field is set, one case per block calling that block's `parse` function.
     It replaces the reflection loop, the `BlockObject` interface and the
     `Provider` list.
   - `block.go`, `image.go`, `break.go` keep one `parse` function each, with
     no parser structs.
   - A block that fails to parse returns `invalid <type> block`.
3. **Resolvers** (`shared/util/portableText/parseContent.go`,
   `schema.resolvers.go`):
   - `ParseContent` returns an error instead of logging and dropping the
     block. `CreatePost`, its only caller, returns it before the insert, so
     the mutation fails and nothing is written to Mongo (problem 5).
     Comments use `SimpleInput` and don't go through it.
   - The `Printf`/`log` lines go.
4. **Block registry** (new `front-end/src/components/portable-text/blocks/`):
   - `defineBlock.ts`: `defineBlock<T>(def)` returns a plain object with:
     - `name`, `title`, `icon`
     - `fields` (the existing `FormField[]`, used by the insert form)
     - `defaultValues`
     - `schema` (a zod schema for `T`)
     - `Render: (props: { value: T }) => ReactNode`, used by both the editor
       and posts
   - `image.tsx`: today's `blockObjects/blocks/Image.tsx` moved, with its zod
     schema added. The dead width and height form fields go (problem 2). The
     schema and the renderer keep them as optional numbers, for a later
     upload flow that knows the image's real size. Its `my-3` goes (see
     change 6).
   - `break.tsx`: Break's display renderer, an `<hr>` using `border-border`.
   - `index.ts`: exports `blocks = [image, breakBlock]` and
     `blockByName(name)`. That list is the only place a block is registered.
5. **Editor** (`portable-text/editor.tsx`, `schema.ts`, `toolbar/`):
   - `playgroundSchemaDefinition` takes `blocks`. The hand-written `break`
     entry in `schema.ts` goes, because Break is now in the list.
   - `RenderBlock`: the Break branch must `return` the existing separator
     chip before the registry lookup. Today it only assigns `children`, so
     once Break is in the registry the lookup would replace the chip with the
     `<hr>`. Other blocks go through `blockByName(name)?.Render`.
   - The toolbar's insert button and popover keep working as they are,
     reading `fields` and `defaultValues` from `blocks`.
6. **Renderer** (new `portable-text/PostContent.tsx`):
   - `<PostContent rawContent={post.rawContent} theme?={…} />` is the only
     way to show a post body.
   - It parses `rawContent`, de-normalizes it and renders it with
     `@portabletext/react`. The components map is `displayBlockComponents`
     plus one `types` entry per registry block, built once at module level
     (problem 3).
   - **Unknown and invalid blocks are skipped, never thrown** (decision 1,
     fixes problem 1):
     - A block whose name isn't in the registry renders nothing: no
       placeholder, no gap.
     - So does one whose value fails the block's `schema.safeParse`.
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
7. **Callers**:
   - `post-card`: its inlined `PortableTextReact` block becomes
     `<PostContent rawContent={post.rawContent} />`. `PostDialog` and the
     channel page get it through `post-card`.
   - `post-creator`: imports `blocks` instead of calling
     `useBlockObjectsProvider()`.
   - `utils/normalizeBlocks.ts` / `deNormalizeBlocks.ts` keep the GraphQL
     envelope (`{ image: {...} }`). Their `types` parameter is dropped, and
     they take the known names from the registry. `deNormalizeBlocks` drops
     unknown blocks instead of throwing.
8. **Removed** (problem 4):
   - `blockObjects/BlockObject.ts`, `blockObjects/BlockObjectsProvider.ts`
     and `blockObjects/blocks/Image.tsx` (moved)
   - `src/BlockObjectsProvider.context.tsx` and its provider in `main.tsx`
   - every `useBlockObjectsProvider()` call: `editor.tsx`, `post-creator`,
     `post-card`
9. **Docs** (CLAUDE.md, "Frontend conventions"):
   - The line about `components/portable-text/` covers `blocks/` and
     `PostContent`.
   - A short "Adding a Portable Text block" checklist:
     1. GraphQL `BlockType` value, output type, input type, and a `Blocks` /
        `BlockInput` field.
     2. A Go `parse` function and its `switch` case.
     3. `make generate-models` and `pnpm codegen`.
     4. A `defineBlock` file in `components/portable-text/blocks/`, added to
        `blocks`.
     5. Colours from semantic tokens only, and no outer margins.
   - It also notes that `PostContent` skips unknown blocks.

## Deploy order

1. Deploy the backend.
2. Then deploy the frontend.

There's no migration. The old frontend keeps working against the new
backend: it never sends `width` or `height`, and every block it sends still
parses. The new frontend skips blocks it doesn't know, so it can't crash on
anything a newer deploy writes.

## Out of scope

- New blocks: WWW-37 onwards.
- The insert UX: WWW-36. The current toolbar button and popover stay as they
  are, reading `blocks`.
- Theme palettes and tokens (WWW-29), and passing a theme (WWW-33).
- Comments. They are plain strings (`SimpleInput`), not Portable Text.
- The playground leftovers in `schema.ts` (the stock-ticker inline object
  and the comment annotation). They're untouched.

## Verification

There are no tests in the repo, so all of this is checked by hand.

1. `make generate-models` in `shared/` and `pnpm codegen` in `front-end/`.
   Then `go build ./...` and `go vet ./...` in `shared/` and `backend/`, and
   `pnpm lint` and `pnpm build`. `npx tsc -b` must be clean too: it reports
   errors in `.ts` files, which `pnpm build` lets through.
2. **Old posts:** existing text and image posts in a channel look the same as
   before.
3. **Break:** insert a Break, publish, and check that the post shows a
   divider and the card no longer crashes. The post dialog
   (`?post=<id>`) shows it too. In the editor, Break still shows the
   separator chip.
4. **Image insert:** the form shows only URL, alt and caption. The image
   publishes and renders as before.
5. **Unknown block:** edit a post's `rawContent` in Mongo to add a
   `{"poll": {...}}` block. The rest of the post renders with no placeholder
   and no extra gap, and the console shows one warning.
6. **Invalid block:** in Mongo, remove an image's `src`. The image is skipped
   and the rest renders.
7. **Theme wrapper:** in devtools, set `data-theme="x"` on a `.post-content`
   and override `--primary` under `[data-theme="x"]`. Only that post's
   tokens change.
8. **Bad input:** send `createPost` with a malformed block (an image with no
   `src`) straight to `/query`. GraphQL rejects it, and nothing is written to
   Mongo.
