# WWW-117 — Personas manager list and persona selection to v2

Epic WWW-86. Same routes (`/persona-manager`, and `pages/select-persona` rendered by `DashboardLayout` when no persona is current), new layout, existing store (`useUserProfileStore`) and services (`setCurrentPersona`, `fetchUserPersonas`). Frontend only, no backend change. The settings page `/persona-manager/:id` is WWW-103, not this ticket.

Design: "Flookaa v2", Personas desktop `24:505`, mobile `24:1230`; Select persona desktop `66:8960`, mobile `66:9131`; persona switcher open `79:3457`, component `76:527`. Pulled read-only on 2026-10-27.

## 1. Shared row (`components/persona-row`)

One `PersonaRow` used by the manager, the selection screen and the onboarding Personas step:

- A bordered `bg-card rounded-xl` row wrapped in the **persona's own `data-theme`**, so its colours come from its palette: a 4 px `bg-primary` accent edge on the left, the avatar (thumbnail, else initials on `bg-accent text-primary`), the display name (`first_name last_name`, else `@slug`) and a muted line **"@slug · {Theme} theme"** that wraps on mobile instead of clipping.
- Tags on the right from `md`: the **privacy** `Badge` with its icon (Globe Public, Lock Private, EyeOff Only me) and **Default** on the default persona. Hidden below `md`, as in the mobile frames.
- An `action` slot on the far right (Manage / Continue buttons are passed in).

## 2. `/persona-manager`

- Heading `h1` "Personas" with the lead "Each persona is a facet of you, with its own name, theme and followers. People follow a persona, not you." and a primary **"New persona"** button (right of the heading from `md`, under the lead on mobile).
- The table goes; a stack of `PersonaRow`s, default first, each with an outline **Manage** button that goes to `/persona-manager/:id`. The `⋯` menu (Edit, View profile) goes: Manage covers Edit, and View profile is on the settings page and the profile itself.
- **"New persona"** opens the onboarding `PersonaWizard` in create mode (the v2 three-step dialog: basics, privacy, interests) instead of the old `Form.persona` dialog. Its catalogue persona is the current one.

## 3. Persona selection (`pages/select-persona`)

- Its own top bar: `Brand` left, a ghost **"Log out"** right (there's no sidebar here, and today the screen has no way out).
- A centred column (`max-w-2xl`): `h1` "Choose a persona", lead "You post, join and follow as the persona you pick. Switch any time from the sidebar.", an outline **"New persona"** button (same wizard, catalogue persona = the default one).
- `PersonaRow`s, each with **Continue**: primary on the default persona, outline on the others (in each row's own palette, as the frame shows). Continue keeps today's behaviour, `setCurrentPersona` then reload, with `loading` on the clicked button and the others disabled meanwhile.
- The square tiles, the "+" tile and `CreatePersona.tsx` go.

## 4. Sidebar persona switcher (`AppSidebarFooter`)

The trigger stays as it is. The menu becomes:
- An overline label **"Switch persona"**, then **every** persona (current included) as avatar + name over `@slug`; the current one is highlighted with a check and does nothing on click.
- A separator, **"Manage personas"** (gear icon, `/persona-manager`), **"Log out"** (LogOut icon).

## 5. Onboarding Personas step

Its local `PersonaRow` is replaced by the shared one (Manage action unchanged), so the step picks up the accent edge and tags. The dashed "Add another persona" card stays.

## Removed

`pages/select-persona/CreatePersona.tsx`, and `Form.persona` plus its field list if nothing else uses them.

## Open questions

1. **New persona** uses the onboarding wizard on both screens (proposed), instead of the old single-form dialog. Alternative: keep the old dialog until WWW-103.
2. **Which Continue is primary** on the selection screen: proposed the default persona (the frame shows it on "Mo sport", the default). Alternative: the last persona used, which needs it remembered (not stored today).
3. **Rows in the persona's palette** (accent edge, avatar, Continue colour), proposed, as the frames show. The page itself keeps the viewer's palette.

## Check

`pnpm build`, `pnpm lint`; Playwright at 1440 / 834 / 390 on `/persona-manager`, the switcher menu and the selection screen (reached by logging in; the user logs in when asked).
