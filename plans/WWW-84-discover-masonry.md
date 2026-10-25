# WWW-84 — Discover: masonry of public posts

Fourteenth ticket of epic WWW-86, on top of WWW-112 (home feed) and WWW-93 (`InterestFilter`). Full stack: a GraphQL query, a `/control` owner for its realtime, and a new `/discover` page with a Discover entry in the sidebar.

Design: "Flookaa v2", Discover `21:490` (Desktop) / `21:1117` (Tablet) / `21:1588` (Mobile), `Masonry Tile` `16:401`, `Interest Filter` `16:497`, Empty State `12:178`, Error State `12:192`. Pulled read-only on 2026-10-25.

## What Discover holds

Posts from **public** channels, newest first, in two modes:

- **For you** (default, no interest picked): channels that share at least one interest with the current persona (`channel_interests` ⋈ `persona_interests`). No ranking, no popularity fallback.
- **An interest chip**: channels tagged with that interest, whether or not the persona has it.

In both modes a channel counts only while it is not deleted and `persona_meets_min_age` holds. Channels where the persona has a live membership row (any status) or a live follow are **left out**: their posts are already in the Home feed, and Discover is for channels you aren't in yet. Deleted posts never show; comments aren't items.

## Backend

### SQL: `ListDiscoverChannels` (`queries/channel.sql`)

`(persona_id, interest_slug nullable)` → `id`, `name`, `channel_theme(c.theme, c.id)`, `thumbnail`, `can_moderate` (same expression as `ListFeedChannels`, so `PostMenu` works on a tile's post page too). Filter: `deleted_at IS NULL`, `visibility = 'public'`, `persona_meets_min_age`, no live `channel_members` row (`left_at IS NULL`, any status), no live `channel_followers` row, and either the interest slug (an unknown or retired-but-unused slug just matches nothing) or a shared persona interest. `ListFeedChannels` gains `thumbnail` too. Then `make generate-models`.

### GraphQL (`schema.graphqls`)

```graphql
type FeedChannel {
  ...
  thumbnail: String!    # new: "" = initials, used by the tile's Logo
}

# Query
getDiscover(interest: String, after: String, limit: Int): FeedPage!
```

Same `FeedPage` shape, cursor format (`"<createdat unix ms>_<id>"`), default 10 / cap 30 as `getFeed`.

### Resolver

`feed.go`'s body after `ListFeedChannels` becomes `channelPostsPage(ctx, personaID, channels, after, limit)`: the Mongo query, cursor, counters, "liked by me" and authors. `GetFeed` and `GetDiscover` each load their channel rows and call it. No new Mongo fields, index or migration. Tiles show no author, but `Post.author` stays resolved, since the post type requires it and it's one batched query.

### Realtime: `/control` owner `DISCOVER`

`Payload` gains `interest` (slug, optional). `{owner: "DISCOVER", interest}` runs `ListDiscoverChannels` and answers, non-durable, `STREAM_CONTENT_EVENTS.CHANNEL.<id>.{post|like|comment}.*` per channel, like `FEED` (shared helper). The page subscribes per mode: changing the chip unsubscribes the old id and subscribes again. The subject list is fixed while the mode is open.

## Frontend

### Route and sidebar

`/discover` → new `pages/(dashboard)/discover`. Sidebar entry "Discover" (`Compass`) after Home, as in Figma. The feed's empty-state "Discover channels" button and the feed's existing link go to `/discover` instead of `/channels`.

### Page

- **Header**: "Discover" (`h1`), "Posts from public channels that share your interests." (muted). With a chip picked: "Posts from public channels about {interest}."
- **Filter**: `InterestFilter` gets an optional `allLabel` prop and `onMineLoaded` (the persona's interest ids, for the no-interests empty state) ("For you" here, "All" stays the default on the list pages). The chip is kept in `?interest=<slug>`, like the channel list.
- **Masonry**: 4 columns from `lg`, 2 from `sm`, 1 below, `gap-4`. Posts are dealt into columns in order, each to the currently shortest one (heights measured with a `ResizeObserver`), so reading order stays roughly newest first and appending a page never moves tiles already placed. A column-count change re-deals everything.
- **Paging**: infinite scroll with a sentinel, as the feed; "Couldn't load more" with retry at the bottom on failure. The feed page's paging, realtime and pill logic moves into `hooks/useChannelPostsPager`, used by both pages (the feed's behaviour is unchanged).
- **Live**: like/comment counts update in place (`AppStore` owner `{type: "DISCOVER"}`, same handlers as the feed). New posts collect behind the "n new posts" pill; clicking it reloads the first page and scrolls to the top (masonry can't insert at the top without moving everything).
- **States**: `SkeletonList` while loading (tile-shaped skeletons in the columns); `ErrorState` with retry; empty:
  - For you, persona has no interests → "Pick your interests" with one action to `/persona-manager/<id>` Interests.
  - For you, nothing matches → "Nothing new yet", action "Browse channels" → `/channels`.
  - Interest picked, nothing matches → "No public posts about {interest} yet", action "Show For you".

### `components/masonry-tile`

`MasonryTile({post, channel})`, a card (`bg-card`, border, `rounded-xl`, no shadow) in the channel's `data-theme`, the whole card a link to `/channels/<id>/posts/<postId>`:

- **Image post** (the first block of the content is an `image`, or a `gallery` with an image): the image full-width on top (`responsiveImage`, natural aspect ratio, capped at 4:5), then the channel row, then the first line of text (if any), then reactions.
- **Text post**: a 4px top accent edge in the channel's `primary`, channel row, the first line bold (`text-h4`, max 2 lines), then the text that follows (the rest of that block and later text blocks) as an excerpt clamped to 4 lines (muted), then reactions.
- "First line" = the first line of the first text block; a post with no text block falls back to the first block's `summary` ("Checklist · 2/4"). Posts have no title (WWW-78 rejected).
- **Channel row**: `Logo` (thumbnail or initials, `sm`) + channel name.
- **Reactions**: heart + count and comment + count, read-only display (no like button on the tile; liking is on the post page). Opens the post page on click.

## Out of scope

- Ranking, popularity, "trending". Communities in Discover.
- Joining from a tile (the post page's channel bar does it).
- Discover for logged-out visitors (WWW-114).

## Decisions (2026-10-25)

1. Channels the persona is already in or follows are left out.
2. A persona with no interests gets an empty state on For you pointing to its interests, no fallback.
3. Tile counts are display-only, as Figma draws them.

## Docs

CLAUDE.md: a "Discover" paragraph next to "Home feed" (query, exclusions, `/control` owner `DISCOVER`), `components/masonry-tile` in Frontend conventions.

## Check

`go build ./...` in the workspace, `cargo` not touched, `pnpm codegen`, `pnpm build`, `pnpm lint`. Browser check on `/discover` once the backend is deployed (three widths, both modes, empty states).

## Review round (2026-10-25): All and several interests

The user asked to pick **All** or **several interests** in every interest filter, folded into this ticket.

- **Discover** has three modes: For you (bare URL, as above), **All** (`?all=1`: every public channel the persona isn't in or following, any interests), and the picked interests (repeated `?interest=`: tagged with **any** of them). `getDiscover(interests: [String!], all: Boolean, after, limit)` and `/control` `DISCOVER` `{interests, all}` replace the single `interest`. `ListDiscoverChannels` takes `all_channels` and `interest_slugs text[]`.
- **`InterestFilter`** is multi-select: `value: string[]`, `onChange(slugs)`, `onSelectedNames(names)`; chips toggle, "All" clears, an optional `forYou` chip comes first (Discover). The sheet stays open while picking and has Clear and Done; the "All interests" button shows a count badge. `useInterestParams` keeps the slugs in repeated `?interest=` params; old single-interest links still work.
- **Channels and Communities lists** (WWW-93's filter): `GET /channels/` and `GET /communities/` take repeated `?interest=` and match any (`GetAllChannels`, `ListCommunities` take `interest_slugs text[]`). Empty states name the picks ("Football, Fitness and 2 more").
