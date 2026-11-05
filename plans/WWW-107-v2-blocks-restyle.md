# WWW-107 — Frontend: restyle Portable Text blocks to v2

Ninth ticket of epic WWW-86, on top of WWW-81 (tokens, `radius/2xl`) and WWW-87 (core components). It restyles the 11 registered blocks in `components/portable-text/blocks/` and the `/blocks` gallery. The only backend change is one optional field on Callout.

The same files and the same `defineBlock` registry are rewritten in place: each block's `View` (and `Editor` where one exists) gets the new layout. Schemas, `_type` names, form fields and examples stay unless noted below. `PostContent` and the theme wrapper don't change.

Design: "Flookaa v2", page Blocks & Posts `32:6`. Callout `32:63`, Quote `32:64`, Steps `32:78`, Checklist `32:116`, Divider `32:164`, Accordion `33:28`, Spoiler `33:95`, Image `33:128`, Gallery `33:187`, Voice note `33:188`, Countdown `33:268`. Chips are in the Unified post preview `42:4582` (Spine `35:409`). The blocks gallery is Desktop `86:15583` and Mobile `87:17364`. Pulled read-only on 2026-10-23.

## Decisions

1. **Callout tag** (user, 2026-10-23): a new optional `tag` field holds the small label above the title. When it is unset or blank, the tone's word shows: info "Good to know", success "Nice!", warning "Heads up", error "Careful". The tag is one line of at most 24 characters. Adding a field is allowed by the block rules; nothing is renamed or removed.
2. **Gallery viewer** (user, 2026-10-23): the grid layout becomes a bento (1 large, 2 small). Tapping any image, or the `+n` badge on the third one, opens a full-screen viewer that swipes through every image with its caption.
3. **Polaroid without shadow**: Figma draws the image card with a drop shadow. The rule is that cards get a border and no shadow (`shadow-sm` is for overlays only), so the polaroid gets a border.
4. **Steps are not stateful**: Figma's third step has a lighter number. The block stores no progress, so every number uses the same filled style.
5. **No rotations, no flip animation**: countdown tiles are static and update in place. The one exception is the Callout (user, 2026-10-23): it matches `32:63` exactly, including the tilted sticker that the component description names, at −3° (mirrored in RTL). The angle isn't recorded in Figma, which has it at 0°.

## Shared

| Piece | Spec |
|---|---|
| Block surface | Block cards use `rounded-2xl` (20) and `bg-card` with a border, or the tone or accent fill where Figma uses one. Colours come from semantic tokens only (`primary`, `accent`, `secondary`, `muted`, `success`/`warning`/`destructive`). Blocks have no outer margins. |
| `defineBlock` gains `summary?: (value: T) => string` | This is the chip label for the preview's "+n more inside" row (WWW-83 consumes it). It falls back to `title` when unset. The chip formats are listed per block below. |
| Decorative circles | Quote and Countdown draw large soft circles (`bg-primary-foreground/10` on primary, `bg-primary/10` on accent) as `aria-hidden` absolutely positioned spans, clipped by `overflow-hidden`. |

## Blocks

| Block | View (Figma) | Summary chip |
|---|---|---|
| **Callout** `callout.tsx` | As `32:63`: `bg-card` under a 12% tone tint, `rounded-2xl`, padding 22/20/20/20, gap 16. A 44 px icon bubble in the solid tone holds a 22 px icon (lucide `info`, `check`, `triangle-alert`, `circle-alert`). The text column has gap 6: the sticker (solid tone, `*-foreground`, 12 px medium, `px-2.5 py-1`, rounded-full, tilted −3°), the title (16 px medium, 1.6) and the description (14 px, 1.5, foreground). `icon: none` drops the bubble. | `Callout` |
| **Quote** `quote.tsx` | `bg-accent rounded-2xl p-8`, overflow hidden, with one decorative circle at the top end. An oversized `“` glyph (`text-primary`, ~56 px, `rtl:-scale-x-100`), the quote at `text-lead` medium, then the attribution: a 36 px circle with initials (from `name`, `bg-card text-primary`; no circle when there is no name), the name (semibold) and the role (muted, below). | `Quote` |
| **Steps** `steps.tsx` | `bg-card border rounded-2xl p-6`. The title row has a `ListOrdered` icon (`text-primary`). Each step has a 40 px `bg-primary` numbered circle, joined to the next by a vertical rail (`border-s-2 border-border`). Title (semibold), details (muted). | `Steps · n` |
| **Checklist** `checklist.tsx` | `bg-card border rounded-2xl p-6`. The title is on the start side, and a pill at the end reads "2 of 4 done" (`bg-accent text-primary`, `Badge variant="count"` sizing). Under it, an 8 px progress bar (`bg-secondary` track, `bg-primary` fill, `role="progressbar"` with values). Items have a 24 px `rounded-md` box: checked is `bg-primary` with a check mark and struck-through muted text; unchecked has a `border-border` outline. | `Checklist · d/n` |
| **Divider** `break.tsx` | line: a 1 px `border-border` line. dashed: a dashed line. dots: five dots fading out from a `bg-primary` centre (`primary` at 100/60/40%). ornament: a line, a `Sailboat` icon (`text-primary`), then a line. The `Editor` chip keeps the same marks. | `Divider` (not chipped by WWW-83) |
| **Accordion** `accordion.tsx` | `bg-card border rounded-2xl p-2`, title at `px-3 pt-3`. Each item is a soft pill row (`rounded-xl`, min 48 px). The open one fills `bg-accent` and shows its text, with a 32 px `bg-primary` circle holding `ChevronUp`. A closed one has a 32 px outlined circle holding `Plus`. `<details>` and the `allowMultiple` behaviour stay. | `Accordion · n` |
| **Spoiler** `spoiler.tsx` | Hidden: `rounded-2xl` with diagonal stripes (`repeating-linear-gradient` of `--accent` and `--secondary`, via token CSS variables, no hex) and a centred 40 px `bg-card` circle with `EyeOff`. Under it, the label (semibold, "Spoiler" when empty) and a dark "Tap to reveal" pill (`bg-foreground text-background`, sparkle icon). The content isn't rendered blurred under it any more: the stripes cover it. Revealed: `bg-secondary rounded-2xl p-5`, with a small `Eye` and the label (muted, as a button that hides it again), then the content. The focus handling and `aria-*` stay. | `Spoiler` |
| **Image** `image.tsx` | Polaroid: a `bg-card border rounded-2xl p-2` frame, the image inside with `rounded-xl`, and the caption under it with an `Image` icon (`text-primary`, 14 px) and medium text, aligned to the start. Without a caption, just the frame. `size`, `align` and the 70vh cap keep working; the cap moves to the frame. | `Image` |
| **Gallery** `gallery.tsx` | **grid** (bento): 1 image fills the block; 2 sit side by side; 3 or more show one large image (2/3 width, full height) and two stacked on the end side. The third gets a `+n` pill (`bg-foreground/80 text-background`) when there are more than 3. `rounded-2xl` outer corners, 4 px gaps, `object-cover`. Every tile is a button that opens the viewer at that index. **carousel**: polaroid cards (as Image, about 70% wide, so the next one peeks), `snap-x`, and dots under it (the active dot is a wide `bg-primary` pill). Keyboard and RTL behaviour are kept, and the "n / m" badge is replaced by the dots. Below `sm`, the bento's large image takes the full width and the two small ones sit in a row under it. | `Gallery · n` |
| **Gallery viewer** (new, in `gallery.tsx`) | `Dialog` full screen (`bg-black/90`; the overlay colour is the existing dialog overlay token). It reuses the carousel strip with `object-contain` slides, has prev/next buttons, a caption and "n / m" under it, and closes on Esc or with ×. It opens at the tapped index. | — |
| **Voice note** `voiceNote.tsx` | A pill: `bg-accent rounded-full p-2 pe-6`, a 52 px `bg-primary` round play/pause button, the title over the waveform, and the time at the end. `AudioPlayer` gains a `variant: "default" \| "pill"`. `pill` uses this layout, and comments and the composer keep `default`. Speed control: it stays, as a small ghost button after the time. | `Voice note · 0:42` (`duration`, or just `Voice note`) |
| **Countdown** `countdown.tsx` | `bg-primary text-primary-foreground rounded-2xl p-6`, overflow hidden, with two decorative circles. An overline label with a `Clock` icon, centred, then 4 tiles (`bg-card text-primary rounded-xl`, the number at ~40 px semibold with tabular numbers, the unit in muted text under it). Days only show when > 0, as today. **Ended**: a `Sparkles` overline label, the `endedText` at `text-h3` in the centre, and "Ended 2 hours ago" (relative, `Intl.RelativeTimeFormat`) under it, with the absolute time in `<time title>`. | `Countdown` |

The `sr-only` and `aria-live` text, `dir="auto"` and `break-words` stay everywhere.

## Callout `tag` (backend + codegen)

1. `shared/external/graph/portableText.graphqls`: `tag: String` on `CalloutBlock` and `CalloutBlockInput`.
2. `block-objects/callout.go`: check that `tag` is one line and at most 24 characters (`invalid` "tag must be …"), and copy it into the block. In `root.go`, `TextLength` counts it.
3. `make generate-models` in `shared/` (local codegen Postgres), then `pnpm codegen` in `front-end/`.
4. `callout.tsx`: `tag` in the zod schema (same rules), a "Tag" text field whose placeholder is the tone's word, and examples with and without a tag. `utils/portableTextContent.ts`: callout counts `tag`.

Posts stored before the field existed have no `tag`, so they show the tone's word.

## `/blocks` gallery

Same route and file (`pages/(dashboard)/blocks/index.tsx`), new layout, as in `86:15583` / `87:17364`. It keeps today's palette switch, which becomes the `Theme` button at the top end.
- Header: `text-h1` "Blocks", the lead "Everything you can add to a post, with examples. Type / in the editor to insert one."
- Groups in registry order under overlines "Media" and "Layout".
- Each block has a header row: its icon in a 32 px `bg-accent` square, the title, a `/name` `Badge` and the description (muted). Then its examples in one `bg-card border rounded-lg p-4` panel, stacked with `gap-4`.

## Steps

1. `defineBlock.summary` and the summaries.
2. Callout `tag`: graphqls, Go, codegen, then the callout view.
3. Callout, Quote, Steps, Checklist, Divider.
4. Accordion, Spoiler, Countdown.
5. Image, Gallery (bento, carousel, viewer), Voice note (`AudioPlayer` variant).
6. `/blocks` gallery. In CLAUDE.md, under "Adding a Portable Text block": `summary` in the `defineBlock` list, and blocks use `rounded-2xl`.

## Verification

- `go build ./...` in `shared/` and `backend/`. In `front-end/`: `pnpm codegen`, `pnpm build` and `pnpm lint`.
- Browser, `/blocks` at 1440 and 390, under `tide` and one other palette, light and dark: each block against its Figma section. RTL examples (Arabic) mirror correctly.
- Checklist bar and pill match the count. The accordion opens one or several. The spoiler reveals and hides with the keyboard. The countdown ticks and its ended state shows the relative time.
- Gallery with 1, 2, 3 and 5 images: bento shapes, `+2`, the viewer opens at the tapped image and swipes and closes with Esc. The carousel's dots follow scrolling, also in RTL.
- Voice note: play, seek and speed in the pill. A comment's voice note looks unchanged.
- Composer: insert each block, edit a callout's tag, publish, and reload. An old callout with no tag shows the tone's word. The server refuses a 25-character tag.

## Out of scope

- The post preview frame and its chip row (WWW-83). This ticket only provides `summary`.
- Compact forms of oversized blocks for the preview (WWW-83).
- The block insert menu restyle (`Block Menu` `83:11913`, with the composer in WWW-109).
- Poll and quiz (WWW-48, WWW-49).
