# WWW-55 — Preview a post before publishing

Branch `WWW-55-post-preview`, from `release-caterpie-v1010`. Epic WWW-13
(Portable Text custom blocks). Depends on WWW-24 (block registry,
`PostContent`), which is in the release branch. Frontend only.

## Goal

Before pressing Post, the author can see the draft exactly as readers will
see it in the feed. If a block would fail validation, the preview shows
which block it is and why, and Post stays disabled until it's fixed. In the
feed, a block like that is silently skipped.

## What's there today

- `PostCreator` (`components/post-creator`) holds the draft as editor
  blocks in `blocks` state. On submit, `normalizeBlocks` wraps them in the
  GraphQL envelope (`{ image: {...} }`).
- `Post` (`components/post-card`) renders `PostContent rawContent=…`.
  `PostContent` parses the JSON and runs `deNormalizeBlocks`. For each
  custom block it calls `block.schema.safeParse(value)`, and if that fails it
  logs and returns `null`.
- `canSubmit` checks only emptiness and length. A draft with an invalid
  block (say, an image whose `src` isn't http(s)) can be posted today. The
  server then rejects it or, worse, it goes through and readers never see the
  block.
- Some schemas have refinements with no message, so zod reports
  "Invalid input". For example, `image.src` uses `safeUrl`.
- The post header (avatar, name, `@username`, time) is inline in `Post`.
  `Persona.username` is just the name (`resolver.go`). The composer already
  draws its own small avatar and name line.

## Decisions

1. **Always a switch, never side by side.** The composer sits in the feed
   column. Side by side would put the preview at half the post width, and
   image sizes are percentages of that width (WWW-53), so the preview would
   lie about the layout. The same `Write | Preview` toggle appears on every
   screen width, at the top right of the composer next to the author line.
   It uses the shadcn `Tabs` if it's already in `components/ui`, and a
   two-button segmented control otherwise.
2. **The editor stays mounted.** It's hidden (`hidden`) in Preview, not
   unmounted, so the editor keeps its selection, undo history and toolbar
   machine state. The draft never leaves `blocks`.
3. **The preview goes through the real path.** It renders
   `normalizeBlocks(blocks)` → `JSON.stringify({ blocks })` → `PostContent`.
   That's the same envelope the server stores and the feed reads back, so
   `deNormalizeBlocks` and every `View` run exactly as in the feed. If
   `normalizeBlocks` throws, the preview shows that error instead.
4. **The preview reuses the card's header.** `Post`'s header block moves
   into `components/post-card/PostHeader.tsx`, which takes `author`,
   `authorId`, an optional `createdAt` and an optional `actions` slot.
   `Post` keeps rendering it with the menu in `actions`. The preview
   renders `PostHeader` with the posting persona (real self, `anonymous:
   false`), shows "Now" in place of a time, and leaves `actions` empty. In
   Preview, the composer hides its own small author line, so the header
   doesn't show twice. There's no like, comment, share or menu row.
   The preview isn't wrapped in a second `Card`: the composer card already
   gives it the post's frame and padding.
5. **One validator, shared.** `portable-text/validateBlocks.ts` exports
   `validateBlocks(value) → { index, key, block, title, issues: string[] }[]`.
   It runs over the de-normalized blocks and, for each custom block, uses
   `blockByName(_type).schema.safeParse`. It turns each zod issue into
   `"<path>: <message>"`, or just the message when the path is empty.
   - `PostContent` gets an optional `showInvalid` prop. Without it,
     behaviour is unchanged: skip and `console.warn`. With it, an invalid
     block renders an `InvalidBlock` notice in its place: a
     `border-destructive` box with the block's icon and title ("Image"), and
     the issues as a list. It uses semantic tokens only.
   - `PostCreator` computes the same list from `blocks` with `useMemo`
     (normalize → de-normalize → validate). It adds `invalid.length === 0`
     to `canSubmit`, and `handleSubmit` re-checks it.
   - A block type this bundle doesn't know can't come from the editor, so it
     isn't flagged. `deNormalizeBlocks` still drops it as before.
6. **Write mode tells you too.** When there are invalid blocks, a
   `text-destructive` line sits next to the counter: "1 block needs fixing
   — see Preview". Clicking it switches to Preview. Otherwise the author
   would see a disabled Post button with no reason.
7. **Readable messages.** Every `refine` in the block schemas gets a
   message. Today that's `image.src`: "must be an http(s) link". This
   changes only the message; the rules stay the same, and they still mirror
   the Go checks.
8. **Themes later.** `PostContent` already takes `theme`. The preview passes
   nothing for now. WWW-33 will pass the posting persona's theme at the same
   spot.
9. **After posting, it returns to Write.** A successful post clears the
   draft (unchanged) and switches back to Write.

## Steps

1. Add messages to the block schema refinements (`blocks/image.tsx`).
2. Add `portable-text/validateBlocks.ts`.
3. Add `PostContent` `showInvalid` and `InvalidBlock`.
4. Extract `PostHeader` from `post-card`, and have `Post` use it.
5. `PostCreator`: the Write/Preview switch, the hidden editor, the preview
   pane, the invalid-blocks gate on Post, the hint line, and the reset to
   Write after a post.

## Acceptance criteria

- The composer shows a Write / Preview switch on mobile and desktop.
  Switching back and forth keeps the draft, the cursor and undo.
- Preview shows the persona's avatar and name, and the body rendered by
  `PostContent`. Text, headings, lists, images (size, alignment, caption)
  and breaks look as they will once posted. There are no action buttons.
- An image block with a non-http(s) `src` (forced through devtools) shows a
  red "Image" notice in Preview, with the reason. Post is disabled, and Write
  shows the "needs fixing" hint. After fixing the block, Post is enabled
  again.
- The feed still skips invalid blocks silently, and the post card looks the
  same as before.
- `pnpm build` and `pnpm lint` pass. There's no test runner in the repo, so
  there are no tests to add.

## Out of scope

- Persona themes in the preview (WWW-33).
- A preview for comments or for post editing (post editing doesn't exist
  yet).
- Server-side validation changes.
