# WWW-75 — Literal design tokens (Figma-compatible)

Branch `WWW-75-literal-design-tokens`, from `release-caterpie-v1010`.
Frontend CSS only. Blocks WWW-76 (the Figma file mirrors these tokens).

## Goal

- Every colour token becomes a literal value (`#RRGGBB`, or `#RRGGBBAA` when
  translucent) per palette × light/dark, so Figma variables can hold the same
  values one to one. Today they are computed at runtime from hue/chroma knobs
  with `oklch(calc(...))` (`src/index.css:62-171`, `src/themes.css`), and
  Figma variables can't do math.
- The app looks the same: values are taken from today's computed colours,
  not redesigned.
- Out of scope: components, layouts, class names, Tailwind utilities, new
  palettes, colour changes.

## Decisions

1. **Token names stay.** `background, foreground, card(-foreground),
   popover(-foreground), border, input, primary(-foreground),
   secondary(-foreground), muted(-foreground), accent(-foreground), ring,
   scrim, sidebar, sidebar-solid, sidebar-*`, status (`destructive`,
   `success`, `warning` + `-foreground`), `chart-1..5`. The `@theme inline`
   mapping (`--color-*`) is untouched, so no utility changes.
2. **New tokens** for colours that are inline `oklch(calc)` in rules today:
   - `--primary-gradient-from`, `--primary-gradient-to` (`.bg-primary`)
   - `--card-glass`, `--card-glass-sheen`, `--card-glass-border`
     (`[data-slot="card"]`)
   - `--page-glow-1`, `--page-glow-2`, `--page-glow-3`, `--page-wash-from`,
     `--page-wash-to` (body background; dark uses glows 1–2 and the wash)
3. **Knobs go away**: `--sea-*`, `--navy-*`, `--primary-l/-c/-h/-fill-l`,
   `--gradient-*`, `--glow-h`, `--deep-h`, `--dark-*`.
4. **One literal block per palette and mode** in `themes.css`:
   `[data-theme="<id>"]` (light) and `.dark [data-theme="<id>"],
   .dark[data-theme="<id>"]` (dark), for tide, forest, ember, plum, rose,
   slate. Each block sets every token itself, so a nested palette no longer
   needs the `:root, [data-theme]` re-derivation trick.
5. **Default** = tide: `:where(:root)` and `:where(.dark)` hold tide's
   values, so a `[data-theme]` on `<html>` still wins.
6. **Status and chart** become hex, still shared by every palette (one light
   set, one dark set).
7. **Unchanged**: `--radius` and its `calc`s, `brand-start/end` in `@theme`,
   gradient geometry (sizes, positions, stops).

## Steps

1. **Baseline.** On the current commit, with Playwright against `pnpm dev`:
   screenshot `/dev/themes`, `/`, a channel page and onboarding, for every
   palette × light/dark, at 390, 834 and 1440 wide. Saved in the scratchpad,
   not committed.
2. **Extract.** A one-off scratchpad script (not committed), run in the page
   on `/dev/themes`. For each palette × mode it reads every token's computed
   colour on an element with that `data-theme` and turns it into sRGB hex
   with the page's existing 1×1 canvas approach (`srgb()` in
   `pages/dev-themes`, plus alpha). It prints the `themes.css` blocks and
   lists any colour that was out of sRGB gamut.
3. **`src/themes.css`.** Replace the knob blocks with the printed literal
   blocks.
4. **`src/index.css`.**
   - Delete the knob defaults (:62-100) and the derivation blocks (:104-171).
   - Tide's light/dark values go in `:where(:root)` / `:where(.dark)`.
   - The body gradients, `.bg-primary` and `[data-slot="card"]` use the new
     tokens instead of `oklch(calc…)`.
   - Status and chart become hex.
   - Rewrite the comments that explain knobs.
5. **`src/pages/dev-themes/index.tsx`.** `GRADIENT_FROM`/`GRADIENT_TO`
   become `var(--primary-gradient-from)` / `var(--primary-gradient-to)`.
6. **Docs.** `CLAUDE.md` "Theme palettes": palettes are literal hex token
   sets in `themes.css`, mirrored by the Figma variables (WWW-76). A new
   token goes in every palette's light and dark block. Drop the knob and
   derivation text.

## Order and deploy

Frontend only: `./deploy.sh` from `front-end/` after the release merges to
`main`. No backend dependency.

## Verification

- Step 1's screenshots, shot again and diffed against the baseline: at most
  1/255 per channel (8-bit rounding).
- `/dev/themes` contrast table: every pair still passes in every palette ×
  mode.
- `grep -n "oklch\|calc(" src/index.css src/themes.css` finds only the
  radius `calc`s.
- `grep -rn "sea-h\|dark-tint\|gradient-c" src` finds nothing.
- `pnpm build` and `pnpm lint`.
- A palette nested inside another (persona theme on a post in a
  differently themed page) still shows its own colours.

## Implementation notes

- Tide's blocks double as the default: `:where(:root), [data-theme="tide"]`
  and `:where(.dark), .dark [data-theme="tide"], .dark[data-theme="tide"]`,
  so its values are written once.
- Status and chart colours were identical in every palette, so they stay in
  `index.css` (`:root` / `.dark`) instead of being repeated per palette.
- `--page-glow-3` only exists in light blocks: the dark body has two glows.
- The tokenised gradients are written `in oklab`. A CSS gradient with OKLCH
  stops interpolates in OKLab, but with hex stops it interpolates in sRGB,
  which changed the button and page gradients. With `in oklab` the hex
  stops reproduce the old sweep.
- Many OKLCH values were slightly outside sRGB. Chrome already clipped them,
  and a canvas readback matched the hex within 1/255 for every token.
  - The exception is gradients whose stops are out of gamut (tide
    `primary-gradient-to`, forest and rose `primary-gradient-from`). Before,
    each pixel of the sweep was clipped; now the stop is clipped once. So
    `.bg-primary` in those palettes differs by up to 44/255 in one channel
    near the saturated end, barely visible side by side.
  - Ember, plum and slate are exact.
- Verified on public routes only: the dev server's `.env` points at the
  production API, so no login. Covered: `/dev/themes` (every palette ×
  mode), `/dev/onboarding`, `/login`, `/sign-up`, `/`, at 390 / 834 / 1440,
  with palette and dark mode set on `<html>`. 150 screenshots per run. The
  home page's remaining difference is its animated illustration.
