# WWW-81 — Frontend: v2 palettes, tokens and Readex Pro font

First code ticket of epic WWW-86. It changes the design system only: tokens, fonts, global base styles and the few places that use a retired token. Component restyling is WWW-87; page layouts are their own tickets.

Design: "Flookaa v2" (`cB5tjyC1Vpx9aMQsrX0kDY`), Foundations page `3:2`, specimen `4:2`. Variable ids: `plans/WWW-77-figma-handoff.md`. Values: `plans/WWW-77-redesign.md` §2.

## Decisions

- **Palette ids, labels and token names stay.** `themes/palettes.ts` doesn't change; only values in `themes.css` do.
- **Source of truth for values is Figma.** Before editing, `whoami` (must be Sara's account, see the handoff), then `get_variable_defs` on the specimen `4:2` for all 7 `Theme` modes. Every light block and Deep Tide Dark are copied from it one to one. Where Figma and §2 disagree, Figma wins and the plan's notes say so.
- **Dark mode for the other five palettes is derived in code** (decided 2026-10-21), not in Figma:
  - Neutrals (`background`, `card`, `popover`, `muted`, `border`, `input`, `secondary`, `surface-sunken`, `sidebar*` neutrals) are Deep Tide Dark's, tinted a few degrees toward the palette's hue, so every dark palette sits on the same warm charcoal.
  - `primary` / `ring` / `sidebar-primary` are a lighter step of the palette's light `primary` (same hue), at least 4.5:1 on `background`, `card`, `muted` and `surface-sunken` (aim for about 7:1 like Deep Tide Dark's `#7DB3AC`).
  - `primary-foreground` is a near-black of the same hue, at least 4.5:1 on `primary`.
  - `accent` is a dark tint of the hue, with `foreground` on it at least 4.5:1.
  - `hero-overlay` is `#000000A6` in every dark block.
  - Computed by a throwaway script in the scratchpad (not committed), then written as literals.
- **Literals only**, as today: `#RRGGBB` / `#RRGGBBAA`, no `var()`, `calc` or `oklch` between colour tokens. `hero-overlay` (foreground at 55%) is written out per palette, e.g. Deep Tide light `#1E21248C`.
- **New tokens** in every light and dark block: `surface-sunken`, `hero-overlay`, mapped in `index.css` `@theme inline` (`bg-surface-sunken`, `bg-hero-overlay`). `hero-overlay` has no consumer yet (Figma keeps hero text off the image); it's for the uploaded-cover variant.
- **Retired tokens** are deleted from every block and from `index.css`: `card-glass`, `card-glass-sheen`, `card-glass-border`, `page-glow-1..3`, `page-wash-from/-to`, `primary-gradient-from/-to`, `brand-start`/`brand-end`, `--font-inter`. Also the rules that used them: the body gradient (body is plain `bg-background`), the `.bg-primary` gradient (primary is flat), and the `[data-slot="card"]` glass override (cards fall back to `bg-card` + `border`).
- **`scrim` and `sidebar-solid` stay** (they're in Figma's `Theme` collection and in use).
- **Status and chart colours** keep today's values in `index.css`.
- **Radius**: explicit values in `@theme inline` instead of the `calc(var(--radius) …)` ramp: `sm` 4, `md` 6, `lg` 8, `xl` 12, `2xl` 20 (blocks only). `--radius` becomes 8px for anything shadcn reads directly.
- **Shadow**: `--shadow-sm` set to Figma's `Shadow/sm`. Other shadow sizes aren't redefined; replacing `shadow-md/lg/xl` and `rounded-2xl` in components (about 23 uses) is WWW-87's job, as is dropping `shadow-sm` from `Card`.
- **Font**: Readex Pro from Google Fonts (variable, `wght@160..700`, same `@import` style as Inter today), as `--font-sans` so it's the default for everything, with `system-ui, sans-serif` fallback. Inter's `@import` is removed.
- **Type scale** as `@theme` tokens, each with its line height: `text-display` 32/48, `text-h1` 26/32, `text-h2` 21/24, `text-h3` 18/20 (mobile / `md:`), `text-body` 16 with 1.6, `text-small` 14, `text-xs` stays Tailwind's 12. The `@layer base` `h1`–`h3` defaults use them (`text-h1 md:text-h1-md` style pairs, or a `@utility` per heading that includes the `md` step; whichever reads cleaner, one way for all). `body` line height becomes 1.6 (was `leading-relaxed` 1.625).
- **Article style**: a `@utility article` in `index.css`: body 18 / 1.75, `max-width: 68ch`, paragraph spacing 1em, `blockquote` in `text-primary`. No consumer yet; WWW-108 applies it on the post page.
- **Retired-token call sites** fixed here, minimally:
  - `pages/onboarding/OnboardingProgress.tsx`: `bg-primary` fill on a `bg-muted` track (Figma: accent on a neutral track).
  - `pages/home/visitor.tsx`: drop the `font-[var(--font-inter)]` classes (inherits Readex Pro). The page's layout is WWW-114.
  - `pages/dev-themes/index.tsx`: the two gradient pairs become `primary-fg / primary`; add `fg`, `muted-fg` and `primary` on `surface-sunken`, `fg / secondary`, `fg / accent`, and a swatch row for the new tokens.
- `welcome-bg-bottom` (a background image, not a token) stays; WWW-115 replaces the auth layout.
- **CLAUDE.md**:
  - Rewrite the "Theme palettes" section: light blocks and Deep Tide Dark mirror Figma; the other dark blocks are derived in code (rule above); list `surface-sunken` and `hero-overlay`; remove the glass, glow, wash, gradient and brand text; mention the radius scale, `shadow-sm`, Readex Pro, the type tokens and `article`.
  - Add a short "Figma" section: file key and link, which account and team it lives in, how to pull (`whoami`, `create_session`, `get_variable_defs` on `4:2`, `get_design_context` per frame), and that each WWW-86 child's Jira ticket links its frames. Taken from WWW-86's "Design source and how to pull".
- **Memory** `design-tokens-in-one-place` is updated: no more brand colours; fixed values go in `index.css`'s `@theme`.

## Steps

1. Pull the 7 `Theme` modes, `Shadow/sm` and the text styles from Figma; note any difference from §2.
2. `themes.css`: rewrite the six light blocks and Deep Tide Dark from Figma; derive and write the five other dark blocks; add the two new tokens; delete the retired ones.
3. `index.css`: fonts, radius, shadow, type tokens, heading defaults, `article`; delete the gradient, glass and brand rules; map the new colour tokens.
4. Fix the three call sites above.
5. `/dev/themes`: new pairs and swatches; check every palette in light and dark.
6. CLAUDE.md and the memory note.

## Verification

- `grep` for every retired token name in `front-end/src` returns nothing.
- `pnpm build` and `pnpm lint` pass. (The build only fails on `.tsx` errors; run `npx tsc -b` too and check `.ts` output.)
- `/dev/themes` (dev build): every pair passes in all 6 palettes × light/dark, and the lowest ratio is written in the notes below.
- Spot check on the dev server: dashboard, a channel, onboarding progress, the visitor home, in Deep Tide light and dark plus one other palette. Text is Readex Pro (English and an Arabic sample), the page background is flat, nothing uses the old gradient.
- Expected and fine: components still carry today's shapes (bigger shadows, `rounded-2xl` in places) until WWW-87.

## Out of scope

- Restyling components (WWW-87), loading/empty/error states (WWW-88), app shell (WWW-85).
- RTL and `dir` (WWW-91); Readex Pro covers Arabic glyphs already.
- Per-channel/community theme (WWW-80, WWW-82).

## Implementation notes

- **Pulled 2026-10-22** as Sara (`whoami`) with one read-only `use_figma` script: all 40 `Theme` colours × 7 modes, `Primitives`, `Breakpoint`, 16 text styles, `Shadow/sm`. The light values and Deep Tide Dark equal §2's tables.
- **Figma differs from §2 on type**, and Figma won:
  - `Breakpoint` has a Tablet step. Sizes (Mobile / Tablet / Desktop): display 32/40/48, h1 26/30/32, h2 21/22/24, h3 18/19/20, h4 16/17/18, lead 18/19/20, article 17/18/18.
  - In code these are `--type-*` on `:root`, overridden at `md` (48rem) and `lg` (64rem). `@theme inline` maps them to `text-display`, `text-h1`..`text-h4` and `text-lead`, with Figma's line heights and tracking, so one class is responsive and no `md:` pairs are needed. `text-overline` is 12 / 1.2 / 0.08em.
  - Article body is 17–18 at 1.75 line height, not a flat 18.
  - Weights: display, h1 and h2 are semibold; h3 and h4 are medium.
  - Tailwind's `text-base`, `text-sm` and `text-xs` keep their sizes and take Figma's line heights: 1.6, 1.5 and 1.4.
- **`Shadow/sm`** is two layers, `0 1px 2px #1e21240f, 0 4px 12px -2px #1e212414`. It is fixed, not per palette.
- **Derived dark palettes:**
  - Each dark palette takes every Deep Tide Dark colour at the same OKLCH lightness and chroma, rotated to the hue of the palette's light `primary`.
  - Each `primary` has chroma scaled by the light primary's chroma (capped at 0.12), then lightness raised until it reaches 7:1 on `card`.
  - Results: Forest `#89b484`, Ember `#ea9175`, Plum `#c59dbf`, Rose `#e69096`, Slate `#97aac4`.
  - The script was a throwaway in the scratchpad and is not committed.
- **Contrast** on `/dev/themes`: all 26 pairs pass in all 12 swatches (6 palettes × light/dark).
  - Lowest overall: 4.63:1, `success` on `muted` in Ember light (status colours are unchanged).
  - Lowest in dark: 5.96:1, `destructive` on `card` in Forest.
- **Mapping** follows Figma: `popover` = `sidebar` = `sidebar-solid` = `card`; `sidebar-accent` = `muted`; `ring` and the sidebar primaries = `primary`. Light `scrim` is the palette's `foreground`.
- **Checks:**
  - `pnpm build` and `pnpm lint` are clean.
  - `npx tsc -b` reports the same 30 errors as before this change, all in `src/generated/graphql.ts` and `src/utils/permissions.ts`.
  - `grep` finds none of the retired token names.
  - On the dev server: the body is `Readex Pro`, Arabic glyphs load, `h1` is 32px at 1280 wide and 26px at 390, and the body has no background image.
- **Not checked visually:** the dashboard, channel and onboarding pages. They need a logged-in backend, and the dev server had none.
