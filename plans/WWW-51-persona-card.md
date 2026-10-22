# WWW-51 — Persona card on persona names

Branch `WWW-51-persona-card`, from `release-caterpie-v1010`. Epic WWW-12
(persona privacy and following). It builds on WWW-50 (the locked profile and
its "Request to follow" button).

## Goal

Clicking a persona's name or avatar opens a small card instead of
navigating. This applies to post and comment authors, channel member and
join-request lists, follower and request lists, and notification actors.

- **Real persona:** avatar, name, a follow button in its current state
  (Follow / Requested / Following), and a "View profile" link.
- **Anonymous persona** ("Quiet Otter 37"): the same anonymous name and
  generated avatar, plus "Request to follow" when the persona can be
  followed. Nothing else.
- **`only_me` persona** (anonymous or not): no follow button.
- **Your own persona:** no follow button, only "View profile".

## The open questions

**1. How the card learns the follow state.** It fetches lazily, when the card
opens, with the existing `GET /persona/:persona_id`. List rows don't change
and need no extra query. The three answers already map onto the three cards:

| Response | Card |
|---|---|
| 200 full (`locked: false`) | real card, the fetched name and avatar, the follow button in its fetched state |
| 200 `locked: true` | anonymous card, "Request to follow" or "Requested" |
| 404 | the card from the list data, with no follow button (`only_me`, deleted or missing) |

This tells a viewer whether an anonymous name is private or `only_me`. That
is already true since WWW-50, because ids are real and `/personas/:id`
answers the same way. The card leaks nothing new.

**One backend addition:** the full response gets `followable`
(`privacy <> 'only_me'`). Without it, a real `only_me` persona that you can
see (your own other persona, or one that follows you) would show a Follow
button that answers 404. The profile page uses the same flag, which fixes
that bug there too. `privacy` itself is not sent, because the viewer doesn't
need it.

**2. Does the anonymous private card link to the locked page?**
Recommendation: **no**. The locked page holds only the same request button,
so the link adds nothing. An anonymous card has no "View profile". Once a
request is approved, the persona is real to the viewer and its card gets the
link.

## Frontend

- **`components/persona-link` becomes the card trigger.** `PersonaLink` keeps
  its name and its call sites. It gains the props `name` and `thumbnail?`,
  because the card needs them when the fetch gives nothing to show
  (locked or 404). Its children are wrapped in a Radix `PopoverTrigger`
  (`asChild` on a `<button type="button">`, styled like the current link).
  Callers: `post-card`, `comment-section/item`, `ModerationSheet`,
  `FollowersSheet`.
- **`PersonaCard`** (new, same folder): the popover body.
  - It fetches `fetchPersonaProfile(id)` each time it opens, so the state is
    never stale. While loading, it shows the list data with a small skeleton
    where the button goes.
  - It reuses `FollowButton`: `followLabel="Request to follow"` on the locked
    card, `requiresApproval` from the response on the real one. `onChange`
    updates the card's own state only.
  - On a real card, "View profile" is a `Link` to `personaPath(id)` that
    closes the popover.
- **Notifications.** The row is a single `<button>` today, so a trigger
  can't go inside it. It becomes a `div` holding two siblings: the avatar is
  the card trigger, and the text and time are the existing open button. The
  actor's name in the text stays part of the open button, so the row keeps
  one big click target. Opening the card inside the bell popover is a nested
  Radix popover, which Radix supports.
- **Profile page:** it hides `FollowButton` when `followable` is false. Its
  connected personas keep linking straight to their profiles: they are real
  by definition, and the page is already a profile.

## Out of scope

- Hover-to-open. The card opens on click or tap only, the same on mobile and
  desktop.
- Shareable request links (WWW-52).

## Steps

1. Backend: `followable` on the full `GET /persona/:persona_id` response.
2. Frontend: `PersonaCard`, `PersonaLink` as its trigger, `name`/`thumbnail`
   at the four call sites, and the `followable` type plus the profile page.
3. Frontend: the notification row split.
4. CLAUDE.md: a line under "Persona access" on the card and `followable`.

## Checks

- `go build ./...` in `backend/`. `pnpm lint` and `pnpm build` in
  `front-end/`. There are no tests in the repo.
- Manual, on dev, with A (public), P (private), O (`only_me`) and B
  (private, follows A), all in one channel:
  1. A clicks P's anonymous name on a post. The card shows the anonymous name
     and "Request to follow". A requests and the card reads "Requested".
  2. A clicks O's anonymous name. The card has no button.
  3. A clicks B's real name (B follows A). The card shows B with Follow and
     "View profile", and the link opens B's profile.
  4. Another persona of A's user opens O's card. O is real to it, and the
     card has "View profile" and no Follow.
  5. A clicks its own name. It sees "View profile" only.
  6. In the bell, clicking an actor's avatar opens the card, and clicking the
     text still opens the notification.
  7. The member, join-request, follower and request lists open the card too.
