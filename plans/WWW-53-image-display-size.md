# WWW-53 — Image block: display size, alignment and real dimensions

Branch `WWW-53-image-display-size`, from `release-caterpie-v1010`. Epic
WWW-13 (Portable Text custom blocks). Depends on WWW-24 (block registry),
which is in the release branch. WWW-54 (responsive variants) builds on the
dimensions stored here.

## Goal

The author picks how big an image appears in a post and where it sits on
its row (left, centre, right). Every image is a block: it has its own row,
and text never wraps around it. The caption, if there is one, sits directly
under the image at the image's width. Every new image stores its real width
and height, so the browser reserves the right space and the feed doesn't
jump while images load.

## What's there today

- `ImageBlock` / `ImageBlockInput` already have `width: Int` and
  `height: Int`. `parseImage` checks them (1–4096) and `blocks/image.tsx`
  mirrors that in zod. But the form never fills them, so no post stores them.
- `ImageView` renders a full-width `figure` holding
  `<img class="max-w-full max-h-[70vh] w-auto h-auto object-contain">` and a
  `figcaption`. **The caption doesn't line up with the picture:** the image
  keeps its own width and sits at the left of the figure, and when it's tall
  the 70vh cap makes it narrower still. Meanwhile the caption spans the whole
  post width, so it runs past the picture's right edge.
- The upload goes through `PicInput` → `useInputImage` → `uploadFile`, which
  sets only the field's own id (`src`). The s3 service stores the original
  file and never resizes it, so the file's own pixel size is the stored
  image's size.
- `normalizeBlocks` passes every property of a block object through to
  GraphQL, so a new field needs no mapping code.
- `FieldRender` skips a field with no `interfaceType`. That's how a field can
  exist in the editor schema without an input.
- `ObjectForm` (edit) gives each input its current value. The insert form
  doesn't pass `value`, so a select there starts empty even with
  `defaultValues`. Neither form passes `values`, so `FormField.visibleWhen`
  can't hide fields there yet.

## Decisions

1. **`size` enum `ImageSize { xs s m l xl }`**, optional, and a missing value
   means `xl`. These are fractions of the post's width, not pixels:

   | size | width |
   |---|---|
   | xs | 25% |
   | s  | 40% |
   | m  | 60% |
   | l  | 80% |
   | xl | 100% |

   New images are inserted with the defaults written out.
2. **`align` enum `ImageAlign { left center right }`**, optional, and a
   missing value means `center`. It places images of size `xs`–`l` on their
   row. At `xl` the form hides `align`, since the image normally fills the
   row. The renderer still applies it, with the default centre, for an
   image smaller than the post (decision 4).
3. **Every image is a block.** There's no wrap or inline option, and text
   never flows beside an image.
4. **The caption has no options.** It sits directly under the image, as
   wide as the image, with its text centred. To
   make this work, the `figure` is sized to the picture as it's actually
   drawn:
   - The `figure` gets the size's width and the alignment's margins. The
     `img` fills it (`w-full h-auto`), and the `figcaption` gets the same
     width.
   - **The caps move from the image to the figure.** When width and height
     are known, the figure also gets
     `max-width: min(<width>px, calc(70vh * <width> / <height>))` (inline
     style):
     - A tall image shrinks the whole figure, keeping its ratio, and the
       caption shrinks with it. The image is never letterboxed.
     - A small image is never stretched past its own pixel width. So a
       300px picture at Full width stays 300px, placed by `align`. This is
       why `align` still applies at `xl` in the renderer, even though the
       form hides it.
   - When dimensions are unknown (images stored before this ticket), it
     renders as it does today: `img` at its own size, capped by
     `max-w-full max-h-[70vh]`. The `figure` becomes `w-fit max-w-full`, so
     the caption matches the image's width, except for a tall image capped
     by 70vh. Picking the file again fixes that.
5. **`width` / `height` come from the local file when it's picked,** using
   `createImageBitmap(file)`, before the upload. That's the stored image's
   real size, since s3 doesn't resize, and it needs no network round trip.
   A side over 4096 is scaled down proportionally to fit, because the
   server's 1–4096 check stays and only the ratio matters for layout. If
   measuring fails (an unsupported format), width and height are left out.
6. **Width and height are shown read-only, not editable.** They're declared
   as fields with no `interfaceType`, so the editor schema knows them but
   `FieldRender` draws no input for them. The picture input shows them as
   image metadata under its preview instead:
   - `1920 × 1080 px` when known;
   - `Measuring…` between picking the file and the measurement;
   - `Dimensions unknown`, with "pick the file again to measure it", for an
     old image or a failed measurement.

   Only stored values are shown, so the same line is right in the insert
   and edit dialogs. File type and file size aren't stored on the block, so
   they're left out: an edit dialog couldn't show them.

## Changes

### GraphQL (`shared/external/graph/portableText.graphqls`)

- `enum ImageSize { xs s m l xl }` and `enum ImageAlign { left center right }`.
- `size: ImageSize` and `align: ImageAlign` on `ImageBlock` and
  `ImageBlockInput`.

gqlgen rejects values outside the enums.

### Go (`shared/util/portableText/block-objects/image.go`)

- Copy `Size` and `Align` into the output `ImageBlock`.

Then run `make generate-models` in `shared/` (against the local codegen
Postgres) and `pnpm codegen` in `front-end/`.

### Frontend

- **`blocks/image.tsx`**
  - zod: `size` and `align` as optional enums.
  - fields, in this order:
    - `src` (pic), `alt`, `caption`;
    - "Display size" select, options `Extra small (25%)` …
      `Full width (100%)`;
    - "Alignment" select (`Left` / `Centre` / `Right`), `visibleWhen`
      size ≠ `xl`;
    - `width` and `height`, with no `interfaceType`.
  - The `src` pic field names the fields it fills:
    `dimensions: { width: "width", height: "height" }` (see below).
  - `defaultValues: { size: "xl", align: "center" }`.
  - `View` (decision 4):
    - `figure`: a size class (`w-1/4`, `w-2/5`, `w-3/5`, `w-4/5`, `w-full`),
      an align class (`mr-auto` / `mx-auto` / `ml-auto`), and the
      `max-width` style when dimensions are known.
    - `img`: `block w-full h-auto rounded-md`, keeping the `width` /
      `height` attributes, which the browser uses for the aspect ratio
      before the image loads.
    - Without dimensions: `figure` is `w-fit max-w-full` plus the align
      class, and `img` is `block max-w-full max-h-[70vh] w-auto h-auto
      rounded-md`, as today.
    - `figcaption`, only when the caption isn't empty:
      `mt-1 text-center text-sm text-muted-foreground break-words`.
  - `examples`: `m` centred with a caption, `s` right-aligned with a
    caption, and `xl`. All with dimensions.
- **`models/Forms/FormField.ts`**: an optional
  `dimensions?: { width: string; height: string }` for pic fields.
- **`hooks/useInpuImage.ts`**: when the field has `dimensions`, measure the
  file with `createImageBitmap`, fit it within 4096, and `setFieldValue` both
  before the upload starts. A failed upload clears them along with `src`.
  The profile and thumbnail pickers have no `dimensions`, so they're
  unchanged.
- **`components/inputs/pic/index.tsx`**: when the field has `dimensions`,
  read the two values from `values` (passed down by `FieldRender`) and show
  the metadata line from decision 6 under the preview, in
  `text-xs text-muted-foreground`. `useInputImage` exposes an `isMeasuring`
  flag for the `Measuring…` state.
- **`components/form/FieldRender.tsx`**: pass `values` to `PicInput`.
- **`toolbar/form.insert-block-object.tsx`** and **`toolbar/object-form.tsx`**:
  pass `values` (formik's) to `FieldRender`, so `visibleWhen` works. The
  insert form also passes `value={values[field.name]}`, so the selects start
  at their defaults.

Editing an existing image (the popover's `ObjectForm`) gets the same selects.
Picking a new file there re-measures it.

## Risks to check while building

- `@portabletext/editor` might drop properties of a block object that
  aren't declared schema fields. Declaring `width`, `height`, `size` and
  `align` as fields should avoid this. Confirm by inserting an image and
  checking the `createPost` payload in the network tab.
- `w-2/5` / `w-3/5` / `w-4/5` must be in the Tailwind build. They're literal
  strings in the class map, so the scanner finds them.

## Out of scope

- Resized variants and `srcset` (WWW-54).
- Previewing the post before publishing (WWW-55).
- Text wrapping around images, and images inside a line of text.
- Backfilling dimensions for stored images.

## Acceptance criteria

1. The insert dialog has a "Display size" select that defaults to Full width.
   A post renders the image at 25 / 40 / 60 / 80 / 100% of the post width,
   on desktop and on a phone.
2. Below Full width, an "Alignment" select places the image left, centre or
   right on its own row. At Full width the select is hidden.
3. A caption sits directly under its image, exactly as wide as the image, at
   every size and alignment, including a tall image capped at 70vh. An image
   without a caption has no empty space under it.
4. A newly uploaded image's block has `width` and `height` equal to the
   file's pixel size, or fitted within 4096 for larger files. The rendered
   `img` carries them, and a post's height doesn't change when its image
   finishes loading (throttled network). The insert and edit dialogs show
   the stored dimensions read-only under the image preview, with no way to
   type them in. An old image without them reads "Dimensions unknown".
5. Existing posts without `size`, `align`, width or height show the image at
   its own size, as before, now centred and with the caption under it. A
   new image smaller than its chosen size is never stretched past its own
   width.
6. Sending `size: "huge"` or `align: "top"` to `createPost` is rejected by
   GraphQL. Width or height of 0 or 5000 is still rejected by `parseImage`.
7. Profile picture and channel thumbnail uploads behave as before.
8. `go build ./...` passes in the workspace, and `pnpm build` and `pnpm lint`
   pass in `front-end/`.
