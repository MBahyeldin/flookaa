# WWW-76 — Flookaa Figma design system

No code changes. Depends on WWW-75 (the literal tokens it mirrors).

## Goal

- One Figma file, "Flookaa Design System", showing flookaa as it is today:
  - variables equal to the WWW-75 tokens
  - shadcn new-york components bound to them
  - flookaa's own patterns
  - every main screen at mobile, tablet and desktop
- Built in the user's own Figma team ("muhammad baheuddeen's team", Full
  seat). The `flookaa-claude` team seat is View-only. The file can be moved
  there later.
- Out of scope: redesigns, new screens, Code Connect (`code_layers_enabled`
  is false).

## Decisions

1. **Breakpoints**, from the code: Tailwind `sm` 640 / `md` 768 / `lg` 1024
   / `xl` 1280, and the sidebar becomes a Sheet below 768
   (`src/hooks/useMobile.ts`).

   | Frame | Size | Layout |
   |---|---|---|
   | Mobile | 390 × 844 | below `sm`; sidebar as Sheet, header trigger |
   | Tablet | 834 × 1194 | `md`; fixed sidebar, narrow content |
   | Desktop | 1440 × 900 | `lg`/`xl`; full layout |

2. **Variables**
   - `Theme`: every WWW-75 token, modes Tide Light, Tide Dark … Slate Dark
     (12). If the plan caps modes, `Theme` gets Tide Light/Dark plus one
     collection per other palette; the reply says which was used.
   - `Primitives`: radius sm 6 / md 8 / lg 10 / xl 14, and spacing on the
     Tailwind 4 px scale.
   - `Breakpoint`, modes Mobile / Tablet / Desktop: frame width, page
     gutter, heading sizes (h1 24→30, h2 20→24, h3 18→20, h4 16→18,
     h5 14→16 at `md`, from `index.css` base layer).
3. **Only variables and instances** in patterns and screens: no raw hex, no
   detached components. Lucide icons as instances.
4. **Pages**: Cover · Foundations · Components · Patterns · Mobile · Tablet ·
   Desktop · Themes.

## Steps

1. **File.** `create_new_file` "Flookaa Design System" in the user's team,
   `create_session`, then create the pages.
2. **Variables** (skill `figma-generate-library`): `Theme` from the hex
   values in WWW-75's `themes.css`, then `Primitives`, then `Breakpoint`.
3. **Text styles**: Inter. Body 16 / 1.625, h1–h5 bound to `Breakpoint`,
   plus small and muted text.
4. **Foundations page**: colour swatches per token (shown in a mode
   switcher frame), type scale, radius, spacing.
5. **Components** (auto layout, so they resize across breakpoints):
   - button (default / secondary / outline / ghost / destructive / link ×
     sm / default / lg / icon)
   - badge, input, textarea, select, input-otp, switch, toggle, toggle-group
   - tabs, card, dialog, sheet (left / right / bottom), popover,
     dropdown-menu, tooltip
   - avatar (+ generated fallback), separator, skeleton, table, breadcrumb,
     sonner toast
   - sidebar parts: expanded, collapsed, mobile Sheet
6. **Patterns**, with Mobile / Tablet / Desktop variants where the layout
   changes:
   - dashboard shell (sidebar + header; mobile: header trigger + Sheet)
   - PostCard, ChannelCardBody, CommunityCardBody, PersonaCard,
     notification row
   - OnboardingShell, OnboardingFooter, brand-gradient progress bar
7. **Reference screenshots.** Playwright against `pnpm dev`, logged in with
   seeded data: every screen in step 8, full page, at 390, 834 and 1440
   wide. Kept in the scratchpad.
8. **Screens** (skill `figma-generate-design`): one Mobile, one Tablet and
   one Desktop frame per screen, on the matching page:
   1. Auth: login, sign-up, verify-email
   2. Onboarding: about you, interests, communities, channels, personas,
      persona wizard (basics, privacy, interests)
   3. select-persona
   4. Home feed
   5. Channels list, channel detail, PostDialog, Manage channel sheet
   6. Communities list, community detail (+ MembersSheet), create community
   7. Persona profile (full and locked), FollowersSheet, persona-manager
   8. Notifications (page and popover)
   9. Settings / profile
   10. Admin / interests
9. **Themes page**: home and channel detail (desktop) plus home (mobile),
   each in Tide Dark and two other palettes, set by switching the frame's
   `Theme` mode.

## Order

Steps 1–6 can start as soon as WWW-75's values exist (its step 2). Steps
7–9 after WWW-75 is merged, so the screenshots come from the literal tokens.

## Verification

- `get_screenshot` of each frame next to its step 7 screenshot at the same
  width.
- `get_metadata` / `get_variable_defs`: no unbound fills or strokes.
- Switching `Theme` mode recolours a frame completely, and switching
  `Breakpoint` mode updates the type sizes.
- A script compares the Figma variable values with `themes.css` and finds
  no difference.
