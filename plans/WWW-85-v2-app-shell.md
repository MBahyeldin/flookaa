# WWW-85 — Frontend: app shell with labelled sidebar

Third ticket of epic WWW-86, on top of WWW-81 (tokens) and WWW-87 (core components). It replaces the dashboard chrome: the sidebar, the mobile header, and the fixed bell and theme toggle in the top right. Pages keep their layouts; they change in their own tickets.

Design: "Flookaa v2", Components page. `Sidebar` (`11:232`, Expanded `11:68` / Collapsed `11:166`), `Sidebar/Item` (`11:67`), `Count Badge` (`11:38`), `Tooltip` (`11:255`), `Mobile Header` (`11:233`). In context: Desktop / Tablet / Mobile Feed (`21:2`, `21:897`, `21:1402`), collapsed frames from WWW-118 (`84:4335`, `86:16926`, `86:17076`), 404 in the shell (`84:14476`, `84:14616`). Specs were pulled read-only on 2026-10-22.

Same routes, new chrome, existing hooks and stores (`useUserProfileStore`, `NotificationStore`, `useTheme`, `useAuth`, `setCurrentPersona`).

## Decisions

- **Three modes by width:**
  - Desktop (≥ 1024): expanded 248px or collapsed to a 64px icon rail. The toggle is a `panel-left` icon button in the sidebar top. The choice is kept per browser in `localStorage` (try/catch, default expanded).
  - Tablet (768–1023): always the icon rail, with no toggle.
  - Mobile (< 768): no sidebar; a sticky mobile header, whose `panel-left` button opens the expanded sidebar as a left sheet (closes on navigate).
- **Entries, in order:** Home `/` (house), Channels `/channels` (hash), Communities `/communities` (users), Notifications `/notifications` (bell, count badge), Personas `/persona-manager` (user-round), Settings `/settings/profile` (settings), then Admin `/admin/interests` (shield-check) for global Administrators.
  - **Discover** (compass) and **Saved** (bookmark) aren't rendered until their pages exist (WWW-84, WWW-110), per "hide inactive buttons". Each of those tickets adds its line.
  - **Removed:** Inbox and Search (no routes) and Blocks. `/blocks` stays as a route and is linked from the composer's insert menu later (WWW-109); until then it's reachable by URL only (user decision 2026-10-22).
  - Settings and Admin become single links (no sub-menus); WWW-97 and WWW-106 build their own section navs.
- **Item:** h-10, px-3, gap-3, `rounded-md`, icon 20. Default: 14 regular, `text-muted-foreground`, hover `bg-sidebar-accent`. Active (route match, `/` exact, others by prefix): `bg-sidebar-accent text-sidebar-accent-foreground`, 14 medium, `aria-current="page"`. Collapsed: a 40×40 square with a right-side `Tooltip` holding the label. The badge is `Badge variant="count"` (99+ cap) at the row end; on the rail it sits on the icon's top corner.
- **Top:** brand (lucide `sailboat` 24, `text-primary`, "Flookaa" 20 semibold), pb-4 pl-3; collapse button `icon-sm` ghost at the end. On the rail: the brand mark, then the expand button under it.
- **Footer (bottom-pinned, gap 2):**
  - Appearance (sun-moon) is an item that toggles light/dark through `useTheme`. Its label reads "Appearance"; `aria-pressed` reflects dark mode.
  - Persona switcher: a bordered `rounded-md` p-2 row with `Avatar size="sm"` (thumbnail or initials), name 14 medium, `@slug` 12 muted, chevron-down. It opens the existing dropdown (other personas, then Log out), `side="top"` when expanded, `side="right"` on the rail. On the rail it's just the avatar.
  - Name shown is the persona's display name (first + last); the private `name` label isn't shown in the chrome anymore. It stays in the dropdown rows so personas with the same display name can be told apart.
- **Notifications:** the sidebar entry links to `/notifications` (the page already exists). The mobile header's bell keeps today's `NotificationBell` popover, restyled to the header (22px icon, badge beside it, `icon` button). The fixed top-right bell and theme toggle are removed.
- **Colours:** the shell is `bg-sidebar border-r border-sidebar-border` and always uses the viewer's palette (`data-theme` from `usePersonaTheme`), never a channel's or community's. The mobile header is `bg-background border-b`, `h-14`, px-4, gap-3. The body background is already plain `bg-background` since WWW-81; this ticket only checks that no layout re-adds glows.
- **404 in the shell:** a catch-all `*` route renders `components/not-found`, restyled to `84:14476` (title, line, "Go home" button). Logged out it renders inside the public layout (`84:14575`) with no extra work. Pages that already render `NotFound` for missing entities keep doing so.
- **Built on `components/ui/sidebar.tsx`** (shadcn), not a new component: it already does the provider, mobile sheet, rail widths, tooltips and keyboard shortcut (Ctrl/⌘+B). Changes there: widths 248 / 64 (`15.5rem` / `4rem`), `localStorage` instead of its cookie, a tablet breakpoint that forces the rail, and restyled `SidebarMenuButton` sizes. Unused parts (`SidebarMenuSub*`, `SidebarGroupLabel`, `SidebarInput`, `SidebarRail`…) are deleted if nothing else imports them.

## Steps

1. `hooks/useMobile.ts`: add a `useBreakpoint()` returning `mobile | tablet | desktop` (768 / 1024), keep `useIsMobile` for its other callers.
2. `ui/sidebar.tsx`: widths, `localStorage` persistence, tablet forces `collapsed`, item styles to the spec above, trim unused exports.
3. `components/app-sidebar/`: rewrite `index.tsx` (top, nav list, footer), new `SidebarNavItem.tsx` (link, active state, tooltip, optional badge) replacing `CollapsibleItem.tsx` and `MainMenuItem.tsx`; restyle `AppSidebarFooter.tsx` into Appearance + persona switcher on `ui/avatar` (drops the direct `@radix-ui/react-avatar` import).
4. New `components/mobile-header/index.tsx`: sidebar trigger, brand, `NotificationBell`.
5. `layouts/dashboard.tsx`: `SidebarProvider` without the local `open` state, `AppSidebar`, `MobileHeader` (mobile only), `main`. Remove the fixed bell/toggle block. `components/toggle-theme` is deleted if nothing else uses it.
6. `NotificationBell`: icon size and badge placement to the header spec; no behaviour change.
7. `routes/AppRouter.tsx`: `*` → `NotFound`; restyle `NotFound` to the 404 frame.
8. CLAUDE.md, Frontend conventions: one line on the shell (entries in `app-sidebar/index.tsx`, three modes, a new page adds its entry there, viewer palette only).

## Verification

- `pnpm build`, `pnpm lint`; `npx tsc -b` stays at 30 pre-existing errors.
- Dev server at 1440, 834 and 390 wide, compared with the Feed frames and the collapsed frames:
  - desktop collapse/expand, reload keeps it; tablet shows the rail with tooltips and no toggle; mobile header opens the sheet, and a link closes it.
  - active item on each route, including nested ones (`/channels/12` lights Channels).
  - badge updates live from a notification; the header bell's popover works on mobile.
  - Appearance toggles dark; persona switch and log out work; Admin shows only for an administrator.
  - keyboard: Tab through items, focus ring visible, Ctrl/⌘+B toggles on desktop; tooltips show on focus in the rail.
  - an unknown URL shows the 404 in the shell.
- All 6 palettes, light and dark: the sidebar follows the persona's theme and stays on it on a themed channel page (once WWW-82 lands).
- Logged-in checks need a backend (internal-build).

## Out of scope

- RTL mirroring (WWW-91) and translated labels (WWW-90). Sides use logical properties where it's free.
- Discover and Saved entries (WWW-84, WWW-110).
- Public layout header (`navbar/header`), auth screens (WWW-107).
- Loading/empty/error states inside pages (WWW-88).
- Settings and admin section navs (WWW-97, WWW-106).

## Implementation notes

- **`ui/sidebar.tsx`** went from 737 to about 300 lines. The variants that weren't used (`floating`/`inset`, `offcanvas`, right side), `SidebarMenuSub*`, `SidebarGroup*`, `SidebarInput`, `SidebarRail`, `SidebarInset`, `SidebarSeparator`, `SidebarMenuAction/Badge/Skeleton` and the controlled `open` prop are gone. The context exposes `state`, `isMobile`, `canToggle` (desktop only), `openMobile` and `toggleSidebar`.
- **Saved state:** the `localStorage` key is `sidebar_expanded`, and a missing or unreadable value means expanded. The old `sidebar_state` cookie is no longer read.
- **`useIsMobile`** now wraps `useBreakpoint()`. Its first render already knows the width, where the old hook said "not mobile" for one frame.
- **Rail labels** stay in the DOM as `sr-only`, so links keep their names. The Notifications link reads "Notifications, N unread", and the visible badge is `aria-hidden`.
- **Mobile header bell:** a ghost `Button` with the icon and the badge beside it (Figma), no longer a badge over the icon.
- **`components/toggle-theme`** stays: the public header (`navbar/header`) still uses it.
- **404** follows `84:14476` / `84:14575`: a sunken panel with a search icon, then "Back to your feed" when logged in, or "Log in to continue" (`/login?next=<path>`) when logged out.
- **Checks:** `pnpm build` and `pnpm lint` are clean, and `npx tsc -b` still has the 30 errors that were there before.
- **Not checked:** nothing has been checked in a browser. The Playwright browser was taken by another session, and the logged-in shell needs a backend. All of Verification remains for internal-build.
