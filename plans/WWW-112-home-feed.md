# WWW-112 — Home feed: backend query and page

Thirteenth ticket of epic WWW-86, on top of WWW-83 (post preview, `Post` Spine). Full stack: a GraphQL feed query, a `/control` owner for its realtime, and the logged-in `/` page, which renders nothing today.

Design: "Flookaa v2", Feed `21:2` (Desktop) / `21:897` (Tablet) / `21:1402` (Mobile), Feed empty `21:398` / `21:1557`, `Post` set `36:748` (Spine). Pulled read-only on 2026-10-23.

## Decisions (2026-10-23)

- Scrolling loads the next page automatically (no "Load more" button).
- Your own new posts count in the "n new posts" pill.
- Like and comment counts update live in the feed.
- The proxy keeps subscriptions per subscription id (below); revoking on demand, dead-connection cleanup and reconnect go to their own realtime Bug ticket.

## What the feed holds

The current persona's posts from every channel it is an **active member of** or **follows**, newest first. A channel counts only while the persona may read it, by the same rules as `access.CanRead` plus the age rule: not deleted, `persona_meets_min_age`, and public or the persona is an active member (a follow of a private channel the persona isn't a member of gives nothing). Pending memberships give nothing. Deleted posts (`deletedat`) never show. Comments and replies aren't feed items.

## Backend

### SQL: `ListFeedChannels` (`queries/channel.sql`)

One query per request, for the persona: `id`, `name`, `channel_theme(c.theme, c.id)` and `can_moderate` (owner, live `moderator`/`Administrator` channel role, or global Administrator, as `GetChannelAccess`), for the channels above. Membership filters on `left_at IS NULL AND status = 'active'`, follows on `unfollowed_at IS NULL`. Then `make generate-models`.

### GraphQL (`schema.graphqls`)

```graphql
type FeedChannel {
  id: Int64!
  name: String!
  theme: Theme!
  canModerate: Boolean!
}

type FeedPage {
  posts: [Post!]!
  channels: [FeedChannel!]!   # the channels of this page's posts
  nextCursor: String          # null on the last page
}

# Query
getFeed(after: String, limit: Int): FeedPage!
```

### Resolver `GetFeed`

1. Persona from context (the `/query` route is already persona tier). `ListFeedChannels`; none → empty page.
2. Mongo: `type: POST`, `owner.type: CHANNEL`, `owner.id $in` the channel ids, `deletedat: nil`, sorted `createdat -1, id -1`, `limit + 1` rows to know whether a next page exists. The existing `owner.id, owner.type, type, createdat` index serves it (an `$in` sort-merge), so no new index.
3. **Cursor** `"<createdat unix ms>_<id>"` from the last post returned, like notifications (milliseconds: Mongo dates have no finer precision). `after` adds `createdat < t OR (createdat = t AND id < id)`. A malformed cursor is an error. `limit` defaults to 10, capped at 30.
4. Per page: counters through `resolvePostMetaCached` (as `getPosts`), "liked by me" through `likedTargets` (one query), and authors through one `ResolvePersonasForViewer` call for all distinct authors. Anonymous names stay **per channel** (`access.AnonymousName(author, post's channel)`), so `resolvePersonas` is split: visibility resolved once for the page, the anonymous name filled per post. Today's `getPosts` keeps its behaviour.
5. `channels` = the `FeedChannel` rows of the page's posts.

No new Mongo fields, no migration.

### Realtime: `/control` owner `FEED`

`POST /control` with `{owner: "FEED"}` runs `ListFeedChannels` and answers, non-durable, for each channel: `STREAM_CONTENT_EVENTS.CHANNEL.<id>.post.*`, `….like.*` and `….comment.*` (built with `shared/pkg/subject`). Non-durable means plain NATS subscriptions in the proxy: live only, no replay, cheap per subject. Membership and channel-info events aren't included. The frontend `WebSocketService` gets `subscribeToFeedEvents()`, a wrapper like `subscribeToPersonaEvents`. The whole feed is one subscription id; leaving the feed drops all its channels together.

The subject list is fixed when the page subscribes. Joining or leaving a channel elsewhere takes effect the next time the feed mounts (navigating back to Home does it). Events carry ids only and every fetch re-checks access, as on the channel page.

### Proxy: subscriptions per subscription id (`nats/src/go_bridge.rs`, `ws.rs`)

Today each socket keeps `subject → task`, and `UNSUBSCRIBE` drops the subjects Go lists when it recomputes them. Recomputing is wrong when the state changed while the view was open (the feed after a join or leave; already the community page's managers-only `join_request.*` after losing the role): those subjects stay live until the tab closes. And two views asking for the same subject string share one task, so the second gets no frames and the first's unsubscribe cuts off the other.

Change: each socket keeps `subscription id → [(subject, task)]`, the id being the uuid the browser already sends with every `SUBSCRIBE`/`UNSUBSCRIBE`.

- `SUBSCRIBE id`: unchanged on the Go side (access check, subject list); the proxy files the tasks under `id`. Duplicates are skipped only within the same id.
- `UNSUBSCRIBE id`: the proxy stops every task under `id` and doesn't ask Go (added in review, 2026-10-25: Go's answer was no longer used). `/control` accepts only `SUBSCRIBE`; the handlers' unsubscribe branches are removed.
- A Go answer with `action: "unsubscribe"` still drops the subjects it lists, under every id of the socket, so a later ticket can use it (WWW-120 adds dropping without a request).
- Views stay independent: unsubscribing channel 6's page never touches channel 7, the feed or the default subscription.
- Socket close is unchanged: the shutdown signal stops every task.

Out of scope, for a separate realtime Bug ticket: Go dropping a persona's subjects on demand (kicks), closing dead connections that never send a close (the proxy ignores `HEARTBEAT`), and reconnecting in the browser.

## Frontend

### Page

`/` for a logged-in persona renders a new `pages/(dashboard)/feed` (today `DashboardPage` is an empty `Outlet` there). Same route, existing hooks; the page is new because there's nothing to restyle.

- **Header**: "Your feed" (`h1`), "New posts from the channels you're in." (muted).
- **List**: `Post version="spine"` for each post, in a `flex flex-col gap-6` column filling the content area (capped like Figma, ~1040 px). Each card carries its channel's palette (`data-theme` from `FeedChannel.theme`) and the channel pill in its byline. Card and "Read the whole post" open `/channels/<id>/posts/<postId>`; the channel pill links to the channel.
- **Paging**: the next page loads when a sentinel near the end scrolls into view (IntersectionObserver), with `SkeletonList variant="post"` while loading. A failed next page shows an inline "Couldn't load more posts" with Retry, not an empty list.
- **States**: first load `SkeletonList variant="post"`; error `ErrorState onRetry`; empty `EmptyState` (Compass icon, "Your feed is quiet", "Join a few channels and their posts will show up here.", button "Discover channels" → `/channels` until WWW-84 builds Discover).

### Shared pieces

- `GetFeed.graphql` + `pnpm codegen`.
- `AppStore`: the feed uses the page-scoped store with owner `{type: "FEED", id: personaId}` (the owner type widens to allow it), so the existing `removePost`, like and comment handlers work unchanged. The composer and comment components read `contentOwner(owner)`, which is null on the feed.
- The byline's channel pill becomes a link to the channel.
- `useLikePost` sends `post.owner` instead of the store's page owner. Same value on the channel page, and correct in the feed, where posts come from many channels.
- `PostMenu` takes an optional `canModerate` prop (the feed passes `FeedChannel.canModerate`); without it, it reads the store as today.

### Realtime

`subscribeToFeedEvents` on mount, unsubscribe on leave:

- `post.create`: the id joins a pending list, and a **"n new posts" pill** appears, sticky at the top of the list (small `Button`, `rounded-full`, `shadow-sm`, as a floating pill). The list never jumps. Clicking it fetches the first page again, merges it, scrolls to the top and plays the entrance animation (`isNew`) on the new posts. Over 30 pending, it reloads the feed from the top instead.
- `post.delete`: removes the post from the list and from the pending count.
- `like.*`, `comment.*`: the counts on loaded posts update through the existing handlers.

Your own posts count too (you may have posted from another tab).

## Departures from Figma

1. "Discover channels" goes to `/channels` until WWW-84.
2. The "n new posts" pill has no frame (Tag/Button styling, as the ticket says).
3. Loading, error and load-more states have no feed frame; they use the WWW-88 list states.

## Steps

1. `ListFeedChannels` SQL, `make generate-models`.
2. Schema types + `getFeed`, resolver with cursor paging; split `resolvePersonas` so the feed resolves the page in one query.
3. `/control` owner `FEED`; proxy keeps subscriptions per subscription id.
4. Frontend: codegen, `GetFeed` document, `useLikePost` / `PostMenu` / `AppStore` owner changes.
5. Feed page with paging, states and channel palettes; mount at `/`.
6. Realtime: `subscribeToFeedEvents`, the pill, delete, counts.
7. Deploy note: proxy, then backend, then frontend. The old proxy still needs Go's unsubscribe answer, which the new backend refuses; the frontend queries `getFeed` and the `FEED` owner.
