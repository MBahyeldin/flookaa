# WWW-43 — Gallery block

Branch `WWW-43-gallery-block`, from `release-caterpie-v1010`. Epic WWW-13
(Portable Text custom blocks). Builds on WWW-24 (registry), WWW-29 (tokens),
WWW-36 (insert UX), WWW-53/54 (image dimensions, s3 `srcset` variants) and
the list form field from WWW-39 (Steps).

## Goal

Several pictures in one block, shown as a grid or as a swipeable carousel,
each with optional alt text and caption. Images upload through the `s3`
service like the image block. You insert it from the "+" picker or with
`/gallery`. No server state beyond the post itself. Colours from theme
tokens only.

## Shape (permanent)

```graphql
gallery {
  _type, _key
  layout: GalleryLayout        # grid | carousel; absent = carousel
  items: [GalleryItem!]!       # { _key, src: String!, alt, caption, width, height }
}
```

Input: `GalleryBlockInput { _type, _key, layout: GalleryLayout, items: [GalleryItemInput!]! }`,
`GalleryItemInput { _key, src: String!, alt: String, caption: String, width: Int, height: Int }`.

- **The `_type` is `gallery`.** An item has the same fields as an image block
  minus `size`/`align` (a gallery always fills the post width).
- `layout` is an enum so more layouts (masonry…) can be added later.

## Decisions

1. **Validation (Go, mirrored in zod):**
   - A key; `layout` is enum-checked by gqlgen.
   - 2 to 20 items (one image is an image block).
   - Each item: key present and unique; `src` through `safeURL` (http(s) or
     same-site path), like `parseImage`; `width`/`height` 1–4096 when set;
     `caption` ≤ 120 UTF-16 units and one line (`checkTitle`); `alt` ≤ 300.
   - The item-key check is split out of `checkItem` into a small
     `checkItemKey` helper, since gallery items have no required title.
   - Captions and alt text **don't** count toward the 4096-character limit,
     matching the image block's caption.
2. **Shared image helpers.** `isS3File` / `responsive` move out of
   `image.tsx` into `blocks/responsiveImage.ts`, taking the fraction of
   post width as a parameter, so the image and gallery blocks build the same
   `srcset`. The image block's output is unchanged.
3. **Grid.**
   - `grid-cols-2`, and `sm:grid-cols-3` from 5 items up; small gap.
   - Every cell is the same square (`aspect-square rounded-md bg-muted`) and
     the whole picture fits inside it (`object-contain`): never cropped or
     stretched, with `bg-muted` filling the spare sides. `sizes` uses ½ or ⅓ of the column.
   - The caption, when present, sits under its cell in `text-xs
     text-muted-foreground`, truncated to one line (`dir="auto"`).
4. **Carousel.**
   - No new dependency: a horizontal `overflow-x-auto snap-x snap-mandatory`
     strip, one full-width slide at a time, swipe and trackpad work natively.
   - Every slide uses the tallest-allowed common height (`aspect-[4/3]` box,
     `object-contain`, `bg-muted`), so the block doesn't jump as you swipe.
   - Previous/next buttons (`ChevronLeft/Right`, `bg-background/80`) on
     hover-capable screens, hidden on the first/last slide, and a "3 / 7"
     counter. Arrow keys work when the strip has focus (`tabIndex=0`,
     `aria-roledescription="carousel"`, slides `aria-label="3 of 7"`).
   - In RTL the strip, buttons and arrow keys mirror.
   - Caption under the current slide, centred like the image block.
5. **Form.**
   - Layout (`select`: Grid, Carousel; default Grid).
   - Images (`list`, item label "Image", "Add image", min 2, max 20), each
     with the image upload (`pic`, with `dimensions`), Alt text and Caption.
     Reorder and remove come from the list field.
   - **Fix in `ListInput`:** its item setter ignores the field name and
     closes over a stale `items`. The `pic` input sets `src`, `width` and
     `height` in turn, so today only the last call would land, written to the
     wrong field. The item setter will honour the name it's given and apply
     each change to the latest list. Existing list blocks (Steps, Accordion,
     Checklist) behave the same.
6. **Registry.** Category `media`, after Image. Title "Gallery",
   description "Several pictures as a grid or a carousel.", icon
   `ImagesIcon`. `examples`: a 4-image grid with captions, a 6-image grid,
   and a carousel, all using `/welcon-bg.jpg`.

## Steps

1. GraphQL (`portableText.graphqls`): `gallery` in `BlockType`,
   `GalleryLayout`, `GalleryBlock`, `GalleryItem`, the two inputs, and a
   `gallery` field on `Blocks` and `BlockInput`.
2. Go (`block-objects/gallery.go`): `parseGallery`, `checkItemKey` in
   `items.go`, and the cases in `ParseBlock` and `Key` (`TextLength` returns
   0, so no case).
3. `make generate-models` in `shared/` against the local codegen Postgres,
   then `pnpm codegen` in `front-end/`.
4. Frontend plumbing: none. `normalizeBlocks` / `deNormalizeBlocks` handle
   every registered block, and gallery text doesn't count toward the limit.
5. `ListInput` item-setter fix.
6. `blocks/responsiveImage.ts`, and `image.tsx` switched to it.
7. `components/portable-text/blocks/gallery.tsx`: schema, fields, `View`
   (grid and carousel), examples, added to `blocks`.

## Acceptance criteria

- "+" and `/gallery` both offer Gallery. Insert puts it in the post, and Edit
  reopens the form with the same layout, images, order, alt texts and
  captions.
- Uploading an image inside the gallery form stores its URL and real width
  and height on that item.
- Grid shows equal square cells with each whole picture inside, 2 columns (3 from 5 images on wider screens).
- Carousel swipes on touch, scrolls with a trackpad, and moves with the
  buttons and arrow keys; the counter follows. It mirrors in RTL.
- s3 images load through `srcset` variants in both layouts; the image block
  still renders as before.
- Preview flags, and the server refuses: fewer than 2 or more than 20 images,
  a missing or duplicate item key, a non-http(s) `src`, a side outside
  1–4096, a caption over 120 characters or with a line break, alt over 300.
- Steps, Accordion and Checklist forms still add, edit, reorder and remove
  items.
- The block restyles under every palette on `/dev/themes` and reads in light
  and dark mode.
- The form works in the mobile sheet and from the keyboard.
- Existing posts render unchanged.
- `go build ./...` passes in `shared/` and `backend/`, and `pnpm build` and
  `pnpm lint` pass. The repo has no test runner.
- Deploy the backend before the frontend.

## Out of scope

- A lightbox / full-screen viewer when tapping an image.
- Picking several files at once to create several items.
- Converting an image block into a gallery or back.
- Other layouts (masonry, autoplay).
