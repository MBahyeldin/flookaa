# WWW-45 — In-app blocks gallery page

Branch `WWW-45-blocks-gallery`, from `release-caterpie-v1010`. Epic WWW-13
(Portable Text custom blocks). Builds on WWW-24 (registry + `examples`),
WWW-29 (palettes) and WWW-36 (block picker). Frontend only.

## Goal

A page, `/blocks`, where a persona explores every post block: what it is,
how to insert it, and its registry `examples` rendered exactly as a post
renders them, inside the post theme wrapper, under any palette. Works on
mobile and desktop. No Storybook, and no per-block code: a block added to
`blocks` shows up here by itself.

## Decisions

1. **Route.** `/blocks`, next to `/notifications` in `AppRouter`, in the
   dashboard like every other page (so it inherits the persona tier). Not
   dev-only, unlike `/dev/themes`. `pages/(dashboard)/blocks/index.tsx`.
2. **Rendered through `PostContent`.** It gains an optional `value` prop
   (already-parsed blocks) used instead of `rawContent`, so the gallery goes
   through the same `PortableText` components, wrapper (`post-content`,
   `data-theme`) and validation as a real post. Each example becomes
   `{ _type: block.name, _key: "<name>-<i>", ...example }`. The gallery
   passes `showInvalid`, so a broken example shows the "needs fixing" notice
   instead of disappearing silently.
3. **Layout.** One column at post width (`max-w-2xl`), grouped by category
   in registry order with the picker's category titles (`categoryTitle`
   moves out of `block-picker.tsx` into `blocks/defineBlock.ts` next to
   `BlockCategory`, so both use it).
   - Per block: icon, title, description, a `/<name>` chip (the slash
     command), then each example in its own `bg-card` frame, stacked.
   - A sticky jump bar of block chips under the header, horizontally
     scrollable on mobile; each section has `id="<name>"`, so
     `/blocks#callout` deep-links.
4. **Palette switcher.** A `Select` of `PALETTES` in the header, default
   `tide`, applied as `theme` to every example. Light/dark stays the global
   toggle. The choice lives in the URL (`?theme=forest`), not storage, so a
   link shows the same view.
5. **Examples are live.** They are the real `View`s: spoilers reveal,
   accordions open, the countdown ticks, the voice note plays, checklists
   show their stored state. Nothing on the page writes anything.
6. **Entry points.**
   - Sidebar: a "Blocks" item (`Blocks` icon), after Channels, for verified
     users.
   - Block picker: a "See all blocks" link under the grid (desktop popover
     and mobile sheet), opening `/blocks` in a new tab so the draft in the
     composer isn't lost.

## Steps

1. `PostContent`: optional `value` prop.
2. `categoryTitle` to `defineBlock.ts`; `block-picker.tsx` imports it.
3. `pages/(dashboard)/blocks/index.tsx`: header + palette select, jump bar,
   sections from `blocks`.
4. Route in `AppRouter`, sidebar item, "See all blocks" link in `BlockGrid`.
5. Found while building: a long grid caption in the gallery block
   (WWW-43) overflowed its cell on phones (`w-fit` beat `truncate`), so a
   post scrolled sideways. Capped with `max-w-full`.

## Acceptance criteria

- `/blocks` lists every block in `blocks`, grouped Media / Layout in
  registry order, each with icon, title, description, `/name` and all its
  examples.
- Examples look identical to the same blocks in a posted post.
- Switching palette restyles every example; `?theme=` survives reload and a
  shared link; an unknown value falls back to `tide`.
- Light and dark both read correctly.
- Jump chips scroll to their block; `/blocks#gallery` opens scrolled there.
- At 360 px wide: no horizontal page scroll, the jump bar scrolls on its
  own, images and gallery fit.
- Spoiler, accordion, countdown, gallery and voice note are interactive on
  the page.
- An example made invalid on purpose shows the "needs fixing" notice
  (checked locally, not committed).
- The sidebar item and the picker link both reach the page; the picker
  link opens a new tab and the draft stays.
- Feed and preview rendering of posts are unchanged.
- `pnpm build` and `pnpm lint` pass. The repo has no test runner.
- Frontend-only deploy.

## Out of scope

- "Use this block" (start a post from an example), copying JSON, or an
  editable playground.
- Search/filter on the page (the jump bar covers 11 blocks).
- Persona themes (WWW-30..33): the page picks palettes by hand.
- Public (logged-out) access.
