# WWW-111 — Comment attachments: image and voice note

Comments can already carry one image or one voice note (`SimpleInput` `{type: TEXT | VOICE | MEDIA, content}`, `components/simple-input`, `comment-section/item.tsx`). This ticket restyles that flow to the WWW-101 design and adds the server checks that are missing.

Design: "Flookaa v2", [Comment Composer](https://www.figma.com/design/cB5tjyC1Vpx9aMQsrX0kDY/Flookaa-v2?node-id=161-916) (11 states), [Comment](https://www.figma.com/design/cB5tjyC1Vpx9aMQsrX0kDY/Flookaa-v2?node-id=70-602) (`Show image` / `Show voice`), [Voice Pill](https://www.figma.com/design/cB5tjyC1Vpx9aMQsrX0kDY/Flookaa-v2?node-id=159-20194), [States board](https://www.figma.com/design/cB5tjyC1Vpx9aMQsrX0kDY/Flookaa-v2?node-id=163-16109). A comment stays exactly one of text, image or voice.

## Backend: `createComment` validates nothing today

`CreateComment` marshals `input.Content` and stores it. Through the API, a comment can be empty, of any length, or point at any URL. An external image is the serious case: it loads in every reader's browser, so its host learns their IP addresses, which works against anonymous personas.

New `parseSimpleInput` in the resolvers, called before the insert. Existing comments aren't rewritten.

| Type | Rule | Error |
|---|---|---|
| `TEXT` | Trimmed, 1 to 2000 characters | `invalid_comment` |
| `MEDIA` | Our s3 base URL + `/files/<key>` | `invalid_comment_attachment` |
| `VOICE` | Our s3 base URL + `/audio/<key>.mp3` | `invalid_comment_attachment` |

- The check compares against the exact s3 origin from `S3_BASE_URL`, not just the path shape. `Resolver` gets the value as a new constructor field, and the rule goes in a small `shared/util` package.
- Only the trimmed text is stored.
- Delete, likes, counters, notifications and realtime don't change. No schema change, so no codegen.

## Frontend: `components/simple-input`

| # | State | Change from today |
|---|---|---|
| 1 | Idle | No Send button, as the design shows |
| 2 | Text typed | Image and mic hide (already so); `maxLength` 2000 |
| 3 | Image uploading | A thumbnail of the picked file with a spinner, instead of a text line |
| 4 | Image ready | A 56 px thumbnail on the row, as the design shows, with a remove `×`, instead of the large preview |
| 5 | Recording | Red dot, "Recording", `0:07 / 1:00`, Stop, on one row; the level meter and countdown row go, and `voiceIndocator.tsx` with them |
| 6 | Near the limit | Timer turns `destructive` (already so) |
| 7 | Voice processing | Spinner and "Preparing your voice note" on the row |
| 8 | Voice ready | `AudioPlayer variant="pill-sm"` (new, the 44 px Voice Pill) with discard |
| 9 | Mic unavailable | Mic hidden, not disabled. After a permission denial, an inline helper note |
| 10 | Upload failed | Inline `destructive` line with Retry, instead of a toast; keeps the file or recording so Retry needs no new pick |
| 11 | Sending | The whole row disabled, Send loading |

The upload and recording logic, the 60-second cap and the re-entrancy guard stay as they are. Replies use the same component at reply size.

**Thread (`comment-section/item.tsx`):**
- Image: `rounded-md`, at most 300 px from `sm`, full width below. Tapping opens the full-screen viewer: `GalleryViewer` gets exported from the gallery block and used with one item.
- Voice: `AudioPlayer variant="pill-sm"`.
- Checked at reply depth 2, for the indent.

**i18n:** new strings and both error codes in `en` and `ar`, with `_female` where the Arabic addresses the reader. **Docs:** `CLAUDE.md` gains the comment rules under Data split.

## Deploy

Backend before frontend. An older client sending an attachment keeps working, because it uploads to the same s3.

## Checks

No automated tests in this repo. `pnpm build`, `pnpm lint`, `go build`, then in the browser, at three widths:

- Every state in the table, including a denied microphone and a failed upload with Retry.
- Send a text, image and voice comment, top-level and as a reply. A second tab receives them live.
- Viewer opens from an image comment and closes back.
- Direct `createComment` calls: empty text, 2001 characters, an external image URL, and a `/files/` path on another host are all refused.
- A comment from before this ticket with an external image still renders.
- Arabic RTL, light and dark.

## Out of scope

- Text with an attachment in one comment.
- The same exact-origin check on logos and covers: see the follow-up ticket.
