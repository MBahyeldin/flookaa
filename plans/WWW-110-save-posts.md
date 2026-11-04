# WWW-110 — Save posts (bookmarks): backend and UI

A persona saves posts to read later. Saves belong to the persona (`persona_id`), never the user, and nobody else ever learns about them: no counts, no notifications, no events to other personas. Design: WWW-101 (frames linked in the Jira ticket, ids in `plans/WWW-77-figma-handoff.md`).

## Goal

Save and unsave from every place a post is shown, and a `/saved` page listing the current persona's saved posts, newest saved first.

## Backend

### Table (migration 042, with down)

`saved_posts`:
- `persona_id BIGINT NOT NULL REFERENCES personas(id)`
- `post_id VARCHAR(255) NOT NULL` (the Mongo id, like `events.target_id`)
- `saved_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `unsaved_at TIMESTAMPTZ` (soft unsave)
- `PRIMARY KEY (persona_id, post_id)`, so there's one row per pair. Saving again revives the row and moves `saved_at` to now, so it goes back to the top.
- Index `(persona_id, saved_at DESC, post_id DESC) WHERE unsaved_at IS NULL` for the list.

The row stores no owner. Access is always checked against the owner stored on the Mongo document.

Queries:
- `SavePost` (upsert/revive)
- `UnsavePost`
- `GetSavedTargets(persona_id, post_ids)` (like `GetLikedTargets`)
- `ListSavedPosts(persona_id, cursor, limit)`
- `ListReadableChannels(persona_id, ids)`: the `FeedChannel` fields (`id`, `name`, `theme` via `channel_theme`, `thumbnail`, `can_moderate`) for the given channels the persona may read. That means not deleted, `persona_meets_min_age`, and public or active member, the same rule as `ListFeedChannels`.

### GraphQL

```graphql
type PersonalizedMeta { … savedByPersona: Boolean! }   # false on comments

type SavedPost {
  postId: ObjectId!
  savedAt: Time!
  post: Post            # null = deleted, or the persona can no longer read it
}
type SavedPage { items: [SavedPost!]!, channels: [FeedChannel!]!, nextCursor: String }

getSaved(after: String, limit: Int): SavedPage!         # Query
savePost(id: ObjectId!): Boolean!                        # Mutation
unsavePost(id: ObjectId!): Boolean!                      # Mutation
```

- `savedByPersona` sits next to `likedByPersona`. That differs from the ticket's `Post.savedByMe` on purpose, so it matches the existing per-persona meta.
  - It costs one `GetSavedTargets` per page, computed where `likedTargets` is: `channelPostsPage` (feed, Discover, community Latest) and `getPosts` (channel page, wall, post page).
  - `personalizedMeta(liked, saved)` takes both.
- `savePost`:
  - `loadObject`, then it must be a post (comments can't be saved), then `authorizeOwner(..., accessRead)` on the stored owner. Non-readers get `not found`.
  - It's idempotent.
- `unsavePost` checks nothing but the persona, so Remove works on a post that's gone or unreadable. It's idempotent too.
- `getSaved`:
  - Pages saved rows by cursor `"<saved_at µs>_<post_id>"`. `limit` defaults to 10, at most 30.
  - It loads the Mongo docs in one `$in`.
  - A post stays in the list (`post: null`) when it's missing or deleted, or when the persona can't read it:
    - Channel posts: `ListReadableChannels` for the page's channel ids.
    - Wall posts: `visiblePersonas` on the walls' persona ids (`persona_visible_to`).
    - Any other owner type counts as unreadable.
  - Readable posts get meta, authors (`visiblePersonas` plus `anonymousPersona`), liked and `savedByPersona: true`.
  - `channels` holds the page's readable channels, so the Spine card gets its palette and channel pill, and `PostMenu` gets `canModerate`.
  - Rows are never dropped, so a page is always full until the end.

### Realtime (for the persona's own tabs and devices only)

`savePost`/`unsavePost` publish `STREAM_USER_EVENTS.PERSONA.<id>.saved.{create|delete}` with `{post_id}`, built through `shared/pkg/subject`.
- These subjects are added to the persona's own default subscription only, the same place its `notifications.*` subjects come from. No other viewer gets them.
- The notifier's `notifier-user` uses specific filter subjects, so it doesn't consume these.
- There's no `events` row and no notification.

## Frontend

- **`useSavePost(post)`** (next to `useLikePost`): an optimistic toggle on `personalizedMeta.savedByPersona` in `AppStore` / the Apollo cache.
  - Saving shows the "Saved" toast with an action that opens `/saved`. Unsaving shows no toast.
  - A failure reverts and shows an error toast.
- **`components/post-card/SaveButton`**: the Figma `Save Button`. It has two styles:
  - `icon` for cards, an `icon-sm` ghost.
  - `labelled` for the post page: "Save" / "Saved", with the icon filled in `primary` when saved.
  - It has `aria-pressed` and a label.
- **Placement** (Figma `Post` set):
  - Spine: in the header, before `⋯`.
  - Canvas: in the footer actions.
  - Post page (channel and wall): in the reactions row, before Share.
  - Discover's masonry tile: at the end of the footer. It stops propagation, so it never opens the post.
  - All of these follow from the shared components, so the feed, channel page, profile wall and community Latest all get it.
- **WS**: a listener on the default subscription for `saved.*` updates `savedByPersona` on posts in the store, and makes a mounted Saved page refetch.
- **`/saved`** page (`pages/(dashboard)/saved`), in the viewer's palette:
  - Header: `h1` "Saved" and the line "Only you see what this persona saves."
  - The list holds Spine cards with infinite scroll, like the feed. Channel posts open their post page, and wall posts open `/personas/<id>/posts/<post_id>`. Wall posts have no channel pill (the author is the wall's persona).
  - Unavailable items show the `Saved Unavailable Row`, "This post isn't available anymore", with Remove (`unsavePost`, which then drops the row).
  - Unsaving a card here takes it out of the list.
  - States: `SkeletonPost` × 3 while loading, `EmptyState` "Nothing saved yet" / "Tap Save on a post to keep it here." with no action, and `ErrorState` with retry.
  - A persona switch refetches.
- **Sidebar**: a Saved entry (`Bookmark`) after Discover.
- **i18n**: strings in en and ar (`posts`, `common`), with `_female` variants where Arabic addresses the reader.
- `pnpm codegen` after `make generate-models`.

## Order

1. Migration 042 + queries. Apply locally, then `make generate-models`.
2. GraphQL schema, resolvers, publishing, default subscription.
3. `pnpm codegen`, then SaveButton + hook + placements.
4. The `/saved` page, the sidebar entry, i18n.
5. Update CLAUDE.md (a "Saved posts" note under Home feed / Data split).
6. `go build`/`vet`, `tsc -b`, lint, build.
7. Browser check with Playwright MCP. The user logs in when asked. Check saving on the feed, channel, post page, wall and Discover; the Saved page at 1440/834/390, light and dark, en and ar; unsave and Remove.

## Out of scope

- Share.
- Collections or folders of saved posts.
- Saving comments.

## Deploy

Migration 042 and the backend go before the frontend, since the frontend queries `savedByPersona` and `getSaved`.

## Open question

- Realtime across the persona's own tabs and devices (above). The recommendation is yes, per "realtime by default". Dropping it removes the publish, the default-subscription change and the WS listener. Saves in the same tab still update at once either way.
