# WWW-100 — Figma: admin interests page

This ticket is Figma only, with no code. The work goes in "Flookaa v2" (`cB5tjyC1Vpx9aMQsrX0kDY`, Sara's team), on a new page "Admin". It follows `plans/WWW-77-figma-handoff.md`, and WWW-106 implements it. Frames are Desktop (1440) and Mobile (390) inside the app shell, in the viewer's palette (Tide), with Theme and Breakpoint modes set on every frame.

## Goal

WWW-106 can rebuild `/admin/interests` without inventing UI. That covers every action the admin endpoints take (`/api/v1/admin/interests`, `/api/v1/admin/interest-groups`), with their errors and their empty, loading and error states.

## What exists today

`pages/(dashboard)/admin/interests` (`InterestsAdmin`), 2xl column, old card styling:

- **Header:** "Interests", one line of help, Add group (outline) and Add interest (primary, only once a group exists).
- **One card per group**, in order:
  - Header: name, slug, move up and down (hidden at the ends), Edit, and `+` to add an interest to that group.
  - Rows: emoji, name, slug, move up and down, and a `⋯` menu with Edit and Retire.
- **"No group: assign one to show them":** active interests from before migration 024 without a group, in destructive red. They don't reach anyone until they get one.
- **"Retired":** every retired interest in one list, dimmed, with its group's name. The menu says Restore.
- **`CatalogueDialog`** for both kinds. Interest: emoji, name, slug (follows the name until edited by hand), and a group select. Group: name and slug. Field errors: `invalid_name`, `name_taken`, `invalid_slug`, `slug_taken`, `invalid_emoji`, `invalid_group`.
- Each action reloads the list, and all controls are disabled while one runs. A failed action shows "That didn't work. Please try again."
- Non-admins get `components/not-found`. The sidebar shows **Admin** (`shield-check`) to admins only, from `auth/info`'s `is_admin`.
- There is no delete for interests or groups, and groups can't be retired.

## Proposal

### Page

Same frame as Settings (WWW-103): a single column (720 px desktop, 16 px gutters on mobile).

- **Header:** an `overline` "Admin", the `h1` "Interests", the help line, and on the right Add group (secondary) and Add interest (primary). On mobile the two buttons move to a row under the help line.
- **One card per group** (`SettingsSection` look: border, no shadow):
  - Header row: group name (`h4`), slug in muted text, a "n interests" `Tag`, then `Icon Button`s: move up, move down, Edit, Add interest. The ends hide their move button.
  - Interest rows: the interest as a `Chip` (`kind=interest`, emoji + name, exactly how people see it), slug in muted text, then move up, move down and a `⋯` `Menu` (Edit, Retire).
  - An empty group says "No interests yet" with an Add interest link button.
- **"Needs a group"** card (only when such rows exist): a `warning` notice line ("People don't see these until they're in a group") over the same rows, whose menu has Edit (to pick the group) and Retire.
- **Retired** (see question 1).

### Add and edit dialogs

A `Dialog` (480 px desktop, a bottom sheet on mobile) built from `Form Field`s:

- **Interest:** Emoji (a narrow field) and Name side by side, Slug with helper "Used in links, e.g. ?interest=technology", Group (`Select`), then a **live preview** `Chip` ("How people see it"). Cancel and Save, Save loading.
- **Group:** Name and Slug.
- One frame per field error, with the messages in use today.

### States (one frame each)

- **Empty:** no groups yet. `Empty State` "No interests yet" / "Add a group first, then its interests." / Add group.
- **Loading:** `SkeletonRow` × 6.
- **Error:** `Error` "Couldn't load interests" with retry.
- **Action failed:** the inline alert under the header.
- **Busy:** the page while an action runs (controls disabled).
- **Menus open:** an interest row's `⋯` menu, and a retired row's.
- **Not an admin:** the shell with `Not Found`, the sidebar without Admin.
- **Sidebar:** the Admin entry selected, in the expanded sidebar, the icon rail and the mobile sheet.
- **Dark:** one Deep Tide Dark frame of the page.

## Open questions

1. **Where do retired interests show?**
   - (a) **One "Retired" card at the bottom**, as today, each row naming its group, with a Retired `Tag` and Restore. I recommend this: retired rows aren't reordered (Move renumbers the active list), and the active groups stay exactly what people see.
   - (b) Inline in their own group, dimmed with a Retired `Tag`. It shows where a restore lands, but mixes what people see with what they don't.
2. **Reordering on mobile.** Two move buttons and a `⋯` per row leave little room for the chip at 390 px.
   - I recommend moving Move up and Move down into the row's `⋯` menu on mobile only. Desktop keeps the buttons in the row.
   - Drag to reorder would need a new interaction pattern, and Move already renumbers through the API. I'd leave dragging out.
3. **Preview chip in the dialog:** I recommend it. The emoji and name are exactly what people pick from, so the admin sees the result before saving. It adds nothing to the API.

## Done when

- The page, both dialogs and every state listed above exist at desktop and mobile. They are built from Components/Patterns instances and bound variables only.
- Screenshots show no overlaps or clipped text, and contrast is AA.
- Ids are in `plans/WWW-77-figma-handoff.md`, and frame links are in WWW-106's Design section.

## Gotchas

- `whoami` must be Sara's account before any write.
- Reuse these instead of making new ones: `Chip` `9:227`, `Section Header` `15:115`, `Form Field` `10:75`, `Icon Button` `9:210`, `Tag` `9:228`, `Menu` `11:262`, `Sidebar` `11:232`, and the WWW-97 `SettingsSection` layout (`119:330`).
- Admin is English-only for now. No RTL frames (WWW-91 / WWW-95).
