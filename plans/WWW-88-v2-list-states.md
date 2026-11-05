# WWW-88 — Frontend: loading, empty and error states for every list

Fourth ticket of epic WWW-86, on top of WWW-87's primitives. It adds the Figma Skeleton, Empty State and Error State components, then gives every existing list the same three states. Lists that later tickets add (feed, discover, profile tabs) use them when they land.

Same routes, same hooks and services. Only the state rendering changes, plus the few spots where a failure is swallowed today and looks like an empty list.

Design: "Flookaa v2", Components `Skeleton` `12:168`, `Skeleton/Post` `12:169`, `Empty State` `12:178`, `Error State` `12:192`. In context: Feed empty `21:398`, Channels · Loading `84:3833`, · Empty filter `84:4023`, · Error `84:4176`, Comment states `72:9983`. Specs pulled read-only on 2026-10-22.

## Components

| Figma | Code | Spec |
|---|---|---|
| Skeleton | `ui/skeleton.tsx` restyled | `bg-muted rounded-sm animate-pulse` (today `bg-accent rounded-md`). Callers set size. |
| Skeleton/Post | new `SkeletonPost` in `ui/skeleton.tsx` | `bg-card border rounded-lg p-5`, gap 3. Author row: 32 circle, then lines 10px high at 120 and 72 wide (gap 1.5). Three body lines 12px high at 100%, 94% and 56%. Also the tile skeleton, as on Channels · Loading. |
| (from Comment states) | new `SkeletonRow` in `ui/skeleton.tsx` | No card: 32 circle, then three lines (name 10px at 100px, text 12px at `w-3/4`, meta 10px at 56px). For member, request, notification and comment rows. |
| Empty State | new `ui/empty-state.tsx` | `bg-surface-sunken rounded-lg px-8 py-10`, centred column, gap 3. Icon wrap 48 circle `bg-card border`, lucide icon 22 `text-primary`. Title `text-h4` medium `text-foreground`; body 14 `text-muted-foreground`, max-w 296px. Optional `action` (a node, normally one `Button`). Props: `icon`, `title`, `body?`, `action?`, `className`. |
| Error State | new `ui/error-state.tsx` | Same box. Icon `CircleAlert` `text-destructive`. Title from the caller ("Couldn't load channels"), body defaults to "Check your connection and try again.", `onRetry` renders an outline `Button` "Try again" with `loading` while retrying. `role="alert"`. |
| — | `compact` prop on both | For sheets, dialogs and the bell popover, which Figma only shows on pages: no fill, `py-6`, icon wrap 40. |

Loading is announced: the skeleton group gets `role="status"` and an `sr-only` "Loading…".

## Decisions

- **Skeletons on first load only.** "Load more" keeps its button with `loading`; the channel page's "Load More Posts" appends two `SkeletonPost` while fetching, as Figma's channel frame shows.
- **A failure is never shown as empty.** Where a service swallows the error today, the page learns about it:
  - `getChannels` returns `null` on failure; `/channels` and the community page's channel list treat `null` as an error (today it reads as "No channels yet").
  - `useCustomInfiniteQuery` gains `error` (from the lazy query's result, cleared on the next try), so comments can show an Error State.
  - Notifications: a failed first page shows the Error State; a failed later page keeps the list and toasts "Couldn't load more".
  - `NotificationStore` gains `recentFailed`, so the bell popover stops showing "Loading…" forever after a failed fetch.
- **One action, only when it exists**: unbuilt or non-applicable actions aren't rendered. No action where the way forward is already on screen (comments input, post composer).
- **Filtered empty lists** say so and offer "Show all" (clears `?interest=`). Figma's "No channels for Photography yet" needs the interest's name, which the filter has but the page doesn't; the copy stays "No channels with this interest yet".
- **`SectionLoader` stays for forms** (settings, persona settings, persona wizard, About you, Interests step). They're not lists. The onboarding Communities and Channels steps and admin interests are lists and move to skeletons. `AppLoader` (app boot) is unchanged.
- **Page-level loading of the channel and community pages** (their headers) is left to WWW-82 and WWW-94, which rewrite those pages. This ticket only touches their lists.
- **The persona lists** (`/persona-manager`, `/select-persona`) come from the user store, which is loaded before these pages render, and a user always has a default persona. Their empty text becomes an Empty State; there is no loading or error state to add.

## Lists

| List | Loading | Empty (icon · title · body · action) | Error |
|---|---|---|---|
| `/channels` | 6 `SkeletonPost` in the grid | `Hash` · "No channels yet" · "Start the first one." · Create channel. Filtered: "No channels with this interest yet" · "Try another interest, or start the first one." · Show all | "Couldn't load channels", retry |
| `/communities` | 6 `SkeletonPost` | `Boxes` · "No communities yet" · "Start the first one." · Create community. Filtered as channels | "Couldn't load communities", retry |
| Community page: channels | 3 `SkeletonPost` | `Hash` · "No channels in this community yet" · Create channel (managers) or Suggest a channel (others who moderate one), as the page offers today | "Couldn't load channels", retry |
| Channel page: posts | (comes with the channel) | `MessageSquare` · "No posts yet" · "Be the first to post in {name}." | — (channel error page unchanged) |
| Channel page: load more | 2 `SkeletonPost` | — | toast, button stays |
| Comments (post) | 3 `SkeletonRow` | `MessageCircle` · "No comments yet" · "Start the conversation. Your comment shows as the persona you're using." | `RefreshCw` · "Comments didn't load", retry |
| `/notifications` | 5 `SkeletonRow` | `Bell` · "You're all caught up" · "Follows, requests and replies show up here." | "Couldn't load notifications", retry |
| Bell popover | 3 `SkeletonRow` | compact, `Bell` · "No notifications yet" | compact, retry |
| Channel Manage sheet: requests / members | 3 `SkeletonRow` | compact · "No pending requests" / "No other members yet" | compact, retry (replaces today's text + button) |
| Community Members sheet: members / requests / channel requests | 3 `SkeletonRow` | compact · "No pending requests" / "No channel requests" | compact, retry |
| Followers sheet: requests / followers | 3 `SkeletonRow` | compact · "No pending requests" / "No followers yet" | compact, retry |
| Suggest a channel dialog | 3 `SkeletonRow` | compact `Hash` · "You don't moderate any channels yet" · Create channel | compact, retry |
| Onboarding Communities / Channels steps | 4 `SkeletonPost` | `Boxes` / `Hash` · "No suggestions yet" · "Nothing matches your interests yet. You can skip this step." | retry (today "Please reload") |
| Admin interests | 6 `SkeletonRow` | "No interests yet" · Add group | retry |
| `/persona-manager`, `/select-persona` | — | `UserRound` · "No personas yet" · Create persona (opens the existing dialog) | — |

The member, request and follower lists that are in sheets use the exact wording the sheets have today where it already exists.

## Steps

1. `ui/skeleton.tsx`: restyle, add `SkeletonPost` and `SkeletonRow`. Check the 9 existing `<Skeleton>` callers still read right on `bg-muted`.
2. New `ui/empty-state.tsx`, `ui/error-state.tsx` (with `compact`).
3. Plumbing: `useCustomInfiniteQuery` `error`; `NotificationStore.recentFailed`; channels pages handle `getChannels` → `null`.
4. Apply to the lists in the table, in this order: channels, communities, community page channels, channel posts + load more, comments, notifications page + bell, the three sheets, suggest dialog, onboarding steps, admin interests, persona lists.
5. `/dev/themes`: a states row (skeleton, post skeleton, row skeleton, empty, error, compact) so they're checked in every palette.
6. CLAUDE.md, Frontend conventions: one line: lists use `Skeleton*` / `EmptyState` / `ErrorState`, and a failure is never rendered as empty.

## Verification

- `pnpm build`, `pnpm lint`; `npx tsc -b` stays at its 30 pre-existing errors.
- `grep` finds no "Loading channels...", "Loading communities...", "Loading…" text left in the touched lists, and no `SectionLoader` in onboarding Communities/Channels or admin interests.
- `/dev/themes`, all 6 palettes, light and dark: the states row next to Figma `12:168`/`12:169`/`12:178`/`12:192`; icon on `card` and body on `surface-sunken` pass AA.
- On the dev server (logged-in backend, internal-build): each list's loading (network throttled), empty (a filter with no match, a new persona's notifications, a post with no comments) and error (backend stopped, then Try again recovers).

## Out of scope

- Channel and community page headers and their loading (WWW-82, WWW-94).
- Feed, discover and profile tab lists (WWW-112, WWW-84, WWW-113) — they use these components when built.
- Nested reply loading in comment threads (`Thread Toggle`, comment threads ticket).
- Interest names in the filtered empty title.

## Implementation notes

- **Components:** `ui/skeleton.tsx` has `Skeleton`, `SkeletonPost`, `SkeletonRow` and `SkeletonList` (`count`, `variant`, one `role="status"` for the group). `ui/empty-state.tsx` holds the shared box; `ui/error-state.tsx` shows a spinner on Try again while `onRetry` runs.
- **Failures that showed as empty or hung, now fixed:**
  - `/channels` and the community page's channel list. A failed refresh on the community page keeps the list already shown.
  - Comments: `useCustomInfiniteQuery` catches both a rejected and an errored lazy query, and keeps the offset so the retry asks for the same page. Nested replies (`comment-section/item.tsx`) use the same hook; a failure there now does nothing visible instead of an unhandled rejection (nested reply states are out of scope).
  - "Load More Posts" no longer advances the offset on a failed page (it used to skip ten posts); it toasts.
  - Community join requests and channel requests no longer spin forever on a failed load.
  - The onboarding Communities and Channels steps can be retried; before, an error left the step with no footer.
  - The bell popover, through `NotificationStore.recentFailed`.
  - Notifications page: a failed first load shows the Error State; a failed later page or realtime reload keeps the list and toasts on "Load more".
- **Sheets** (Manage channel, Followers) start in loading, so their empty tabs no longer flash before the first fetch.
- **Deviations from the table:**
  - The Manage channel sheet's Members tab gets no empty state, because the owner is always listed.
  - Suggest a channel has no error state: the dialog opens only after the moderated list has loaded, and a failed refresh keeps that list.
  - `/persona-manager`'s empty state has no action, because the header already has Create Persona. `/select-persona` has the Add Persona tile.
  - The admin catalogue's per-group "No interests yet" stays a line inside the group card.
- **Checks:** `pnpm lint` and `pnpm build` pass. `npx tsc -b` has 30 errors, all pre-existing. `grep` finds `SectionLoader` and "Please reload" only in the forms and the community page header, as planned.
- **Not checked:** the browser. Playwright was locked by another session, so `/dev/themes` and the live lists still need a look. Check them in all 6 palettes, light and dark, and on internal-build with the backend stopped and throttled.
