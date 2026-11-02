# WWW-106 — Frontend: admin interests page to v2

Implements the WWW-100 frames on page `Admin` `148:6` (ids in `plans/WWW-77-figma-handoff.md`, links in WWW-106's Design section) for `/admin/interests`. The admin API and `services/interests` don't change, and neither do the WWW-100 decisions: Retired is one card at the bottom; on mobile, Move up and Move down go into the row's `⋯` menu; the dialog has a live preview chip.

## What exists today

`pages/(dashboard)/admin/interests/index.tsx` (`InterestsAdmin`) and `CatalogueDialog.tsx`. The page is a `max-w-2xl` column with old `Card`/`CardHeader` styling. Rows show a bare emoji and the name, and move buttons are left out at the ends, so the arrows don't line up. The "No group" heading is red, and the action error is a plain red line. The dialog uses `Label`, `Input` and hand-made error `<p>`s, has no helper and no preview, and its Save button reads "Saving…". The admin gate (`NotFound` unless `is_admin`) and the sidebar Admin entry already match Figma.

## Frontend

All changes are in `pages/(dashboard)/admin/interests/`. Nothing new goes into `components/` unless a piece is already shared.

### Page (`index.tsx`)

- **Frame:** one column, `max-w-[720px]`, `px-4 py-8 md:py-12`, the same gutters as `SettingsPage` but without jump links.
- **Header:**
  - `text-overline` "Admin" (uppercase, muted), then `h1` "Interests".
  - Lead: "What people tag personas, channels and communities with, in the order they see it."
  - Add group (`variant="secondary"`) and Add interest (primary, still only once a group exists). From `sm` they sit right of the title block, aligned to its bottom. Below `sm` they sit in a row under the lead.
- **Action failed:** a bordered `destructive` alert under the header (`CircleAlert` icon, "That didn't work. Please try again.", `role="alert"`). It clears when the next action starts.
- **Group card** (border, `rounded-xl`, `bg-card`, no shadow, `p-5`):
  - Header: name (`text-h4`), slug (muted `text-sm`), and `Badge` "n interests". Below `sm`, the slug and badge wrap to a second line, as in the mobile frame.
  - Then `icon-sm` ghost buttons: move up, move down, Edit (`Pencil`), Add interest (`Plus`).
  - An empty group shows "No interests yet" and a ghost `sm` "+ Add interest" button.
- **Interest row** (the `Interest Row` pattern):
  - `Chip kind="interest" emoji` with the name (display only), then the slug in muted text.
  - From `sm`: move up and move down in **fixed slots**. At the ends the button gets `invisible` instead of being left out, so the arrows stay in columns. Then a `⋯` `DropdownMenu` with Edit and Retire.
  - Below `sm`: no move buttons in the row. The `⋯` menu holds Move up and Move down (each only where it applies), Edit and Retire, with icons (`ArrowUp`, `ArrowDown`, `Pencil`, `Archive`).
  - The breakpoint is pure CSS (`hidden sm:flex` on the slots, `sm:hidden` on the menu items), so there's no JS media query.
- **Needs a group** card, only when such rows exist:
  - Title "Needs a group" with a count `Badge`.
  - A `warning` line with `TriangleAlert`: "People don't see these until they're in a group. Edit one to pick its group."
  - The rows have no move buttons, and their menu has Edit and Retire.
- **Retired** card:
  - Title "Retired" with a count `Badge`.
  - Lead: "Not offered for new picks. Personas, channels and communities that have them keep them."
  - Rows: a dimmed chip, then the slug over "in {group}", a `Badge` "Retired" with `Archive`, and a `⋯` menu with Restore (`RotateCcw`).
- **States:**
  - Loading: header, then `SkeletonList count={6}`.
  - Error: `ErrorState` "Couldn't load interests" with retry.
  - Empty: `EmptyState` as today, under the header.
  - Busy: every control is `disabled` while an action runs, as today.
  - Not an admin: `NotFound`, unchanged.

### Dialog (`CatalogueDialog.tsx`)

- **Fields:** each one becomes a `FormField`, which wires up ids, `aria-invalid` and the helper or error, with the same `ERRORS` map and messages.
  - Interest: Emoji (`w-20`, centred) and Name side by side, then Slug with the helper "Used in links, e.g. ?interest={slug or 'technology'}", then Group (`Select`, placeholder "Choose a group").
  - Then "How people see it" over a `Chip` preview of the current emoji and name. It shows once either has a value.
  - Group: Name and Slug (helper "Used in links").
- **Header:** title only ("Add interest" / "Edit interest" / "Add group" / "Edit group"). The description line goes, as in Figma.
- **Footer:**
  - Cancel is `ghost`. Cancel is disabled while saving.
  - The submit button reads "Add interest" or "Add group" when adding and "Save" when editing, and uses `loading` while saving.
- **Mobile:** below `sm`, the content is pinned to the bottom as a sheet: full width, top corners rounded, no centre translate. This is done with `max-sm:` classes on this `DialogContent`, so `ui/dialog` stays as it is. The footer stays one row (Cancel, primary) on mobile too.
- The behaviour stays the same: the slug follows the name until it's edited by hand, there's client validation before the request, and server field errors show inline.

## Not changing

API, services, types, the sidebar entry, the route, and the admin gate. There's no drag reordering.

## Done when

- `pnpm build` and `pnpm lint` are clean.
- Browser-checked at 1440, 834 and 390 with Playwright, logged in as an admin:
  - Add, edit, move, retire and restore an interest. Add, edit and move a group.
  - Each dialog's field errors, the mobile row menu, and the bottom sheet.
- Compared with `148:7`, `150:522`, `151:805`, `152:4242` and `152:4105`.
- Checked in a dark palette too.

## Gotchas

- Hidden move buttons keep their slot (`invisible`). Don't remove them, or the columns shift.
- The `Chip` is display only, without `onClick`, so it renders a `span`, not a focusable button.
- The admin is the only user of this page and there's no realtime: every action reloads the list (as today).
- Admin stays English-only, with no i18n strings yet (WWW-89).
