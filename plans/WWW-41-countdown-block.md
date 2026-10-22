# WWW-41 — Countdown block

Branch `WWW-41-countdown-block`, from `release-caterpie-v1010`. Epic WWW-13
(Portable Text custom blocks). Builds on WWW-24 (registry), WWW-29 (tokens)
and WWW-36 (insert UX).

## Goal

A live countdown to a moment the author picks ("Launch in 3d 04h 12m"),
shown in each reader's own local time, with an optional label and a
finished state once the moment passes. You insert it from the "+" picker or
with `/countdown`. It's computed in the browser only: no server state, no
realtime events. Colours come from theme tokens only.

## Shape (permanent)

```graphql
countdown {
  _type, _key
  endsAt: DateTime!      # the target instant, UTC
  label: String          # optional, one line, e.g. "Launch"
  endedText: String      # optional, one line, shown once it's over
}
```

Input: `CountdownBlockInput { _type, _key, endsAt: DateTime!, label: String, endedText: String }`.

- **The `_type` is `countdown`.**
- **`endsAt` is an instant, not a wall-clock time.** It uses the existing
  `DateTime` scalar (`graphql.Time`), stored in Mongo as a BSON date and in
  `rawContent` as RFC 3339 UTC. Every reader sees the same moment in their
  own zone; the author's zone isn't stored.
- **`label` and `endedText`** are optional, at most 120 UTF-16 units, no line
  breaks, checked by `checkTitle` with the field name in the error.
  `endedText` defaults to "This countdown has ended." when absent.

## Decisions

1. **Validation (Go, mirrored in zod):**
   - A key, the two text checks above, and a non-zero `endsAt`.
   - `endsAt` is between 2000-01-01 and 100 years from now. It **may be in
     the past**: a post edited after its event, or one published a minute
     late, must still save. The form warns (doesn't refuse) when the chosen
     moment has already passed.
   - `label` and `endedText` count toward the 4096-character limit
     (`TextLength` in Go, `portableTextLength` on the frontend).
2. **Ticking.** One shared 1-second interval (a small `useNow()` hook with a
   module-level subscriber set), so ten countdowns on a feed don't make ten
   timers. It stops when no countdown is mounted and pauses while the tab is
   hidden (`visibilitychange`), re-reading the clock on return. A countdown
   that has ended unsubscribes.
3. **Display.**
   - Units: days, hours, minutes, seconds as four boxes with the number on
     top (`tabular-nums`, so digits don't jitter) and the unit below. Days
     only appear when ≥ 1; hours, minutes and seconds are zero-padded.
   - Under it, the target in the reader's locale and zone with
     `Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" })`
     plus the short zone name, e.g. "Friday, 24 October 2026 at 20:00 GMT+3",
     in a `<time dateTime={endsAt}>`.
   - Ended: the boxes are replaced by `endedText`, with the target date still
     shown ("Ended Friday, …").
   - Rounded `border border-border bg-card` box like the spoiler, label row
     with a lucide `TimerIcon` in `text-muted-foreground` and the label
     (`font-semibold`, `dir="auto"`). Numbers in `text-foreground`, unit
     names in `text-muted-foreground`. No free colours, no outer margins.
     Checked on `/dev/themes` in light and dark.
4. **Accessibility.** The ticking boxes are `aria-hidden`; a visually hidden
   sentence ("Ends in 3 days, 4 hours, 12 minutes") is announced through an
   `aria-live="polite"` region that updates **once a minute**, not every
   second, so a screen reader isn't flooded. The switch to the ended state is
   announced once.
5. **First paint.** The value is computed synchronously on mount from
   `Date.now()`, so there's no "0d 00h" flash. A countdown already in the
   past renders straight in the ended state.
6. **Clock skew.** Uses the reader's clock as is. A reader whose clock is off
   sees an off countdown; syncing with the server is out of scope.
7. **Direction.** The label and ended text get `dir="auto"`; the unit row is
   a flex row, so it mirrors in RTL, with the largest unit at the start as in
   LTR reading order. Unit names and the "Ends in" sentence use
   `Intl.NumberFormat` / `Intl.RelativeTimeFormat` where possible, but the
   app's own strings stay English like the rest of the UI.
8. **Form.**
   - Label (text, optional, placeholder "What are we counting down to?").
   - Ends at (new `datetime` field type → native
     `<input type="datetime-local">`, required), in the **author's** local
     time, with a hint showing their zone ("Your time, GMT+3").
   - Ended text (text, optional, placeholder "This countdown has ended.").
   - `toForm` / `fromForm` convert between the stored UTC instant and the
     `datetime-local` string (`YYYY-MM-DDTHH:mm`, no seconds). Editing an
     existing block round-trips to the same minute.
   - `datetime` is added to `FormFieldInterfaceTypes` and rendered in
     `FieldRender` with the existing `Input` component. No date-picker
     library.
9. **In the editor.** It renders through `BlockSurface` with the same `View`
   as the feed, ticking, so the author sees what readers see.
10. **Registry.** Category `layout`, after Spoiler. Title "Countdown",
    description "A live countdown to a date and time.", icon `TimerIcon`.
    `examples`: one a few days ahead (computed from now), one under an hour,
    one ended, and an Arabic label.

## Steps

1. GraphQL (`portableText.graphqls`): `countdown` in `BlockType`,
   `CountdownBlock`, `CountdownBlockInput`, and a `countdown` field on
   `Blocks` and `BlockInput`.
2. Go (`block-objects/countdown.go`): `parseCountdown` and the cases in
   `ParseBlock`, `Key` and `TextLength`.
3. `make generate-models` in `shared/` against the local codegen Postgres,
   then `pnpm codegen` in `front-end/`.
4. Frontend plumbing: the `countdown` case in `normalizeBlocks` /
   `deNormalizeBlocks`, and `portableTextLength`.
5. `datetime` field type in `types/FormFields.ts` and `FieldRender.tsx`.
6. `hooks/useNow.ts` (shared ticker), then
   `components/portable-text/blocks/countdown.tsx`: schema, fields,
   `toForm` / `fromForm`, `View`, examples, added to `blocks`.

## Acceptance criteria

- "+" and `/countdown` both offer Countdown. Insert puts it in the post, and
  Edit reopens the form with the same label, ended text and minute.
- A countdown ticks every second in Write, Preview and the feed, with no
  jitter and no "0" flash on load, and shows the target in the reader's
  locale and zone. Two readers in different zones see the same remaining
  time and different wall-clock dates.
- When the moment passes while the page is open, it switches to the ended
  state without a reload; an already-past one loads ended.
- Many countdowns on one page share one timer; none tick while the tab is
  hidden, and they're right again on return.
- A screen reader hears the remaining time at most once a minute, and the
  end once.
- Preview flags, and the server refuses: a missing or unparseable `endsAt`,
  one before 2000 or more than 100 years ahead, and a label or ended text
  over 120 characters or with a line break. A past `endsAt` saves, with a
  warning in the form.
- Label and ended text count toward the 4096 counter, and the server
  enforces the same total.
- The block restyles under every palette on `/dev/themes` and reads in light
  and dark mode. An Arabic label reads right to left.
- The form works in the mobile sheet (native date-time picker) and from the
  keyboard.
- Existing posts render unchanged.
- `go build ./...` passes in `shared/` and `backend/`, and `pnpm build` and
  `pnpm lint` pass. The repo has no test runner.
- Deploy the backend before the frontend.

## Out of scope

- Count-up timers, recurring events, or a time zone chosen by the author.
- Notifications or realtime events when a countdown ends.
- "Add to calendar" links.
- Server-synced time.
