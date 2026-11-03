# WWW-101 — Figma: saved posts and comment attachments

This ticket is Figma only, with no code. The work goes in "Flookaa v2" (`cB5tjyC1Vpx9aMQsrX0kDY`, Sara's team) and follows `plans/WWW-77-figma-handoff.md`. WWW-110 (Save) and WWW-111 (comment attachments) implement it. Frames are Desktop (1440), Tablet (834) and Mobile (390), with Theme and Breakpoint modes set on each one. Post frames use the channel's palette, and the Saved page uses the viewer's.

## Goal

WWW-110 and WWW-111 can be built without inventing UI, and every state they need has a frame.

## Decisions (2026-11-03)

- Saved is a top-level sidebar entry, after Discover.
- A comment stays one of text, one image or one voice note. It never mixes them.
- Share is out of scope. It gets its own ticket.
- A post can be saved anywhere it's shown, Discover tiles included. Being able to see a post is enough to save it.

## What exists today

- **Post page** (`/channels/:id/posts/:postId`, `PostArticle`): a flat reactions row with Like, Comments and Share. There is no Save yet, because unbuilt controls are hidden.
- **Cards**: `components/post-card` (Spine/Canvas) shows the `Reactions` pill, and `components/masonry-tile` (Discover) shows display-only counts. Neither has Save.
- **Comments already take one attachment.** `SimpleInput` is `{type: TEXT | VOICE | MEDIA, content}`. `components/simple-input` already has these flows:
  - Image: pick a file, upload it, preview it, remove it.
  - Voice: record (60 s cap, red dot, a timer that turns red near the limit, stop), upload with ffmpeg processing, play it back, discard.
  - While a send runs, the input is disabled. A failure shows a toast.
- `comment-section/item.tsx` shows an image (300 px wide at most) or an `AudioPlayer`. So WWW-111 restyles a flow that already works, with no backend change.
- Figma: the Post page (`23:1960` / `23:2335`) already shows Save and the image/mic buttons in the comment box. Pieces to reuse:
  - `Comment` `16:327`
  - `Block / Voice note` `33:188` and `Block / Image` `33:128`
  - `Toast` `11:288`
  - the `Post` set `36:748`
  - `Empty State` `12:178`
  - `Sidebar` `11:232`
  - the `bookmark` icon `8:248`

## Proposal

### Save

- **Post page** (channel post and wall post): Save sits in the reactions row, as a `bookmark` icon with "Save".
  - The saved state has a filled icon in `primary` and reads "Saved".
  - Frames: unsaved, saved, and saved with the toast "Saved" (its action opens Saved).
- **Cards**: a `bookmark` icon button with the same two states, on:
  - **Spine and Canvas**, at the end of the byline row (feed, channel page, profile wall, community Latest)
  - **Discover's masonry tile**, in its footer next to the counts. It's the tile's only interactive control, so it must not open the post.
- **Saved page** (`/saved`, on Feed & Discovery): the current persona's saved posts, newest saved first, as Spine cards, the same list as the feed.
  - Header: `h1` "Saved", plus one line saying "Only you see what this persona saves."
  - States:
    - Empty: `Empty State` "Nothing saved yet" / "Tap Save on a post to keep it here." There is no action.
    - Loading: `SkeletonPost` × 3.
    - Error.
    - A saved post that is gone or that the persona can no longer read: a slim muted row "This post isn't available anymore" with Remove.
  - Dark: one Deep Tide Dark frame.
- **Sidebar**: a Saved entry (`bookmark`) after Discover, in the expanded sidebar, the icon rail and the mobile sheet.

### Comment attachments (one of text, image or voice)

The composer is restyled to the v2 `Comment` pattern: a bordered `bg-card rounded-lg` row with the 28 px avatar. One frame per state:

1. **Idle:** placeholder, image button, mic button, and Send disabled.
2. **Text typed:** the image and mic buttons hide, and Send is enabled.
3. **Image uploading:** the input gives way to a thumbnail with a spinner overlay. Send is disabled.
4. **Image ready:** a 72 px thumbnail with a remove `×`. Send is enabled.
5. **Recording:** a red dot, "Recording", the timer "0:07 / 1:00", and Stop.
6. **Recording near the limit:** the timer turns `destructive`.
7. **Voice processing:** a spinner with "Preparing your voice note".
8. **Voice ready:** the `pill` `AudioPlayer` with discard (`trash-2`).
9. **Mic unavailable:** the mic button is hidden. After a permission denial, an inline helper note says so.
10. **Upload failed:** an inline `destructive` line, "Couldn't upload. Try again", with Retry, instead of today's toast.
11. **Sending:** the whole row disabled, and Send loading.

In the thread:

- An image comment: a rounded `md` image, at most 300 px on desktop and full width on mobile. Tapping it opens the full-screen viewer from the gallery (`GalleryViewer`).
- A voice comment: the `pill` player.
- Both shown at reply depth 2, to check the indent.

Replies use the same composer at reply size.

## Done when

- Every frame above exists, built from Components/Patterns instances and bound variables only:
  - the Saved page at 3 widths with its states
  - Save states on the post page, Spine/Canvas cards and the masonry tile
  - the composer states and the thread display
  - the Sidebar entry
- Screenshots show no overlaps or clipped text, and contrast is AA in Tide, one other palette and Deep Tide Dark.
- Ids are recorded in `plans/WWW-77-figma-handoff.md`, and frame links are in the Design sections of WWW-110 and WWW-111.

## Out of scope

- Share (the menu, copy link, native share): it gets its own ticket.
- Text with an attachment in one comment.

## Gotchas

- `whoami` must be Sara's account before any write. On a permission error, stop and ask.
- Saves are per persona, never per user. The Saved page never shows another persona's saves, and nothing on a post reveals who saved it, so there are no save counts.
- `Sidebar` gains the entry behind a boolean property, default off (like `Show admin#145:0`), so earlier frames stay unchanged.
- No RTL frames here. The RTL refresh is WWW-95.
