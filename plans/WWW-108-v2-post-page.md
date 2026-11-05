# WWW-108 — Post page route with article style, comments and Share

Eleventh ticket of epic WWW-86, on top of WWW-82 (channel hero, `Logo`) and WWW-83 (post frames, `Reactions`, `useLikePost`). It replaces `PostDialog` with a real page for one post. Frontend only: no schema, resolver or backend change. One new GraphQL **document** (a slim channel query), so `pnpm codegen` runs, but nothing in `shared/`.

Design: "Flookaa v2", Post page Desktop `23:1960` / Tablet `23:2166` / Mobile `23:2335`, Post Body `16:338`, Comment `16:327`. Thread (WWW-118): Desktop `72:3753` / Tablet `72:4225` / Mobile `72:4619`, States `72:9983`, Comment `70:602`, Reply Box `71:427`, Thread Toggle `71:536`. RTL `27:1805`. Pulled read-only on 2026-10-23.

## Route

- **`/channels/:id/posts/:postId`**, a new page at `pages/(dashboard)/channels/[id]/posts/[postId]/`. Nested under the channel so the URL keeps the scope the access rule uses, and the back target is obvious.
- **Old links redirect.** The channel page, on `?post=<id>`, replaces the URL with the post route (carrying `?comment=`), so old notification links and anything bookmarked keep working. `PostDialog` is deleted.
- **New links**: `describe.ts` `contentHref` builds the post route. On the channel page, "Read the whole post" and the comments button navigate to it.
- `?comment=<id>` is carried but still not acted on, as today (scrolling to it would mean expanding every reply level above it).

## Data

- **Post**: `GetPosts` with `ids: [postId]`, `owner: {CHANNEL, id}`, as `PostDialog` does now. Empty answer or "channel not found" → `components/not-found`. Non-readers and deleted posts are therefore not found, unchanged.
- **Channel bar**: a new document `GetChannelBar` (`getChannel` with `id name thumbnailUrl theme membersCount isPrivate isMember isPending canModerate`), so the page doesn't load the channel's first page of posts the way `GetChannel` does.
- **Store**: the page points `AppStore` at the channel (`setOwner`, `resetPage` on leave), `addPosts([post])`, `setCanModerate`, exactly like the channel page. So likes, comments and deletes reuse the existing store paths.
- **Realtime**: the page subscribes with `subscribeToChannelEvents` + `handleChannelEvents`. Comments, likes and deletes update the page through the store as on the channel page; new posts are ignored. A `post.delete` of this post turns the page into not found. `member`/`join_request` events for the viewer update the bar's Join state (approval, rejection, removal), as on the channel page.

## Layout (one column, 680 wide, centered)

The whole page sits in the channel's `data-theme`, like the channel page. The sidebar keeps the viewer's palette.

1. **Channel bar** (sticky under the mobile header, `top-0` on desktop): `bg-background/95` with a bottom border. Back arrow (mirrors in RTL), `Logo` 28, name (14 medium, links to the channel), facts (12 muted: "1.2k members · Public" / "Private"), and at the end **Join** (`size="sm"`). Join shows only to a non-member: "Join" on a public channel, "Request to join" on a private one (a non-member can't be here on a private channel, but approval/removal events can change state live), "Requested" (outline, cancels) while pending. Same `joinChannel`/`leaveChannel` calls as the channel page. Back goes to the previous entry when there is one in-app, otherwise to `/channels/:id`. Mobile: name only, no facts.
2. **Header**: kicker and title slots (rendered only when the post has them, which needs WWW-78; nothing to render today). Byline: 40 px avatar (`PersonaLink`, `GeneratedAvatarFallback`), name (14 medium), then "Channel · 2 hours ago · 4 min read" (12 muted). The `⋯` menu (Delete for author or moderator) at the end, as on the post card.
3. **Body**: `PostContent` with a new `article` prop (below).
4. **Reactions row**: a flat row between two `border-border` rules, gap 20, 13 medium muted: **Like** ("24 likes", the heart toggles, `useLikePost` with its animation and sound), **Comments** ("8 comments", scrolls to the comments heading), **Share**. Save is not rendered until WWW-110 fills it (unbuilt controls are hidden, not disabled). The pill `Reactions` of the cards stays as it is.
5. **Comments** (below).

### Article style

`PostContent` gets `article?: boolean`. It applies on the post page only; cards and previews are untouched.

- **Long posts** (plain text of all text blocks > 1200 characters): the `article` utility (18/1.75 from `md`, 17 below, 68ch measure, 1em between text blocks). The **first** block, if it is a `normal` paragraph, is the lead: `text-lead font-light text-muted-foreground`. `blockquote`-styled text blocks become pull quotes: `border-s-2 border-primary ps-4 text-primary`, not italic. The Quote card block (WWW-27) keeps its own design.
- **Short posts**: body text (16/1.6) as in the full card today, no lead. Quotes keep their current style.
- **"n min read"**: `ceil(words / 200)`, counted on the client from the text blocks. Shown in the byline for long posts only; on a 3-line post it's noise.
- Blocks keep `rounded-2xl` and the wrapper's spacing; nothing about blocks changes.

### Comments (v2 `Comment` pattern)

`components/comment-section` is rewritten in place on its current hooks (`useCustomInfiniteQuery`, `useGetCommentsLazyQuery`, the store's `commentsByPost`/`commentsByComment`, `useNewlyAdded`, the own-comment scroll and auto-expand). Like, reply, delete, paging and realtime behave as today.

- **Heading** "n comments" (`text-h4`), the post's `commentsCount`.
- **Composer**: a bordered `bg-card rounded-lg` row with the 28 px persona avatar inside and the existing `SimpleInputComponent`. Image and voice attachments are WWW-111; the composer keeps whatever controls `SimpleInputComponent` has today. A **non-member** (public channel, reading only) sees "Join {channel} to comment" with the Join button instead of the composer, because commenting needs membership and today it fails only on send.
- **Comment**: 28 px avatar outside the text (no bubble), name (13 medium) + relative time (12 muted), text (14), then an actions row: heart + count (a toggle; filled `text-primary` when liked, per the `Liked` variant) and **Reply**. Delete moves into a `⋯` menu at the end of the name row ("Delete comment"), shown to the author and channel moderators. Anonymous authors keep the generated avatar and name.
- **Indent stops at level 2.** A reply to a top-level comment is indented 32 px with a 1 px `border-s` rule. Replies deeper than that render at the same indent, with "Replying to {parent's name}" (12 muted) above their text; the parent's name is read from the store (as the viewer sees it, so anonymous stays anonymous).
- **First 2 replies, then the toggle.** A top-level comment with replies fetches its first 2 when it renders (`limit: 2`) and shows them, then the Thread Toggle "View n more replies ⌄" (12 medium `text-primary`), which loads the rest by the existing pages of 10. Deeper levels start collapsed behind "View n replies". This adds at most one small query per top-level comment on a page of 10.
- **Reply box**: opens under the comment it answers: "Replying to {name} ✕" (✕ closes), then the composer row with a send button. Sending closes it.
- **States** (`72:9983`): `EmptyState` "No comments yet" / "Start the conversation. Your comment shows as the persona you're using.", `SkeletonList` of 3 comment rows, `ErrorState` "Comments didn't load" with Try again. "Load more comments" stays a full-width outline button.
- **Deleting a comment removes its replies with it** (decided 2026-10-22). Nothing changes in the backend: replies hang off their parent, so once the parent is gone they're unreachable. Not left as a placeholder.

### Share

- **Share** button: where `navigator.share` exists and the pointer is coarse (phones, tablets), the Web Share sheet with the post's URL and the channel name as title. Otherwise the link goes to the clipboard and a toast says "Link copied". A cancelled share sheet says nothing.
- The URL is the post route on `window.location.origin`. It's only useful to someone who can read the channel; nothing about the post leaks to anyone else (not found for them).
- WWW-101's Share menu design doesn't exist yet. When it lands, the button becomes that menu; this ticket's behaviour is the copy-link item.

## Departures from Figma

1. **No Save** until WWW-110 (hidden, not disabled).
2. **No kicker/title** until WWW-78.
3. **Composer attachments** (image, mic) are WWW-111.
4. **Mobile bar**: facts dropped below `sm` so name and Join fit at 390.

## Steps

1. `GetChannelBar.graphql`, `pnpm codegen`.
2. Route + page: data, store, realtime, not-found, channel bar, header, reactions row with Share.
3. `PostContent` `article` prop: the length check, lead, pull quotes, read time helper.
4. `comment-section` rewrite: heading, composer (and the non-member note), comment row, `⋯` menu, indent cap + "Replying to", first-2 + Thread Toggle, reply box, states.
5. Channel page: `?post=` redirect, cards navigate to the route, `PostDialog` deleted, `Post` `version="full"` removed if nothing else uses it (`/dev/themes` keeps Spine and Canvas). `describe.ts` links to the route.
6. CLAUDE.md: the post route replaces "`?post=` dialog" (Notifications → Frontend, Frontend conventions → post-card `full`), one paragraph on the article style and the comment rules.

## Verification

- `pnpm build` and `pnpm lint` in `front-end/`.
- Browser (needs the dev API) at 1440 and 390, `tide` and one other palette, light and dark, against `23:1960`, `23:2335`, `72:3753`, `72:9983`:
  - A notification link and an old `?post=` link land on the route; the card's "Read the whole post" and comments button open it; back returns to the channel.
  - A 1200+ character post gets the lead, 68ch measure, primary pull quote and "n min read"; a short one doesn't.
  - Like, comment, reply (top-level, level 2, level 3 with "Replying to"), delete (own and as moderator) all work and arrive live in a second browser.
  - A comment with 5 replies shows 2 and "View 3 more replies".
  - Share copies the link on desktop; the share sheet on a mobile viewport where supported.
  - A non-member on a public channel sees "Join … to comment"; joining shows the composer.
  - A deleted post, an unknown id and a private channel the viewer isn't in all show not found; deleting the open post from another tab turns it into not found.
  - Arabic post and comments mirror in RTL.

## Out of scope

- Kicker and title (WWW-78), Save (WWW-110), comment attachments (WWW-111), the Share menu design (WWW-101).
- Scrolling to `?comment=`.
- Post pages for owners other than channels (only channel-owned content is supported).
