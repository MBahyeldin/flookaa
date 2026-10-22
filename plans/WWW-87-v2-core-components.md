# WWW-87 — Frontend: restyle core UI components to v2

Second ticket of epic WWW-86, on top of WWW-81's tokens. It restyles `front-end/src/components/ui/` to the Figma Components page and adds the few v2 components pages will need. Page layouts stay as they are; they change in their own tickets (82, 85, 93, 94, 102–117).

Design: "Flookaa v2", Components page (`3:3`, frame `8:2`). Specs were pulled read-only on 2026-10-22 (sizes, padding, radius, token bindings, text styles). Section Header (`15:115`, Patterns) is pulled when implementing.

## Decisions

- **Restyle in place, keep the APIs.** Variant and size names stay as they are (`default` is Figma's Primary/md), so the ~130 call sites keep working. New props are additive.
- **Interaction states** follow the Figma variants:
  - Hover on filled buttons (primary, secondary, destructive) is a 12% `scrim` overlay. It's a `tint` utility in `index.css` (a `background-image` of `scrim` mixed to 12%), so it works on any fill and any palette.
  - Outline and ghost hover is `bg-muted`.
  - Focus is a 2px `ring` border (`focus-visible:ring-2 ring-ring`), with no translucent halo.
  - Disabled is 50% opacity.
  - Figma has no pressed variant, so pressed uses the same tint as hover.
- **Shadows and radius:**
  - Cards: 1px border, no shadow, `rounded-lg`.
  - `shadow-sm` is only for overlays: menu, popover, select, dialog, sheet, toast and tooltip.
  - The leftover `shadow-md/lg/xl/2xl` and `rounded-2xl` outside blocks are replaced (about 20 places, listed under Steps).
- **"One action pattern":**
  - The `borderRadius` prop is removed from `Button`; its 10 `borderRadius="full"` uses become the standard `rounded-md`.
  - Primary and secondary share sizes, so a pair always lines up.
  - Reordering buttons on pages is left to the page tickets.

### Components

| Figma | Code | Spec |
|---|---|---|
| Button | `ui/button.tsx` | `sm` h-8 px-3, `default` h-9 px-4, `lg` h-11 px-5; `rounded-md`; text 14 medium, leading 1. Primary `bg-primary`; Secondary `bg-secondary`; Outline `bg-card border`; Ghost transparent; Destructive `bg-destructive text-destructive-foreground` (no `text-white`, no dark `/60`); `link` kept. New `loading` prop: spinner (`Loader2`, 16) before the label, `disabled` and `aria-busy`. |
| Icon Button | `ui/button.tsx` sizes | `icon` 36, new `icon-sm` 32, icon 16. Same variants. |
| Chip | new `ui/chip.tsx` | Pill, py-1.5 px-3, gap 1.5, text 14 medium (emoji 14 regular). `interest`: `bg-muted border`, selected `bg-accent border-primary`. `filter`: `border`, selected `bg-foreground text-background`. A `<button>` with `aria-pressed` when it toggles. |
| Tag | `ui/badge.tsx` restyled | `rounded-sm`, py-0.5 px-2, gap 1, text 12 medium, icon 12. Default `bg-secondary text-secondary-foreground` (Figma's Tag); `outline` and `destructive` kept. New variant `count`: Count Badge, a pill, `bg-primary`, h-[18px] min-w-[18px] px-1.5, 12 medium. |
| Form Field | `ui/input.tsx`, `ui/textarea.tsx`, `ui/label.tsx`, new `ui/form-field.tsx` | Field h-12 (input), py-2.5 px-3, `bg-card border-input rounded-md`, text 16. Focus 2px ring; error (`aria-invalid`) `border-destructive` 1.5px. Label 14 medium, leading 1.2. `FormField` lays out label, control, then helper (12, muted) or error (12, destructive), with gap 1.5 and the ids wired (`htmlFor`, `aria-describedby`). |
| Section Nav / Tab | new `ui/section-nav.tsx` on Radix Tabs | Sticky `top-0`, `bg-background border-b`, gap 7, px 6; scrolls sideways on mobile (no scrollbar). Tab: pt-3, 14 medium, `text-muted-foreground`; active `text-foreground` with a 2px `bg-primary` bar. |
| Section Header | new `ui/section-header.tsx` | Overline (`text-overline` uppercase, muted), title, optional "See all" link, from `15:115`. |
| Avatar | `ui/avatar.tsx` | `size` prop xs 24 / sm 32 (default, as today) / md 40 / lg 56 / xl 96. Initials fallback `bg-accent text-primary`. `GeneratedAvatarFallback` stays for anonymous personas, so the privacy rules don't change. |
| Logo | new `ui/logo.tsx` | Square channel or community mark: image or initials. sm 32 `rounded-sm`, md 48 `rounded-md`, lg 80 and xl 112 `rounded-lg` with a 3px `card` border. `bg-primary text-primary-foreground`. No caller yet (WWW-80/82). |
| Tooltip | `ui/tooltip.tsx` | `bg-foreground text-background`, `rounded-sm`, py-1.5 px-2.5, 12 medium, no arrow. |
| Menu / Item | `ui/dropdown-menu.tsx` (+ `select`, `popover` content) | `bg-popover border rounded-md p-1.5 shadow-sm`, gap 0.5. Item h-9 px-2.5 gap-2.5 `rounded-sm`, 14 regular, hover `bg-muted`; icons 16. |
| Toast | `ui/sonner.tsx` | `toastOptions.classNames`: `bg-popover border rounded-md shadow-sm`, py-3 px-3.5, gap 2.5, 14; success icon `text-primary`. |
| Dialog | `ui/dialog.tsx` (+ `sheet` overlay) | `bg-popover border rounded-lg p-6 gap-3 shadow-sm`; title `text-h4` medium; description 14 muted; footer pt-2 gap-2, at the end. Overlay `bg-scrim/50`. The destructive tone is just the destructive button. |
| Code Input | `ui/input-otp.tsx` | Cells 48×56, gap 2, `bg-card border rounded-md`, digits `text-h3`. Active cell 2px `primary` border; error (`aria-invalid` on the group) 2px `destructive`; disabled 50%. |

### Call sites touched (mechanical only)

- **Spinners:** buttons that render their own `Loader2` while saving switch to `loading` (16 files show a spinner; only the ones inside a `Button` change).
- **Chips:** `components/interests/{InterestChips,InterestFilter,InterestPicker}` use `Chip`.
- **Tags:** `components/age-badge` uses `Badge`.
- **Shadows and radius:** the places listed under Steps get `shadow-sm` or no shadow, and `rounded-lg`/`rounded-xl` instead of `rounded-2xl`.
- **Toolbar popover:** the Portable Text toolbar popover's `bg-white … border-black/10` becomes `bg-popover border` (hard-coded colours break dark mode and palettes).

## Steps

1. `index.css`: the `tint` utility.
2. Restyle `button`, `badge`, `input`, `textarea`, `label`, `avatar`, `tooltip`, `dropdown-menu`, `select`, `popover`, `sonner`, `dialog`, `sheet`, `card`, `input-otp`.
3. New: `chip`, `form-field`, `section-nav`, `section-header`, `logo`.
4. Call sites: remove `borderRadius`; `loading`; chips; age badge.
5. Shadows and radius: `popover`, `sheet`, `dialog`, `dropdown-menu` (×2), `select`, the portable-text toolbar popover, `comment-section/item`, `AuthScreen`, `verify-email`, communities `create` / `CommunityCard` / `[slug]` avatar, `persona-manager/[id]` (×2), channels `create` / `ChannelCard` / `[id]`. Block components keep `rounded-2xl`.
6. `/dev/themes` gets a components row: button variants × states, chips, tags, count badge, field states, avatar and logo sizes, a menu, a section nav. One place to check them in every palette.
7. CLAUDE.md, Frontend conventions: one line on the v2 primitives (`Chip`, `FormField`, `SectionNav`, `SectionHeader`, `Logo`, `Button loading`, `Badge count`) and that hover is `tint`.

## Verification

- `pnpm build`, `pnpm lint`; `npx tsc -b` adds no new errors (30 today, all in `src/generated/graphql.ts` and `src/utils/permissions.ts`).
- `grep` finds no `borderRadius=`, no `shadow-(md|lg|xl|2xl)`, and `rounded-2xl` only under `portable-text/blocks`.
- `/dev/themes`, in all 6 palettes, light and dark:
  - The states match Figma.
  - Focus rings are visible.
  - Filter chip selected (`background` on `foreground`) and tooltip text pass AA.
- Screenshots of the components row next to Figma `8:2`.
- On the dev server (needs a logged-in backend, so you or I on internal-build):
  - log in, verify email (code input), the onboarding interests step (chips), a channel page (menu, dialog, toast), and the persona manager form;
  - nothing overflows with the taller 48px fields.

## Out of scope

- Sidebar and mobile header (WWW-85).
- Skeleton, empty and error states (WWW-88).
- Hero and tiles (WWW-82/93).
- Composer (WWW-109).
- Using `SectionNav`, `SectionHeader` and `Logo` on pages (WWW-82, 94, 113).
- Reordering actions on pages.

## Implementation notes

- **Section Header** (`15:115`):
  - Layout: bottom-aligned row, gap 16. The left side holds the overline (`UI/Overline`, `primary`, uppercase) above an `h2`, with gap 4. On the right, "See all" (14 medium, `primary`) plus `chevron-right`, mirrored in RTL.
  - The link goes through react-router `Link` (`seeAllTo`).
- **`tint` in older browsers:** Tailwind compiles it like its `/opacity` modifiers, so browsers without `color-mix` get the solid colour. That's the same fallback every `bg-x/50` in the app already has.
- **Focus without layout shift:** a 1px `ring` over the 1px border gives Figma's 2px focus stroke. Error is the border plus a 0.5px ring, giving 1.5px.
- **Chip:** got a `size="sm"` (12px, py-0.5 px-2.5) for the dense interest lists on cards (`InterestChips`). Figma only has the 14px chip, used by filters and pickers.
- **Not changed:** `InterestPicker`'s grid of big emoji tiles. That is the onboarding step's own design (WWW-116), not a chip; only its "No longer offered" chips became `Chip`.
- **Code input:** verify-email now shows six cells in one row (no separator), and the error turns every cell red through `aria-invalid` on the group.
- **Leave for WWW-93 (tiles):** the image-overlay tags on `ChannelCard` / `CommunityCard` (`bg-black/50 text-white` on the cover).
- **Round icon buttons** keep `rounded-full` on purpose: the audio player's play button and the profile-picture camera button.
- **Not on `/dev/themes`:** menu, tooltip, toast and dialog. They portal to `body`, so they would show the app palette, not the swatch's. Check them in the app.
- **Checks:**
  - `pnpm build` and `pnpm lint` are clean.
  - `npx tsc -b` has 30 errors before and after. They are all pre-existing, in `src/generated/graphql.ts`, `src/utils/permissions.ts` and `src/components/portable-text/useBlockObjectPopover.ts`. WWW-81's note left out the last file.
  - No `borderRadius` remains; `shadow-md` and up are gone; `rounded-2xl` is left only in `portable-text/blocks`.
- **`/dev/themes`, all 12 swatches:**
  - All 28 pairs pass; the lowest is 4.63.
  - The new pairs are `background / foreground` (filter chip selected, tooltip) and `primary / accent` (avatar initials).
  - Primary hover computes to the scrim at 12%. Input focus is a `primary` border plus a 1px ring. Fields are 48px and buttons 36px.
- **Not checked:** login, onboarding, channel and persona pages. They need a logged-in backend; check them on internal-build.
