# WWW-29 — Theme palettes as Tailwind CSS variables

Branch `WWW-29-theme-palettes`, from `release-caterpie-v1010`. Epic WWW-14
(Persona themes). Frontend only, CSS plus a dev page. Nothing picks or stores
a theme yet: WWW-30 stores it, WWW-31 applies it to the interface, WWW-32 is
the picker, WWW-33 passes it to `PostContent`.

## Goal

A fixed set of named palettes, each with a light and a dark variant whose
text contrast has been checked. Putting `data-theme="<id>"` on any element
re-colours everything inside it, with Tailwind's existing semantic utilities
(`bg-card`, `text-primary`…) and no component changes. With no attribute, the
app looks exactly as it does today.

## What's there today

- `src/index.css` defines the shadcn tokens on `:root` (the "Deep Tide" light
  theme, built from knobs `--sea-h`, `--navy-h`, `--primary-l/-c/-h`,
  `--primary-fill-l`) and overrides them on `.dark` (neutral greys, chroma 0).
  `Theme.context` toggles `.dark` on `<html>`.
- Many tokens are derived: `--card-foreground: var(--foreground)`,
  `--primary: oklch(var(--primary-fill-l) …)`, `--secondary`, `--accent`,
  `--sidebar-*`, `--ring`. **A custom property is resolved where it's
  declared, and children inherit the result.** So overriding `--primary-h` on
  a nested `[data-theme]` element would not change `--primary` there: it was
  already computed on `:root`. That is the main thing this ticket has to fix.
- Several colours are hard-coded hues that no token controls:
  - `.bg-primary` gradient (hues 268 → 212),
  - `[data-slot="card"]` light/dark fills (hue 258 in dark),
  - the `body` and `.dark body` gradients (196, 255, 258),
  - the channel banner overlay `from-[oklch(0.22_0.05_258)]` in
    `channels/[id]/index.tsx`.
- `--success` and `--warning` are mid-lightness (≈3:1 on white), fine as
  fills but too light as text. `--destructive-foreground` exists but isn't
  mapped in `@theme`, and there's no `--success-foreground` /
  `--warning-foreground`.
- `PostContent` already renders `<div data-theme={theme}>` (WWW-24).

## Decisions

1. **Palettes set knobs; one shared block derives the tokens.**
   - Each palette sets only a small set of knobs: surface hue and chroma, text
     hue, primary hue/chroma/lightness, the gradient hues, and the dark-mode
     equivalents.
   - Every derived token moves into two shared rule sets:
     `:root, [data-theme] { …light derivations… }` and
     `.dark, .dark [data-theme] { …dark derivations… }`. The derivations
     re-run on every themed element, so a nested theme gets its own
     `--primary`, `--card`, `--sidebar-*`, etc.
   - Dark mode gets its own knobs (`--dark-surface-c`, …) instead of
     hard-coded greys. The default palette sets them to today's values (chroma
     0), so dark mode doesn't change.
2. **Selectors.** A palette is
   `[data-theme="forest"] { light knobs }` and
   `.dark [data-theme="forest"], .dark[data-theme="forest"] { dark knobs }`.
   The second form covers WWW-31 putting the attribute on `<html>` itself,
   next to `.dark`. Specificity (0,2,0) beats the light rule, so it's
   order-independent.
3. **The hard-coded hues become knobs.** The primary gradient, card fills,
   page gradients and the channel banner overlay read knob variables. The
   default palette's knobs are today's numbers, so nothing moves.
   - The page gradient sits on `body`, so it only follows a theme set on
     `<html>` (WWW-31). A themed post card or profile section gets themed
     tokens and cards, but not the page gradient. That's intended: a post in
     the feed shouldn't repaint the page.
4. **The palette set** (ids are permanent once WWW-30 stores them, like block
   `_type` names; labels can change):

   | id | label | mood |
   |---|---|---|
   | `tide` | Deep Tide | today's navy and sea; the default |
   | `forest` | Forest | deep green, moss surfaces |
   | `ember` | Ember | burnt orange on warm sand |
   | `plum` | Plum | violet, lavender surfaces |
   | `rose` | Rose | raspberry on blush |
   | `slate` | Slate | near-neutral grey-blue, low chroma, for people who want no colour |

   `tide` is also what `:root` uses, so `data-theme="tide"` and no attribute
   look the same.
5. **One list in TypeScript.** `src/themes/palettes.ts` exports
   `PALETTES = [{ id, label }] as const`, `type PaletteId`, `DEFAULT_PALETTE =
   "tide"` and `isPaletteId(x)`. WWW-30 validates against the same ids on the
   server; WWW-32 renders the picker from this list. The CSS stays in
   `src/themes.css`, imported by `index.css`, one block per palette.
6. **Status colours are shared, not per palette, but fixed for text.**
   - `--success`, `--warning`, `--destructive` stay the same hue in every
     palette, and get a lightness that passes 4.5:1 as **text** on `--card`
     and `--background` in both modes (darker in light mode, lighter in dark).
   - New `--success-foreground`, `--warning-foreground` for text on a solid
     fill, and `--color-destructive-foreground`, `--color-success-foreground`,
     `--color-warning-foreground` mapped in `@theme inline`.
   - So callouts (WWW-37) can use `bg-success/10 text-success` or
     `bg-warning text-warning-foreground`. `info` uses `primary`, `accent`
     uses `accent`.
   - Existing `bg-success` / `text-warning` uses get slightly darker in light
     mode; I'll check each of them on the dev page.
7. **Contrast is checked by a dev-only page, not by hand.**
   `/dev/themes`, mounted only when `import.meta.env.DEV`. It renders every
   palette × {light, dark} side by side, each as a `data-theme` box (dark ones
   inside a `.dark` box), showing a sample card, buttons, muted text, status
   colours and a post body through `PostContent`.
   - For each box it reads the computed colours (painted onto a 1×1 canvas to
     get sRGB, which works for `oklch`) and prints the WCAG ratio of each pair,
     flagged red when under the bar:

     | pair | bar |
     |---|---|
     | foreground on background, card, popover | 4.5 |
     | muted-foreground on background, card, muted | 4.5 |
     | primary-foreground on both primary gradient stops | 4.5 |
     | secondary/accent-foreground on secondary/accent | 4.5 |
     | primary, success, warning, destructive as text on card and background | 4.5 |
     | success/warning/destructive-foreground on their fills | 4.5 |
     | border on background, ring on card | 3 (non-text) |

   - Measured against the opaque token, not the translucent card over the
     gradient. Card alpha stays at 0.82, which keeps the gap small; the page
     shows the worst gradient stop too.
   - No new dependency. WWW-32 can reuse the swatch component for its picker.
8. **No change to `Theme.context`.** Light/dark stays a class on `<html>`; a
   palette is an orthogonal attribute. Persisting the light/dark choice isn't
   part of this ticket.

## Steps

1. `index.css`: split knobs from derivations; move derivations to
   `:root, [data-theme]` and `.dark, .dark [data-theme]`; add dark knobs with
   today's values; replace hard-coded hues with knobs; map the foreground
   status tokens. Check that the app looks unchanged in both modes.
2. Status colours: text-safe `--success` / `--warning` / `--destructive` and
   their foregrounds.
3. `src/themes/palettes.ts` and `src/themes.css` with the six palettes.
4. The channel banner overlay reads a token instead of a literal.
5. `/dev/themes` page with swatches and the contrast table. Tune each palette
   until every pair passes.

## Acceptance criteria

- With no `data-theme`, the app looks the same as before in light and dark
  (status colours aside, which are a little darker as text).
- `data-theme="forest"` (etc.) on any element, set in devtools, re-colours
  cards, buttons, primary gradient, muted text, borders and rings inside it,
  in both light and dark, and leaves everything outside it alone. The same
  attribute on `<html>` re-colours the page gradient too.
- `PostContent theme="plum"` shows the post body in Plum with no block
  changes.
- `/dev/themes` shows all 6 palettes × 2 modes with every listed pair passing;
  the route doesn't exist in a production build.
- `pnpm build` and `pnpm lint` pass. No tests (none in the repo).

## Changed during implementation

- **`tide` dark primary is now light** (`--primary-fill-l` 0.277 → 0.72, same
  hue). At 0.277 it measured 1.28:1 on dark cards, so the 14 `text-primary`
  uses and focus rings were all but invisible in dark mode. Buttons are
  unaffected: `.bg-primary` paints the gradient.
- **Borders left out of the contrast check.** `--border` measures 1.15:1
  (light) and 1.36:1 (dark) and is decorative by design; passing 3:1 would
  restyle every border. Rings are still checked at 3:1.
- **Notification badge** uses `text-destructive-foreground` instead of
  `text-white`, since the dark-mode red is now lighter.
- **Default knobs live on `:where(:root)`**, so `data-theme` on `<html>`
  (WWW-31) beats them regardless of stylesheet order.

## Out of scope

- Storing a persona's theme (WWW-30), applying it to the interface (WWW-31),
  the picker (WWW-32), viewers seeing it (WWW-33).
- Channel themes, custom colours, persisting light/dark.
- Restyling the app or redesigning the default palette.
