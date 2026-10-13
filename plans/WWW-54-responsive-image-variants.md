# WWW-54 — Responsive image variants (srcset)

Branch `WWW-54-responsive-image-variants`, from `release-caterpie-v1010`.
Epic WWW-13 (Portable Text custom blocks). Builds on WWW-53 (display size and
real dimensions), which is in the release branch.

## Goal

A phone downloads a picture sized for its screen, in WebP, not the full
upload. The s3 service resizes on request: the same file URL takes query
params for width and format (`/files/<key>?w=640&fmt=webp`). The image block
builds `srcset` from its `src`, so the block's stored shape doesn't change,
and posts made before this ticket get smaller images too.

## What's there today

- `s3` `uploads.Complete` merges the chunks into `/opt/storage/<uuid>` and
  returns `{url: "/files/<uuid>", …}`. Post images, comment images, profile
  pictures and channel thumbnails all go through it.
- `GET /files/:storageKey` is `c.File`. The files have no extension, so the
  content type is sniffed from the bytes. There are no cache headers.
- nginx proxies `s3.flookaa.com` to the container (`ansible/templates/nginx/sites/s3.conf.j2`)
  with no cache. Cloudflare sits in front, but by default it doesn't cache
  paths without a known file extension, so it isn't caching `/files` today.
- **Builds run on Linux.** `rsync.sh` syncs the repo to the
  `internal-build` container, and `s3/deploy.bash` builds there
  (`GOOS=linux GOARCH=amd64`, native, so cgo is on). That container has
  `build-essential` (`ansible/internal-build.playbook.yml`), so a C library
  like libvips is an option.
- `internal-build` and `s3` are both LXD containers from the Ubuntu `24.04`
  image (`ansible/inventory/hosting-machine.inventory.yml`). So the libvips
  headers on the build container and the library on the s3 container come
  from the same Ubuntu release.
- The s3 container has a 4 GB memory limit.
- `ImageView` renders one `img src`, plus the stored `width`/`height` when
  known. The post column is at most `max-w-4xl` (56rem) in the channel feed
  and `sm:max-w-2xl` (42rem) in `PostDialog`.

## Decisions

1. **Same URL, query params.** `GET /files/<key>` with no params serves the
   original, exactly as today. `w` asks for a width, and `fmt` for a format.
   Unknown params are ignored.
2. **Fixed widths only: 320, 640, 1280, 1920.** Any other `w` rounds up to
   the next one, and anything above 1920 means 1920. Otherwise every
   `?w=641`, `?w=642`… would be a new resize and a new cache entry, which
   would let anyone burn CPU and fill the disk. `w=0`, negative or
   non-numeric is 400.
3. **libvips does the image work** (through `github.com/davidbyttow/govips/v2`,
   cgo). It is the usual engine for resize-on-request services (imgproxy and
   imagor use it):
   - **It reduces while decoding.** A JPEG is shrunk while it decodes
     instead of being fully decoded first, so a 12 MP photo doesn't cost
     48 MB per resize.
   - **It applies the EXIF orientation.** The resized copies carry no EXIF,
     which also strips GPS data from them.
   - **It writes WebP, JPEG and PNG.** AVIF later is another export call, as
     long as the Ubuntu libvips build includes an AVIF encoder (to check when
     that ticket comes).
   - Started once in `main` with libvips' own operation cache off (results
     are cached on disk instead) and concurrency 1 per operation. Our
     semaphore allows 2 resizes at a time.
   - This replaces the pure-Go resize and EXIF code built for the first
     version of this plan, which gets deleted, along with the
     `golang.org/x/image` dependency.
4. **Formats: `fmt=webp`, `fmt=jpeg` and `fmt=png`.**
   - **`webp`:** quality 80, and it keeps transparency. The frontend always
     asks for it: every current browser supports it (Safari since 14), and
     it's typically 25–35% smaller than JPEG at similar quality.
   - **No `fmt`:** JPEG (quality 82) for opaque images, PNG for images with
     transparency.
   - **`fmt=jpeg` on a transparent image:** flattened onto white.
   - **Any other value:** 400.
5. **Never upscaled, never broken.** The original is served unchanged, with
   the same cache headers, when:
   - `w` is at or above the original's width;
   - the file is animated (more than one page: GIF, animated WebP), because
     resizing would drop the animation;
   - it isn't an image, or libvips can't load it;
   - it's over 50 megapixels, which is read from the header before any pixels
     are decoded.

   So a `srcset` entry always loads something.
6. **Caching, two layers:**
   - **s3 disk:** the first request writes
     `/opt/storage/variants/<key>-<w>.<ext>`, and later requests serve that
     file. A cleared nginx cache never means resizing again. The disk cost
     is paid only for sizes someone actually viewed: roughly 0.3–0.7 MB per
     photo in WebP if all four are requested.
   - **nginx:** `proxy_cache` on `/files/`, keyed on the path and query,
     honouring s3's `Cache-Control`. Every `/files` response (original or
     resized) gets `Cache-Control: public, max-age=31536000, immutable`.
     Storage keys are unique and their files never change, so this is safe.
     A 404 isn't cached long (1 minute).
7. **Concurrent first requests are merged:** `singleflight` per
   `<key>-<w>.<ext>`, so 50 viewers of a new post trigger one resize. A
   finished file is written to a temporary name and then renamed, so a reader
   never sees half of it.
8. **The first viewer of each size waits** for the resize. With libvips this
   should be well under a second for a phone photo; measure it on the
   container and put it in the PR. Everyone after that gets a cached file.
9. **`srcset` and `sizes` in `ImageView`**, only when `src` is one of our
   `/files/<key>` URLs (`S3_BUCKET_BASE_URL + "/files/"`, or a same-site
   `/files/` path) and has no query string:
   - `srcset`: `<src>?w=<w>&fmt=webp <w>w` for each width. When `width` is
     known, only widths below it are listed, plus `<src> <width>w` for the
     original. When `width` is unknown (an older image), all four are
     listed: s3 returns the original for any that would upscale.
   - `sizes` comes from the display size's fraction `f` (0.25–1) and the
     widest post column (56rem): `(min-width: 56rem) <f × 56>rem, <f × 100>vw`.
     It's a slight overestimate in the 42rem dialog and with the card's
     padding, which errs on the sharp side.
   - `src` stays the original, so a browser without `srcset` support still
     shows the image.
   - External image URLs (any other host) render as today.
10. **No block, GraphQL or upload changes.** The image block keeps its
    fields. Comment images, avatars and thumbnails can use `?w=` later with no
    server work; that's out of scope here.

## Changes

### s3

- **`internal/imaging/`** (rewritten on libvips):
  - `Startup()` / `Shutdown()` around libvips, called from `main`.
  - `Resize(data []byte, width int, format string) ([]byte, string, error)`:
    it loads the image, checks pages, pixel count and width (decision 5),
    makes a thumbnail at `width` that never enlarges, and exports it.
    It returns the bytes and the content type, or a sentinel error meaning
    "serve the original". It holds the width list and the 2-slot semaphore.
  - The current pure-Go files (`variants.go`, `orientation.go`) are deleted.
- **`internal/handlers/files/`** (new; replaces `FilesHandler` in
  `cmd/server/root.go`):
  - With no `w` and no `fmt`, it serves the original as today.
  - Otherwise it parses and snaps `w` (decision 2), validates `fmt`, and
    serves `variants/<key>-<w>.<ext>` if it's on disk. If not, it runs
    `Resize` through `singleflight`, writes the file (temp + rename) and
    serves it.
  - For the original-fallback cases it serves the original.
  - It sets `Cache-Control` (decision 6) on every 200, plus an explicit
    `Content-Type` on resized files.
  - `storageKey` must be a bare name (no `/`, `..`), since a key now also
    builds the variant's file name.
- **`deploy.bash`**: set `CGO_ENABLED=1` explicitly, so a build without a C
  toolchain fails instead of silently building without libvips.
- **`go.mod`**: add `github.com/davidbyttow/govips/v2` and `golang.org/x/sync`
  (singleflight); drop `golang.org/x/image`.

### Ansible

- **`internal-build.playbook.yml`**: add `libvips-dev` and `pkg-config` to the
  apt packages.
- **`s3.playbook.yml`**: add the libvips runtime (`libvips42t64` on 24.04)
  next to `ffmpeg`.
- **`inventory/s3.inventory.yml`**: add `/opt/storage/variants` to
  `storage_dirs`.
- **`templates/nginx/nginx.conf`**: in `http {}`, add
  `proxy_cache_path /var/cache/nginx/s3 levels=1:2 keys_zone=s3_files:10m max_size=5g inactive=30d use_temp_path=off;`.
- **`templates/nginx/sites/s3.conf.j2`**: `location /files/` with
  `proxy_cache s3_files`, `proxy_cache_key $uri$is_args$args`,
  `proxy_cache_valid 404 1m`, `proxy_cache_lock on` (a second layer of
  merging for concurrent misses), and
  `add_header X-Cache-Status $upstream_cache_status`. The rest of the server
  block is unchanged.
- **`nginx.playbook.yml`**: create `/var/cache/nginx/s3`, owned by the nginx
  user.

The `internal-build` and `s3` containers must stay on the same Ubuntu
release: the headers the binary is built against and the library it loads
at runtime have to match. Upgrade both together.

I edit the playbooks and templates. You run them with `pick-and-play.bash`.

### Frontend (`blocks/image.tsx`)

- A `responsive(value)` helper per decision 9, spread onto the `img`.
- Nothing else changes in the frontend.

## Deploy order

1. Playbooks: `internal-build` (libvips headers), then `s3` (runtime
   library and the variants directory), then nginx.
2. `./rsync.sh`, then build and deploy s3 on the build container.
3. The frontend.

A frontend that asks for `?w=` before s3 understands it just gets the
original for every candidate (today's s3 ignores the query), so step 3 is
safe at any time.

## Risks to check while building

- **The live containers may not match the inventory.** It says 24.04 for
  both, but run `lsb_release -rs` on `internal-build` and `s3` before the
  playbooks to confirm.
- **govips logs** to stderr by default. Set its log level to warnings so
  journald isn't flooded.
- **`c.File` and `Range`/`If-Modified-Since`**: resized files are served with
  `c.File` too, so the conditional and range handling is the same as the
  original's.
- **Cloudflare:** if a Cache Rule for `s3.flookaa.com/files/*` is added later,
  it must keep the query string in the cache key. Not done in this ticket.
- **The sizes in decision 6** are estimates. Check the real sizes on a phone
  photo and put them in the PR.

## Out of scope

- AVIF output.
- Using `?w=` for comment images, avatars or thumbnails.
- Cloudflare cache rules.
- Pre-generating sizes on upload.
- Deleting originals or cached sizes.

## Acceptance criteria

1. For a 4000 × 3000 JPEG:
   - `?w=640&fmt=webp` returns a 640 × 480 WebP;
   - `?w=700` returns the 1280 one;
   - `?w=5000` returns the 1920 one.

   For a 1000 px wide image, `?w=1280` returns the original. `?w=abc` and
   `?fmt=gif` are 400.
2. A portrait phone photo with EXIF orientation 6 comes back upright at every
   width, and with no EXIF data.
3. A transparent PNG:
   - keeps its transparency with `fmt=webp` and with no `fmt` (PNG);
   - is flattened onto white with `fmt=jpeg`.

   A GIF, a PDF or a corrupt file returns the original for any `w`.
4. The second request for the same size doesn't resize again. Both s3 (the
   file is on disk) and nginx (`X-Cache-Status: HIT`) serve it from cache.
   Twenty parallel first requests produce one resize.
5. On a phone-width viewport (DevTools, DPR 2), a Full width post image loads
   `?w=640&fmt=webp` or `?w=1280&fmt=webp`, not the original. A Small (40%)
   image on desktop loads a smaller width than a Full width one.
6. Posts made before WWW-53, without `width`, also load a resized image.
   Images on other hosts render as before, with no `srcset`.
7. `/files/<key>` with no params, as used by avatars, thumbnails and comment
   images, behaves exactly as before apart from the new `Cache-Control`
   header.
8. `go build ./...` passes in the workspace on the build container (cgo with
   libvips), and `pnpm build` and `pnpm lint` pass in `front-end/`.
