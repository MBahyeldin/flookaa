# WWW-44 — Voice note block

Branch `WWW-44-voice-note-block`, from `release-caterpie-v1010`. Epic WWW-13
(Portable Text custom blocks). Builds on WWW-24 (registry), WWW-29 (tokens)
and WWW-36 (insert UX). Reuses the voice-comment pieces that already exist:
the `s3` audio upload (`/api/v1/audio/upload`, ffmpeg → mono mp3, loudness
normalised), `services/uploadAudio.ts`, and `components/audio-player` (the
waveform player voice comments use).

## Goal

A spoken clip inside a post. In the block form you either record with the
microphone or pick an audio file; either way it goes through the `s3` audio
upload, and the post shows the same waveform player as voice comments. You
insert it from the "+" picker or with `/voice`. No server state beyond the
post itself. Colours from theme tokens only.

## Shape (permanent)

```graphql
voiceNote {
  _type, _key
  src: String!        # the s3 mp3 URL
  title: String       # optional one-line label above the player
  duration: Int       # whole seconds, captured when recorded or picked
}
```

Input: `VoiceNoteBlockInput { _type, _key, src: String!, title: String, duration: Int }`.

- **The `_type` is `voiceNote`.**
- `duration` is stored so the player shows the length before the file's
  metadata loads, and so a later list view can show it without fetching
  audio. The player still prefers the real duration once it loads.
- No stored waveform: the player derives it as it does for comments.

## Decisions

1. **Validation (Go, mirrored in zod):**
   - A key; `src` through `safeURL` (http(s) or same-site path), like
     `parseImage`.
   - `title` ≤ 120 UTF-16 units and one line (`checkTitle`).
   - `duration` 1–600 when set.
   - The title doesn't count toward the 4096-character limit (like captions).
2. **Limits.** Recording stops by itself at 5 minutes (comments stay at 60 s).
   Files go through the server's existing rules unchanged: its MIME list
   (webm/ogg opus, mp3, wav, flac, mp4) and its 5 MB input cap. The file
   picker `accept`s those types, and a larger file is refused before upload
   with "Audio files can be up to 5 MB." A picked file longer than 5:00 (when
   the browser can read its length) is refused too, so both paths share one
   cap.
3. **Shared recording helper.** The codec detection in `simple-input`
   (secure-context check, `MediaRecorder` check, webm → ogg → mp4 candidates)
   moves to `lib/audioRecording.ts` as one function, used by both the comment
   box and the new input. Comment recording behaves exactly as before.
4. **New form input `voice`** (`FormFieldInterfaceTypes` + `FieldRender`),
   `components/inputs/voice/index.tsx`, next to the other inputs. It drives
   `MediaRecorder` directly rather than through `react-media-recorder`,
   whose unmount cleanup stops clones of the tracks (so the microphone stays
   on) and which throws in an effect when `MediaRecorder` is missing:
   - Empty: a "Record" button (`Mic`) and an "Upload file" button. When the
     browser can't record, the reason is shown and only upload is offered.
   - Recording: a live timer, the time left in the last 30 s, and "Stop".
   - After stop or pick: upload at once (spinner, "Processing…"), then the
     `AudioPlayer` on the processed URL with "Replace" and "Remove". A failed
     upload shows the error and keeps "Try again" / "Remove".
   - It sets its own field to the URL and a sibling field named by a new
     `FormField.duration` option (like `dimensions` on `pic`) to the rounded
     length: the recording clock for a recording, the decoded
     `<audio>` duration for a file.
   - Insert is blocked while recording or uploading: `ObjectForm` now
     disables its submit button while any visible required field is empty.
     This applies to every block form (e.g. an image block with no picture
     can no longer be inserted empty).
   - A recording started and then closed (dialog/sheet dismissed) stops the
     microphone; a late upload result for a discarded clip is ignored, like
     comments' `recordingIdRef`.
5. **View.** Optional title (`text-sm font-medium`, `dir="auto"`), then
   `AudioPlayer`. `AudioPlayer` takes an optional `initialDuration` used
   until the element reports a finite duration. Its look is unchanged for
   comments; it already uses semantic tokens (`bg-primary`, `border-border`,
   `text-muted-foreground`), so palettes restyle it.
6. **Registry.** Category `media`, after Gallery. Title "Voice note",
   description "Record or upload a short audio clip.", icon `MicIcon`.
   `examples`: one with a title and one without, both pointing at a short
   sample clip committed under `front-end/public/` (`/sample-voice.m4a`,
   3 s of speech made with macOS `say`, AAC, 47 KB).

## Steps

1. GraphQL (`portableText.graphqls`): `voiceNote` in `BlockType`,
   `VoiceNoteBlock`, `VoiceNoteBlockInput`, and a `voiceNote` field on
   `Blocks` and `BlockInput`.
2. Go (`block-objects/voiceNote.go`): `parseVoiceNote`, and its cases in
   `ParseBlock` and `Key` (`TextLength` returns 0, so no case).
3. `make generate-models` in `shared/` against the local codegen Postgres,
   then `pnpm codegen` in `front-end/`.
4. `lib/audioRecording.ts`, and `simple-input` switched to it.
5. `AudioPlayer` `initialDuration` prop.
6. `FormField.duration`, the `voice` interface type, `inputs/voice`, its case
   in `FieldRender`, and the required-field check in `ObjectForm`.
7. `components/portable-text/blocks/voiceNote.tsx`: schema, fields, `View`,
   examples, added to `blocks`; the sample clip in `public/`.

## Acceptance criteria

- "+" and `/voice` both offer Voice note. Recording, stopping and inserting
  puts a player in the post; Edit reopens the form with the same clip, title
  and duration, and Replace records or picks a new one.
- Picking an mp3, wav or m4a file uploads it and fills the duration; an
  unsupported type or a file over 5 MB is refused with a message, before
  upload for size.
- Recording stops by itself at 5:00.
- Over plain http on a LAN address, or in a browser without `MediaRecorder`,
  the form says why recording isn't available and still allows upload.
- Closing the form mid-recording releases the microphone (the browser's
  recording indicator goes off).
- The post shows the waveform player with the stored length before playback,
  plays, seeks and changes speed; the title shows above it when set.
- Preview flags, and the server refuses: a missing key, a non-http(s) `src`,
  a title over 120 characters or with a line break, a duration outside
  1–600.
- Voice comments still record, upload, preview and post as before.
- Insert stays disabled until a clip is uploaded; other block forms with a
  required field (image, quote, callout…) behave the same way.
- The block restyles under every palette on `/dev/themes` and reads in light
  and dark mode.
- The form works in the mobile sheet and from the keyboard.
- Existing posts render unchanged.
- `go build ./...` passes in `shared/` and `backend/`, and `pnpm build` and
  `pnpm lint` pass. The repo has no test runner.
- Deploy the backend before the frontend. No `s3` change, so no `s3` deploy.

## Out of scope

- Authenticating the `s3` audio (and image) upload: it currently accepts
  anonymous uploads. Worth its own Bug ticket.
- Server-side duration or waveform extraction (ffprobe), and storing peaks.
- Trimming or editing a clip after recording.
- Transcripts / captions for the audio.
- Several clips in one block.
- Cleaning up uploaded clips that are never posted.
