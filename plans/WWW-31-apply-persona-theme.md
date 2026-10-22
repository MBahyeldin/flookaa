# WWW-31 — Apply the active persona's theme to the interface

Branch `WWW-31-apply-persona-theme`, from `release-caterpie-v1010`. Epic
WWW-14 (Persona themes). Frontend only. WWW-30 stored `personas.theme` and
returns it from `/persona/current`; this ticket paints the dashboard with it.
WWW-32 is the picker, WWW-33 shows it to viewers.

## Goal

When you're in a persona, the whole interface uses that persona's palette.
Switching persona switches it; logging out or having no persona chosen goes
back to `tide`. Light/dark keeps working on top of any palette.

## Decisions

1. **`data-theme` on `<html>`.** `index.css` and `themes.css` already support
   it (`:where(:root)` defaults, `.dark[data-theme="…"]` dark knobs), and
   dialogs, sheets, popovers and toasts portal into `<body>`, so they're
   themed too without touching them. A wrapper `<div>` would miss portals.
2. **One hook, `usePersonaTheme(theme)`** in `src/hooks/`, called from
   `DashboardLayout` before its early returns (next to
   `useNotificationsRealtime`), with `persona?.theme`.
   - Sets `document.documentElement.dataset.theme` to the theme when
     `isPaletteId(theme)`, otherwise `DEFAULT_PALETTE` (an id this build
     doesn't know, e.g. a palette added later, falls back to `tide`).
   - Removes the attribute when there's no persona and on unmount, so the
     public layout (logged out) and the persona selection page are `tide`.
3. **No new state.** The persona in `UserProfileStore` is the source:
   switching (`setCurrentPersona` → `revalidatePersona` → `/current` →
   `setPersona`) already replaces it, and WWW-32's picker only has to update
   the store for the change to show.
4. **Nested scopes still win.** `PostContent`'s `data-theme` (blocks gallery,
   `/dev/themes`) is a closer `[data-theme]` and keeps re-colouring its own
   subtree. Posts in the feed pass no theme, so they follow the persona's
   palette; WWW-33 decides whether a post shows its author's theme instead.
5. **No cache across reloads.** On reload the loader shows in `tide` until
   `/current` answers, then the palette applies. Caching the last theme in
   `localStorage` would be wrong for a different user or persona on the same
   browser; not worth it for one loader frame.
6. **`<meta name="theme-color">` stays as is** (browser chrome colour on
   mobile). Out of scope; can follow if wanted.

## Steps

1. `src/hooks/usePersonaTheme.ts`: the effect described in 2.
2. `src/layouts/dashboard.tsx`: call it with `persona?.theme`.
3. `pnpm build` and `pnpm lint` in `front-end/`.

## Acceptance criteria

- With a persona whose theme is `plum` (set via `POST /persona/update/:id
  {"theme":"plum"}`), the dashboard, sidebar, dialogs, sheets, popovers and
  toasts render in Plum, in light and in dark mode.
- Switching to a `tide` persona from the sidebar footer switches the palette
  without a reload.
- Logging out shows the public pages in `tide`; the persona selection page is
  `tide`.
- A `theme` the frontend doesn't know renders `tide`.
- The blocks gallery's palette selector still re-colours only its preview.
- `pnpm build` and `pnpm lint` pass. No tests (none in the repo).

## Out of scope

- The theme picker (WWW-32), viewers seeing a persona's theme (WWW-33).
- Live update when the theme is changed on another device: WWW-32 publishes
  the change if it adds one; nothing here needs to change for it.
- `theme-color` meta, persisting the palette across reloads.
