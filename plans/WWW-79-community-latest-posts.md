# WWW-79 — Community page: "Latest from its channels" band

Task under epic WWW-86, deferred from WWW-77. Full stack, on top of WWW-94 (community page) and WWW-112 (feed query). Release Beedrill-v1015.

A band on the community page showing the newest posts from the community's channels that the viewer may read, as `Post` previews, each in its channel's palette.

## Step 1: Figma (first, needs the user's OK before any code)

Add the band to Community [Desktop `20:1038`](https://www.figma.com/design/cB5tjyC1Vpx9aMQsrX0kDY/Flookaa-v2?node-id=20-1038) · [Tablet `20:1517`](https://www.figma.com/design/cB5tjyC1Vpx9aMQsrX0kDY/Flookaa-v2?node-id=20-1517) · [Mobile `20:1903`](https://www.figma.com/design/cB5tjyC1Vpx9aMQsrX0kDY/Flookaa-v2?node-id=20-1903), with a `Section Header` (`15:115`) instance (overline "Latest", title "Latest from its channels") and `Post` set (`36:748`, Spine) instances, plus a `SectionNav` tab "Latest". Record the new node ids in `plans/WWW-77-figma-handoff.md`. Screenshots go to the user; code starts after their OK.

## Where it sits

Between Channels and About: `SECTIONS = ["channels", "latest", "about", "people"]`, jump link `#latest`. Channels stays first because it's what the community is; the posts come straight after.

## Who sees it

- The same gate as the channel list: `CanSeeInside` (every persona on a public community; members and managers on a private one). Otherwise the section isn't rendered and the query answers not found, so a private community's channel set doesn't leak through its posts.
- Inside, only channels that are in the community (`status = 'active' AND removed_at IS NULL`), not deleted, `persona_meets_min_age`, and readable by the viewer (public, or the viewer is an active member). Posts `deletedat: nil`. Same as the feed's rules, scoped to one community.
- A too-young viewer never gets this far (`LoadCommunity` answers not found).

## Backend

### SQL: `ListCommunityFeedChannels` (`queries/channel.sql`)

Same columns as `ListFeedChannels` (`id`, `name`, `channel_theme`, `thumbnail`, `can_moderate`), filtered by `community_channels` (`community_id`, live active row) and the read rule above instead of the persona's memberships/follows. `make generate-models`.

### GraphQL

```graphql
# Query
getCommunityFeed(communityId: Int64!, after: String, limit: Int): FeedPage!
```

Resolver: `access.LoadCommunity` + `CanSeeInside` (not found otherwise), `ListCommunityFeedChannels`, then the existing `channelPostsPage` (cursor, limits, authors, anonymous names per channel, likes). No Mongo change, no migration.

### Realtime: `/control` owner `COMMUNITY_FEED`

Payload `{owner: "COMMUNITY_FEED", owner_id}`, non-durable, the same `post`/`like`/`comment` subjects as `FEED` for those channels, after the same gate. Fixed when the band mounts; the page already refetches on `channels.update`, and the band reloads then too, so an added or removed channel takes effect.

## Frontend

- `ListOwner` gains `"COMMUNITY_FEED"` (id = community id); `WebSocketService.subscribeToCommunityFeedEvents(id)`.
- `graphql/communityFeed.graphql` + `pnpm codegen`.
- `pages/(dashboard)/communities/[slug]/CommunityLatest.tsx`: `useChannelPostsPager` with the new owner; `Post version="spine"`, each in its channel's `data-theme`, `onOpen` → the post page; first page of 6, "Show more" button for the next (not infinite scroll: About and People sit below it); "n new posts" pill as on the feed. `SkeletonList` on first load, `ErrorState` on failure, `EmptyState` ("No posts yet") when the channels have none. Hidden entirely when the viewer can't see inside.
- i18n: `communities` keys in `en` and `ar` (title, overline, empty, show more).

## Decisions (2026-11-03)

1. **Paging inside the band**: first 6, then a "Show more" button.
2. **Placement**: right after Channels.

## Checks

`go build ./...` and `go vet` in `shared/` and `backend/`; `pnpm lint`, `tsc -b`, `pnpm build`. Browser check with Playwright on a public and a private community (as member and non-member), 1440/834/390, en and ar.
