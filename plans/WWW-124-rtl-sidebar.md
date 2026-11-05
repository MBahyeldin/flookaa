# WWW-124 — Sidebar stays on the left in Arabic (RTL)

In Arabic the page is `<html dir="rtl">`, but the app sidebar still renders on the left. Frontend only; regression from WWW-90.

## Cause

`components/ui/sidebar.tsx` and the shell around it hard-code the left side:

- Desktop/tablet: the fixed `sidebar-container` is `left-0 border-r`. The in-flow `sidebar-gap` follows `dir` and moves right, so the panel covers the content's start and an empty strip sits on the right.
- Mobile: `SheetContent side="left"` and `useSidebarSwipe({ side: "left" })`.
- Pop-ups that open beside the rail point right: the menu button tooltips (`side="right"`), the notification popover (`app-sidebar/index.tsx`) and the collapsed account menu (`AppSidebarFooter.tsx`). Once the sidebar is on the right they'd open over it.

## Fix

- `@/i18n`: export `direction()` (`DIR[currentLanguage()]`). `App` already remounts on a language change, so reading it at render is enough; nothing listens.
- `ui/sidebar.tsx`:
  - Container: `left-0 border-r` → `start-0 border-e`, so CSS follows `dir` with no JS.
  - Mobile sheet and swipe: `side` is `"right"` in RTL, else `"left"`. The swipe hook already supports `"right"`.
  - Tooltips: open toward the content, `"left"` in RTL, else `"right"`.
- `app-sidebar/index.tsx` (notification popover) and `AppSidebarFooter.tsx` (collapsed account menu): same inward side.
- One small helper next to `direction()` would only serve these three files, so each computes `direction() === "rtl"` inline.

## Check

With Playwright, in English and Arabic: desktop expanded and collapsed (tooltips, notifications, account menu), tablet rail, and mobile sheet (opens from the right in Arabic, swipe from the right edge, closes on swipe back). `pnpm build` and `pnpm lint`.

## Not changing

Other sheets (`ManageSheet`, `MembersSheetFrame`, …) and the rest of the app's left/right classes; a broader RTL pass is its own ticket.
