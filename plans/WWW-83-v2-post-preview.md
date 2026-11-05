# WWW-83 — Frontend: unified post preview (Spine and Canvas)

Tenth ticket of epic WWW-86, on top of WWW-107 (block restyle and `defineBlock.summary`). It replaces the post card in lists with one preview that has two frames, Spine and Canvas. Frontend only, no schema or backend change.

Same approach as the rest of the epic: `components/post-card` is rewritten in place on the existing hooks, stores and mutations, and the channel page keeps its route and data.

Design: "Flookaa v2", Blocks & Posts, section "Unified post preview" `42:4582` with the Preview rules card `42:4587`. Post set `36:748`: Spine `35:409`, Canvas `36:506` (Strip `36:606` is not used). In context: Channel Desktop `17:2` / Mobile `17:812` (Canvas), Feed `21:2` / `21:1402` (Spine), Profile `24:2` (Canvas). Pulled read-only on 2026-10-23.

## Preview rules (both frames)

`PostContent` gets a `preview` mode. It stays the only way to show a post body, and its theme wrapper, block registry and skipping of invalid blocks don't change.

1. **Stream in units.** The parsed value is split into units: one per block object, one per text block, and one per run of list items (so a list stays one `<ul>`). Each unit renders through the same `PortableText` components as today, in order.
2. **Paragraphs clamp to 4 lines.** In preview mode, `normal` text blocks get `line-clamp-4`. Headings, quotes and lists aren't clamped.
3. **Height budget.** The budget is 560 px from `md` (768) up and 480 px below it, read with `matchMedia`. After the first layout, each unit's height (plus the 16 px gap) is measured. The stream keeps the longest run of units that fits, and cuts between units, never through one. At least one unit always shows. The cut is computed once per post and per budget. Opening an accordion or revealing a spoiler later doesn't re-cut, so the post doesn't jump under the reader.
4. **Oversized first unit.** If the first unit alone is taller than the budget, it shows in its compact form:
   - Image: the height cap drops from 70vh to 360 px.
   - Gallery: renders as `grid` (bento) whatever its layout.
   - Accordion: already closed by default, unless `defaultFirstOpen`; in preview it starts closed.
   - Anything else (long steps, checklist, a revealed spoiler): the unit is clipped at the budget with the fade.
   `defineBlock` gets an optional `compact?: boolean` prop on `View` for this; only image, gallery and accordion read it.
5. **Fade.** When content is cut mid-way (the last unit shown is text with more after it, or the first unit is clipped), the bottom 48 px of the stream fade into the frame's colour (`from-transparent to-card` on Spine, `to-accent` on Canvas). The fade is `pointer-events-none`, so a countdown or checklist under it still works. A cut after a whole block gets no fade, as in Figma: fading a complete block made it look cut off (found in the browser, 2026-10-23).
6. **"+n more inside".** Under the stream, the hidden **block** units are listed as chips: "+n more inside" (`text-xs font-medium text-muted-foreground`), then a wrapping row of chips, one per hidden block, in order. A chip is the block's `icon` (13 px) plus `summary(value)`, or `title` when the block has no `summary`. Chips are `rounded-full pl-2 pr-2.5 py-1 text-xs font-medium text-primary`, `bg-accent` on Spine and `bg-card` on Canvas. Dividers aren't chipped (they carry nothing), and hidden text isn't chipped. When only text is hidden, there is no chip row.
7. **Interactive blocks stay interactive.** Ticking, playing, revealing and the countdown all work in the preview, because they are the real `View`s.

## Frames

The frame is `components/post-card` (`Post`, gaining `version: "spine" | "canvas"`), wrapped in the channel's `data-theme` when it has one. The header, the reactions pill and the menu are shared.

| | Spine `35:409` | Canvas `36:506` |
|---|---|---|
| Surface | `bg-card border rounded-2xl`, overflow hidden. A 6 px `bg-primary` spine on the start side (mirrors in RTL). Stream padding 20/20/18 (top/sides/bottom), gap 14. | `bg-accent rounded-2xl`, no border. Padding 18/22/22, gap 16. |
| Header | One row, gap 8: 32 px avatar, name (14 medium), channel pill (`bg-primary text-primary-foreground`, 12 medium, `px-2 py-0.5 rounded-full`), relative time (12, muted). The `⋯` menu is at the end. | The same items inside a sticker: a `bg-card rounded-full shadow-sm` pill (`pl-1.5 pr-3 py-1.5`). The `⋯` menu sits at the end of the row, outside the sticker. |
| Lead | Every paragraph is body text (16, 1.6). | If the stream starts with a paragraph, that one is `text-lead` light; the rest are body text. |
| Footer | A 1 px `border-border` rule, then a row: "Read the whole post →" (14 medium `text-primary`) at the start, the reactions pill at the end. | No rule. The same row. |

- **Channel pill**: shown on both frames, as in Figma, including on the channel's own page. `Post` takes an optional `channel: {id, name, theme}`; the channel page passes its own. The feed (WWW-112) and profile (WWW-113) will pass theirs. Without a channel, there is no pill and no theme wrapper.
- **Avatar**: the `Avatar` with `GeneratedAvatarFallback`, as today, at 32 px. Name and avatar keep opening the `PersonaLink` card.
- **Reactions pill** (`components/post-card/Reactions.tsx`): `bg-card border rounded-full shadow-sm pl-3 pr-1.5 py-1.5`, gap 10. Like (heart + count, 16 px icon, 14 medium) as a toggle button, with the existing like logic, heart animation and sound moved into a `useLikePost(post)` hook. Comments (bubble + count) is a button that opens the post. The Figma `+` add-reaction button isn't rendered: there are no reactions other than the like yet.
- **"Read the whole post"** shows only when something is hidden. Until the post page exists (WWW-108), it and the comments button open the existing `?post=` dialog (`PostDialog`). The dialog shows the full post (no preview rules) with its comments open. WWW-108 will point both at the post page.
- **Menu**: `⋯` with Delete for the author or a channel moderator, as today. Hidden when the viewer can't delete.
- **Comments** are no longer inline under a preview. They are in the dialog only.
- **Share** (disabled today) is removed. It comes back with WWW-108.
- `isNew` keeps the `post-enter` entrance.

## Where each frame is used

- **Channel page** (`channels/[id]`, Posts tab): Canvas, with the channel passed in.
- **Spine** has no page yet: the feed is WWW-112. It is built and shown on `/dev/themes` next to Canvas (same sample post in every palette), so it can be checked now.
- **`PostDialog`**: the full post. `Post` gets `version: "full"`: the Spine frame without the preview rules and without "Read the whole post", with `CommentSection` open under the footer.
- The composer's preview (`post-creator`) keeps the plain `PostContent` with `showInvalid`. It isn't a preview card.

## Departures from Figma

1. **Shadows on the floating pills only** (user, 2026-10-23): the Canvas header sticker and the reactions pill keep Figma's shadow as `shadow-sm` (Figma's `Shadow/sm`, no new token), because Figma calls them a sticker and a floating pill. The polaroid keeps WWW-107's border and no shadow; changing it would restyle every image block, not only previews.
2. **No tilts** (user, 2026-10-23): the Canvas sticker's description says "tilted", and the polaroid's says "±1.5° in posts", but both are drawn at 0°, so they stay at 0°. The callout sticker stays the only tilted element.
3. **No `+` reaction button** and no Share (above).

## Steps

1. `PostContent` preview mode: the unit split, the clamp, the measurement and cut, the fade and the chip row. `compact` on `View` for image, gallery and accordion.
2. `useLikePost` and `Reactions`, moved out of `post-card/index.tsx`.
3. `Post` frames: Spine, Canvas and full, with `PostHeader` gaining the channel pill, the sticker form and the 32 px avatar. `post-creator` keeps using `PostHeader` as today.
4. Channel page uses Canvas with the channel. `PostDialog` uses `full`. "Read the whole post" and the comments button set `?post=`.
5. `/dev/themes`: a Spine and a Canvas sample with a long mixed post.
6. CLAUDE.md: the preview rules in one paragraph under "Frontend conventions", next to `PostContent`. The shadow rule becomes "`shadow-sm` for overlays and floating pills (the post header sticker and the reactions pill)".

## Verification

- `pnpm build` and `pnpm lint` in `front-end/`.
- Browser on `/dev/themes` and a channel page, at 1440 and 390, in `tide` and one other palette, light and dark, against `35:409`, `36:506` and `17:2`/`17:812`:
  - A long mixed post (text, photo, text, countdown, checklist, voice note, steps, spoiler, quote) cuts between blocks near 560/480 px and shows "+5 more inside" with the right chips (`Checklist · 2/4`, `Voice note · 0:42`, `Steps · 3`).
  - A text-only post with a long paragraph clamps to 4 lines and shows "Read the whole post" with no chips. A short post shows neither.
  - A post that starts with a 5-image carousel shows it as a bento. A long checklist first is clipped with the fade, and its boxes can still be ticked.
  - Ticking, playing, revealing and the countdown work in the preview, and opening an accordion doesn't change the cut.
  - Like toggles with the animation and sound. The comments count and "Read the whole post" open the dialog with comments. Delete works for the author and a moderator.
  - Arabic post: the spine and chips mirror in RTL.

## Out of scope

- The post page route, Share and the post page's article style (WWW-108).
- The feed and its query, which would pass the channel to Spine (WWW-112), and profile posts (WWW-113).
- Reactions other than the like.
- The composer bar (WWW-109).
