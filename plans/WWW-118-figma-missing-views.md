# WWW-118 — Figma: missing views

Figma only, no code, in "Flookaa v2" (`cB5tjyC1Vpx9aMQsrX0kDY`, Sara's team). Follows WWW-77 (`plans/WWW-77-figma-handoff.md`) and sits beside WWW-96..101, which cover notifications, settings, create forms, manage sheets, admin, saved posts and comment attachments. Every screen at 1440 / 834 / 390 unless noted, with Theme and Breakpoint modes set.

## Goal

Every route and every state the app shows today has a v2 frame, so the implementation tickets (WWW-85, 87, 93, 108, 109, 113, 115, 117) never have to invent UI.

## Decisions

- **One ticket** for all of it (user, 2026-10-22). Work in the order of the sections below and review section by section.
- **Out of scope:** account settings profile (WWW-97), password reset (no backend; nothing is drawn for it), anything WWW-96..101 already lists.
- **Social over magazine** (from the 2026-10-22 discussion): comment threads, the persona card and the composer should feel quick and conversational, with the persona's avatar and name first. Article styling stays on the post body.
- **Sidebar is collapsible on desktop** (user, 2026-10-22). Details in section 5.
- Build only from Components/Patterns instances and bound variables. New pieces become components first (listed per section), then screens use them.

## 1. Auth states — page Public & Onboarding (`3:8`)

Extends Log in (`25:157` / `25:391` / `25:610`) and Sign up (`25:199` / `25:433` / `25:643`):

- Log in: wrong email or password, loading, Google button loading, `?next=` notice ("Log in to follow Quiet Otter").
- Sign up: field errors (email taken, weak password, country/city required), loading.
- **Verify email** (new screen): 6-digit code input, resend with a 60 s countdown, wrong code ("n attempts left"), locked after 5, success.
- **Select persona** (`/select-persona`, new screen): the user's personas as cards, "Create persona" card, the create form inline.

New components: `Code Input` (6 cells, default / error / disabled).

## 2. Comments and nested replies — page Channel & Community (`3:5`)

The backend and UI nest replies with no depth limit (`parentId`, `level + 1`). The design caps the **visual** indent:

- Level 1 = comment, level 2 = reply, indented once with a thread line. Replies deeper than 2 render at level 2 with a "Replying to @name" line, so mobile never runs out of width.
- A thread shows the first 2 replies, then "View n more replies"; collapse returns to that.
- Inline reply box under the comment, "Replying to @name" with a cancel ×.
- Deleting a comment removes its replies with it, as today; no placeholder (user, 2026-10-22).
- States: anonymous author (generated avatar + anonymous name), own comment, liked, menu (author: Delete; moderator: Delete), "Load more comments", empty ("Be the first to comment"), loading skeleton.
- Shown on the Post page (`23:1960` / `23:2166` / `23:2335`) as a variant frame with a real thread.

New components: `Comment` gains `Level` (1/2) and `State` (default/liked) variants; `Reply Box`; `Thread Toggle`.

## 3. Persona surfaces — page Profile & Personas (`3:7`)

- **Persona card** popover (opens on any name or avatar): full (follow button, "View profile", invite), locked ("Request to follow"), anonymous (name only). Desktop popover, mobile bottom sheet.
- **Followers sheet** (`?followers=requests|followers`): Requests tab (approve/reject), Followers tab (remove), empty states.
- **Invitation banner** on the profile: "Amira invited you to follow" with Accept / Decline.
- **Follow link** `/follow/:token`: logged out (log in to continue), locked (request), pending, already visible (redirect target shown as the profile), invalid link.
- **Connected personas** row on the profile.
- **Persona switcher**: the sidebar footer's persona menu (list, current tick, "Manage personas").

New components: `Persona Card`, `Sheet` (desktop side / mobile bottom), `Banner`.

## 4. Other views

- **Channels list** `/channels` and **Communities list** `/communities` (page Feed & Discovery `3:6`): interest filter row, tiles, joined/pending, loading/empty/error. Reuse `Tile` and `Interest Filter`.
- **Full composer** (page Channel & Community): expanded editor with title/kicker, block insert menu (desktop slash menu, mobile sheet), preview tab, posting as persona, validation error.
- **404** (page Public & Onboarding): in-app shell and logged-out versions.
- **Dialogs** (page Components): `Dialog` component; community rules "Agree and join", confirm (leave, delete, remove member) with destructive variant.
- **Blocks gallery** `/blocks` (page Blocks & Posts `32:6`): desktop and mobile only, built from the existing block frames.

## 5. Collapsible sidebar

- `Sidebar` (`11:232`) already has Expanded/Collapsed. Add a collapse toggle to the Expanded variant (icon `panel-left-close`) and an expand toggle to Collapsed (`panel-left-open`); collapsed items show tooltips.
- Desktop (1440) only; tablet stays collapsed, mobile keeps the header + drawer.
- Every desktop app frame shows the toggle. Add Collapsed variant frames for Feed (`21:2`), Channel (`17:2`) and Post (`23:1960`) so the content width at 1440 with the rail is visible.
- WWW-85 implements it; its description gets a line that the state persists per browser.

## Done when

- Every item above has frames at the listed widths, in Deep Tide Light, with content in at least one other palette per section.
- Screenshots show no overlaps or clipped text (same check as WWW-77 QA rev 5).
- New ids are recorded in `plans/WWW-77-figma-handoff.md`, and frame links are added to the Design section of WWW-85, 87, 93, 108, 109, 113, 115 and 117.
- Contrast passes AA in every new state.

## Gotchas

- Check `whoami` is Sara's account before any write.
- Covers crop inside a clipping frame (see the WWW-77 handoff).
- Arabic copy is not needed here; RTL is WWW-95 / WWW-91.
