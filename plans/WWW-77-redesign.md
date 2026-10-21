# WWW-77 — Redesign: club-site look and design fixes (Figma)

Figma only, no code. Builds on WWW-76 (`plans/WWW-76-figma-handoff.md`); the WWW-76 file stays as the record of today's design.

## Goal

Make Flookaa feel distinctive. Each channel and community should read like a small website of its own, not like a feed of cards. Fix the 9 problems in the current file along the way. The result is a new Figma file that the frontend tickets will implement.

## Decisions

- **Scope:** Figma only. Backend and frontend follow as their own tickets (see Follow-ups).
- **Direction:** "club / venue website". Channel and community pages get a full-width hero, not one in a card, followed by sections.
- **Identity:** each channel and community has its own theme (one of the palettes), a cover and a logo. The page takes on its colours.
- **Rebrand:** the Flookaa name and the sailboat logo stay. Palettes, type, shapes and the brand gradient are redesigned.
- **Mood:**
  - natural and airy foundation, warm and crafted personality
  - warm off-white, deep charcoal, and a muted teal accent
  - subtle borders, restrained rounding, minimal shadows
  - variety comes from content and community identity, not from UI decoration
- **Type:** modern, very readable, Arabic and English, RTL included.
- **Posts:**
  - feed: compact preview with "Read more"
  - post page: full content, with article typography when the post is long
  - discovery: masonry tiles
- **Dark mode:** default palette only. The other palettes are light only in Figma.
- **Figma:** Professional plan, new file "Flookaa v2".
- **Screens:** every group at 390, 834 and 1440:
  - channel and community
  - feed and discovery
  - profile and personas
  - public, auth and onboarding

## 1. Fixes to the current design

| # | Problem in WWW-76 | Fix in v2 |
|---|---|---|
| 1 | Patterns › Content components overlap (Community Card over Channel Card copies, Persona Card buried, Onboarding Progress over Footer) | Every pattern section is an auto-layout grid; nothing is placed absolutely. Checked by screenshot. |
| 2 | Cards in a row differ in height; actions sit at different levels; onboarding community card ends above its buttons; Join changes between full-width and small | Cards have a fixed anatomy: media, body that grows, then an action row pinned to the bottom. Rows stretch to equal height. One action pattern everywhere: primary + secondary, same size. |
| 3 | Feed is an empty gradient | Feed designed with content (previews from several channels) and as a designed empty state that points to discovery. |
| 4 | Test data ("Test", "prrrr", one repeated cover) | Realistic sample content in both languages, long and short names, missing cover or logo, large counts (1.2k). |
| 5 | Interest filter is a wall of about 45 chips | One horizontally scrolling row of the persona's own interests plus "All interests ▸", which opens a grouped sheet. |
| 6 | Blue → lime gradient clashes and has low contrast | Gradient retired. Progress and highlights use the accent on a neutral track. |
| 7 | Light only | Default palette in light and dark as variable modes. Other palettes light. |
| 8 | No states | Each component has hover, focus, pressed, disabled and loading states; lists have loading, empty and error frames. |
| 9 | Icon-only sidebar with ambiguous icons | Sidebar shows labels when expanded, tooltips when collapsed, and clearer icons. |

## 2. Foundations

### Palettes

The palette **ids and labels stay** (`tide` Deep Tide, `forest` Forest, `ember` Ember, `plum` Plum, `rose` Rose, `slate` Slate): personas store the ids, and channels and communities will too. Only the values change. **Token names stay** (`base/*`, `sidebar/*`, `status/*`, `chart/*`), so `themes.css` can follow one to one.

**Default (`tide`, Deep Tide)**: proposed values with WCAG contrast:

| Token | Light | Dark |
|---|---|---|
| background | `#F7F4EE` warm off-white | `#151716` |
| foreground | `#1E2124` charcoal (14.7:1) | `#ECE8E1` (14.8:1) |
| card | `#FCFAF6` | `#1C1F1E` |
| border / input | `#E2DCD0` | `#2D3230` |
| muted | `#EFEBE3` | `#1F2221` |
| muted-foreground | `#5E6266` (5.6:1 on bg) | `#A2A6A3` (7.3:1) |
| primary | `#2F6B66` muted teal (5.6:1 on bg) | `#7DB3AC` (7.7:1) |
| primary-foreground | `#FFFFFF` (6.2:1) | `#0F1F1D` (7.2:1) |
| accent | `#E3EEEC` | `#24302E` |
| ring | `#2F6B66` | `#7DB3AC` |

- The other five palettes are reworked in the same warm, natural key, each keeping its name: Forest (moss green), Ember (terracotta), Plum (heather), Rose (clay), Slate (ink).
- Each palette keeps a warm neutral background and has a single accent. Light values (the rest of the tokens follow the same mapping as Deep Tide: `card` = `popover` = `sidebar`, `input` = `border`, `ring` = `primary`, `*-foreground` = `foreground`, `primary-foreground` `#FFFFFF`):

  | Palette | background | card | border | muted | muted-fg | foreground | primary | accent | surface-sunken |
  |---|---|---|---|---|---|---|---|---|---|
  | Forest | `#F5F4EC` | `#FAF9F3` | `#DDDBCC` | `#ECEADF` | `#5A6056` | `#1F2420` | `#3E6A39` | `#E3EBDB` | `#EEEDE3` |
  | Ember | `#F8F3EC` | `#FCF8F3` | `#E5D9CA` | `#F0E8DD` | `#65584E` | `#26201C` | `#9E4529` | `#F5E1D6` | `#F2EBE1` |
  | Plum | `#F6F3F2` | `#FBF9F8` | `#E1D9DB` | `#EEE8E9` | `#615963` | `#231F24` | `#6A4365` | `#EDE1EA` | `#F0ECEB` |
  | Rose | `#F9F3F0` | `#FDF9F7` | `#E7D9D3` | `#F2E8E3` | `#655856` | `#251F1F` | `#9C4650` | `#F4E0DF` | `#F3ECE8` |
  | Slate | `#F4F4F1` | `#FAFAF8` | `#DBDCD6` | `#EBEBE6` | `#595E66` | `#1C2026` | `#33455D` | `#E1E6EC` | `#EDEDE9` |

  `secondary`: Deep Tide `#E9E4DA` (dark `#2A2E2C`), Forest `#E6E4D7`, Ember `#EDE3D6`, Plum `#E9E2E4`, Rose `#EEE3DE`, Slate `#E5E6E1`. Deep Tide `surface-sunken` `#F0ECE4` (dark `#111312`). `hero-overlay` is `foreground` at 55% (dark: black at 65%).
- Contrast, every text pair in every mode (fg, muted-fg and primary on background, card, muted, sunken; primary-fg on primary; fg on accent and secondary): all pass AA, the lowest is 5.17:1.
- `status/*` and `chart/*` keep today's values (light set in every light mode, dark set in Deep Tide Dark).
- **Retired tokens:** `card-glass*`, `page-glow-*`, `page-wash-*`, `primary-gradient-*`. The page background becomes the plain `background`. This decision is recorded here; removing them from the code is the frontend ticket's job.
- **New tokens:**
  - `hero-overlay` (scrim over cover images, so hero text stays readable)
  - `surface-sunken` (section bands behind the hero)

### Type

- **Readex Pro** for Arabic and English: one family, so mixed lines match. IBM Plex Sans Arabic isn't available in Figma, so the user chose the fallback (2026-10-21).
- Scale (mobile → md+):
  - Display 32 → 48
  - H1 26 → 32
  - H2 21 → 24
  - H3 18 → 20
  - Body 16 / 1.6
  - Small 14
  - XS 12
- **Article style** for long posts:
  - body 18 / 1.75
  - measure 68ch
  - generous spacing between paragraphs
  - pull quotes in the accent colour
- The crafted feel comes from type (weight contrast, tracking on small caps labels) and space, not from ornaments.

### Shape and depth

- Radius: `sm` 4, `md` 6, `lg` 8, `xl` 12. Avatars and chips stay round.
- Borders: 1px `border` on every surface. A single shadow, `Shadow/sm`, for raised overlays only (menus, dialogs). Cards have no shadow.
- Spacing: Tailwind 4px scale. Sections are separated by 64 / 96 px bands on desktop.

## 3. Channel and community identity

- Each channel and community has a **theme** (palette id), a **cover** (wide image, 3:1 on desktop, 16:9 on mobile) and a **logo** (square).
- The page sets `data-theme` to its palette, so the hero, the section accents and the posts take on its colours. App chrome (sidebar, top actions) stays on the viewer's palette.
- When nothing is set: the community's theme if the channel is in one, otherwise the app default; no cover gives a generated pattern from the theme; no logo gives initials.
- On cards in lists, only the logo and a thin accent edge show the theme. Lists stay calm.

## 4. Components (new or changed)

- **Button**: primary, secondary, outline, ghost, destructive, link × sm, md, lg, icon; with loading state.
- **Chip**: interest (emoji with a gap), filter, status (Private, Pending, 18+).
- **Hero**: full width. Cover, scrim, logo, name, tagline, key facts (members, channels, age limit, privacy), and Join / Follow / Manage. Variants: Channel, Community, Persona; with cover and without.
- **Section header**: small caps label, title, optional action ("See all").
- **Section nav**: sticky tabs under the hero (Posts · About · People · Channels). It turns into a scrollable row on mobile.
- **About block**: description, interests, rules (collapsible after 5 lines), owner and moderators.
- **People strip**: avatars with names, "+n". Anonymous personas show their anonymous name and a generated avatar, so privacy rules are kept.
- **Channel tile / Community tile**: fixed anatomy, used in lists, onboarding and the community's channels grid.
- **Post preview**:
  - author, channel, time
  - text clamped to 6 lines (about 280 characters)
  - first block shown compact
  - "Read more"
  - like, comment, share
- **Post page**: the full post with article style when the text is over about 1200 characters, then the comments.
- **Masonry tile**: an image post shows the image plus one line; a text post shows its title or first line plus an excerpt (4 lines). Every tile shows its channel's logo and accent edge.
- **Composer**: a slim bar ("Write in Sports…") that expands into a full-width writer with a block-insert menu and attachment row. Same on mobile, opened as a full-screen sheet.
- **Sidebar**: expanded with labels, collapsed with tooltips, mobile sheet.
- **States** for every list: skeleton, empty (illustration, one sentence, one action), and error with retry.

## 5. Page anatomy

### Channel

```
┌────────────────────────────────────────────────────────┐
│ COVER (full width, theme scrim)                        │
│  [logo]  Sports                       [Join] [Follow]  │
│          Matches, training and talk   1.2k · Public    │
└────────────────────────────────────────────────────────┘
  Posts · About · People                 (sticky nav)
 ┌──────────────────────────────┐  ┌───────────────────┐
 │ [composer: Write in Sports…] │  │ ABOUT             │
 │                              │  │ description       │
 │ post preview                 │  │ interests chips   │
 │ post preview                 │  │ Part of Tech ▸    │
 │ post preview                 │  │ PEOPLE  ◯◯◯◯ +40  │
 └──────────────────────────────┘  └───────────────────┘
```
Desktop: posts column (max 680) and an aside. Tablet and mobile: the aside moves into the About tab.

### Community

```
┌────────────────────────────────────────────────────────┐
│ COVER                                                  │
│  [logo]  Tech Builders               [Join] [Follow]   │
│          For people who build…  640 members · 6 ch     │
└────────────────────────────────────────────────────────┘
  Channels · About · People
  CHANNELS ─────────────────────────────── See all ▸
  [tile] [tile] [tile]
  ABOUT ───────────────  RULES ──────────────────────
  description, chips     1. Be kind  2. …
  PEOPLE ──────────────────────────────────────────
  ◯ ◯ ◯ ◯ ◯ ◯ +620     Moderators: ◯ ◯
```
A community has no posts of its own (CLAUDE.md). Its page shows sections only. The "Latest from its channels" band is deferred to WWW-79.

### Feed and discovery
- **Feed**: one column of post previews from the persona's channels. "Read more" opens the post page. Empty state points to discovery.
- **Discover**: masonry of posts from public channels the persona can read, with interest filter row on top. Channels and communities lists use the tiles in an equal-height grid.

### Post page
- The channel's hero shrinks to a slim branded bar. Then the article: title (when the post has one), author, the body in article style, blocks, reactions, then comments.

### Profile and personas
- **Persona profile** as a personal site: hero (the persona's theme, avatar, names, bio, follow counts, Follow / Invite), connected personas, and the channels it shows. The locked view is the same hero with the anonymous name and "Request to follow".
- **Persona manager**: a list of persona rows with their theme swatch; settings in sections.

### Public, auth and onboarding
- **Visitor home**: full-width hero with the sailboat illustration redrawn in the new palette, three "what is Flookaa" sections, and a showcase of community heroes.
- **Login and sign-up**: split layout (image or illustration side, form side); stacked on mobile.
- **Onboarding**: same five steps. Progress bar uses the accent colour. Communities and channels steps use the shared tiles.

## 6. RTL

Arabic mirrors the layout: the hero places its logo on the right, the section nav and aside are flipped, and icons that show direction are mirrored. RTL frames at 1440 and 390 for Channel, Community, Post page and Onboarding 2. Sample content in Arabic is used there.

## 7. Figma build

1. New file "Flookaa v2" (`cB5tjyC1Vpx9aMQsrX0kDY`, https://www.figma.com/design/cB5tjyC1Vpx9aMQsrX0kDY) in Sara's team (`team::1694463309195621194`, student tier), as the user asked. IDs and progress: `plans/WWW-77-figma-handoff.md`.
2. Pages: Cover · Foundations · Components · Patterns · Channel & Community · Feed & Discovery · Profile & Personas · Public & Onboarding · RTL.
3. Variables:
   - `Theme` with modes Deep Tide Light, Deep Tide Dark, Forest, Ember, Plum, Rose, Slate
   - `Primitives` (radius, spacing, avatar palette)
   - `Breakpoint` with modes Mobile, Tablet, Desktop (type sizes, gutters)
4. Text styles in Readex Pro, with display, heading and article sizes bound to `Breakpoint`. Shadow style `sm` only.
5. Components, then patterns, then screens in the order of the pages above.
6. Theme switching shown on the Channel page: the same frame in three palettes, plus Deep Tide Dark.
7. Gotchas from WWW-76 apply (paint opacity on bound paints, re-fetching instances after a variant swap).

## Follow-ups (Backlog, label `redesign`)

| Ticket | What |
|---|---|
| WWW-78 | Optional post title (schema, composer, rendering in preview, post page and masonry) |
| WWW-79 | Community page: "Latest from its channels" band |
| WWW-80 | Backend: theme, cover and logo on channels and communities |
| WWW-81 | Frontend: v2 palettes, tokens and fonts (now Readex Pro) |
| WWW-82 | Frontend: channel and community pages as hero + sections |
| WWW-83 | Post preview with "Read more" and a post page route |
| WWW-84 | Discover: masonry of public posts |
| WWW-85 | Frontend: labelled sidebar, list states and RTL |

## Settled questions

1. **Post title:** yes, optional, in WWW-78. It does not block this ticket. Here the post frames show posts both with and without a title, and the masonry tile falls back to the first line.
2. **Palette names:** keep the current names.
3. **"Latest from its channels":** later, in WWW-79. The community page stays focused on its sections.

## Verification

- `get_screenshot` of each frame at its 3 widths: nothing overlaps, and the actions in a row share one baseline.
- Switching `Theme` mode recolours a frame completely, including hero and posts; Harbour Dark works.
- Every text and background pair passes WCAG AA in each palette (contrast script over the variable values, results written here).
- No unbound fills or strokes in screen frames.
- RTL frames: nothing clipped or misaligned in Arabic.

## Implementation notes

- File: "Flookaa v2" (`cB5tjyC1Vpx9aMQsrX0kDY`) in Sara's team. IDs: `plans/WWW-77-figma-handoff.md`.
- Pages: Cover, Foundations, Components, Patterns, Channel & Community, Feed & Discovery, Profile & Personas, Public & Onboarding, RTL. The plan's per-width pages became one page per screen group with Desktop / Tablet / Mobile frames side by side.
- Variables:
  - `Theme`: 40 colours × 7 modes (Deep Tide Light/Dark, Forest, Ember, Plum, Rose, Slate).
  - `Primitives`: radius, spacing.
  - `Breakpoint`: Mobile / Tablet / Desktop, with display, heading, article and lead sizes, gutter, section gap and frame width.
- Every frame sets its Theme and Breakpoint modes explicitly. Channel, community and persona content areas, tiles and post previews set the entity's palette; the sidebar and app chrome keep the viewer's palette.
- Covers have no photos. `generate_image` spends Figma AI credits on Sara's plan, so covers are four generated, theme-bound patterns (Horizon, Waves, Hills, Stripes), cropped at 4:1 in a clipping frame.
- Hero text sits on the page background below the cover, never on the image, so `hero-overlay` is unused for now. It's kept for an uploaded-photo variant.
- Screens, at 1440 / 834 / 390 unless noted:
  - Channel, Community, Post page
  - Feed, Feed empty (1440 / 390), Discover (masonry)
  - Profile, Profile locked (1440 / 390), Personas (1440 / 390)
  - Visitor home, Log in, Sign up, Onboarding 1–5
  - RTL (1440 / 390): Channel, Community, Post, Onboarding 2
  - Theme demo: Channel in Ember, Plum and Deep Tide Dark
- RTL frames are detached clones, mirrored by script: rows reversed, alignment, padding and side borders flipped, text right-aligned and translated, directional icons rotated. They don't follow later component changes. The code should mirror with `dir="rtl"` and logical CSS properties, not separate components.
- Verification, 2026-10-21:
  - No unbound solid fill or stroke on any screen page.
  - Figma variable values equal the palette tables above.
  - Text contrast is AA in every mode (lowest pair 5.17:1).
  - Theme modes recolour the Channel page completely, Deep Tide Dark included.
  - Screenshots reviewed for every screen group at desktop, plus spot checks at tablet and mobile.
- Known gaps:
  - The screenshot renderer leaves some emoji blank. They render in the Figma app.
  - Sample covers in post media are generated patterns, not photos.

## Revision 1 (QA, 2026-10-21): blocks and post previews

Review feedback: the colours are fine, but the layout is too classic and formal (LinkedIn-like), especially on channels, profiles and the feed. This pass covers only:

1. **A "Blocks & Posts" page** with a friendly, distinctive design for every Portable Text block in `front-end/src/components/portable-text/blocks/`, with their real fields:
   - Callout (tone info / success / warning / error)
   - Quote
   - Steps
   - Accordion
   - Checklist
   - Divider (line / dashed / dots / ornament)
   - Spoiler (hidden / revealed)
   - Image (sizes)
   - Gallery (carousel / grid)
   - Voice note
   - Countdown (running / ended)

   Blocks may be more expressive than cards: rounder corners, theme tints, oversized numerals and glyphs, playful touches (sticker labels, waveform, flip tiles). They still use only Theme variables, so each channel's palette recolours them.
2. **Several post preview concepts** that put blocks first and feel social rather than corporate, for example a chat bubble, a block spotlight, a poster, a scrapbook collage and a sticker card.

Screens are not reworked in this pass. The chosen concepts feed a later pass on the feed, channel and profile screens.

### Revision 1: implementation notes

- New page **Blocks & Posts** (`32:6`), after Patterns.
- New token `radius/2xl` = 20, used for blocks only.
- Blocks, all bound to Theme variables:
  - `Block/Callout` (4 tones, tinted card, icon bubble, tilted sticker)
  - `Block/Quote` (accent card, oversized glyph, corner blob)
  - `Block/Steps` (numbered rail, the last step in accent)
  - `Block/Checklist` (progress pill and bar, chunky boxes, struck-through done items)
  - `Block/Divider` (line, dashed, dots, sailboat ornament)
  - `Block/Accordion` (soft pills; the open one in accent)
  - `Block/Spoiler` (striped scratch card / revealed)
  - `Block/Image` (polaroid, Full / Medium)
  - `Block/Gallery` (bento grid / fanned carousel)
  - `Block/Voice note` (play pill with waveform)
  - `Block/Countdown` (primary card with flip tiles / ended)
- Post preview concepts (components `Post/*`), each shown in a different channel palette, with `Reactions` (a floating pill) shared by all:
  - A Bubble: speech-bubble post for short talk and voice notes.
  - B Spotlight: the first block leads (events).
  - C Poster: full primary card for quote posts.
  - D Scrapbook: tilted polaroid and taped sticky checklist.
  - E Stack: swipe deck for multi-block posts.
  - F Peek: compact row for dense lists.
- Not done in this pass: screens still use the original Post Preview. They get reworked once the user picks concepts.

## Revision 2 (QA, 2026-10-21): one unified post preview

Feedback: a post is a Portable Text stream, so any number of paragraphs and blocks in any order. The per-block concepts are replaced by **one unified preview** that can hold any mix, in several design versions.

**Preview rules (same for every version):**
1. **Stream:** blocks render in order as their real components; paragraphs clamp to 4 lines.
2. **Height budget:** about 560 px on desktop, 480 px on mobile. The preview cuts only between blocks, never through one. If the first block alone is taller than the budget, it shows in its compact form (gallery as a grid, accordion closed).
3. **Fade and summary:** the stream fades out above an "Inside this post" row with one chip per remaining block ("+4: Voice note · Steps · Spoiler · Quote"), then "Read more" to the post page.
4. **Interactive blocks stay interactive** in the preview: tick a checklist item, play a voice note, reveal a spoiler, watch the countdown.

All versions use the same sample post, so the comparison is only about the frame around the stream.

### Revision 2: implementation notes

- **Section** "One post preview, any blocks" (`36:725`), at the top of Blocks & Posts, in the Forest palette.
- **Rules card:** the four preview rules above.
- **Component set `Post`** (`36:748`), with property `Version`:
  - Thread: no card, author rail.
  - Spine: card with a channel-colour spine.
  - Bubbles: paragraphs as chat bubbles, blocks between them.
  - Canvas: tinted board, large lead, tilted sticker header and photo, floating reactions.
  - Strip: compact; first paragraph plus one tile per block.
- **Same sample stream in all five versions:** text, photo, text and countdown are shown; checklist, voice note, steps, spoiler and quote become "+5 more inside" chips (Strip shows them all as tiles).
- **Revision 1 concepts:** kept at the bottom of the page, labelled superseded.
- **Next:** the user picks a version (or a mix, e.g. Spine for feeds and Strip for profile tabs), then Feed, Channel and Profile get reworked with it at three widths.

## Revision 3 (QA, 2026-10-21): chosen versions

- **Feed:** `Post` Version = **Spine**.
- **Channel pages and profiles:** `Post` Version = **Canvas**, in the channel's or persona's palette.
- **Screens updated:** Feed, Channel and Profile at 1440 / 834 / 390. The old Post Preview instances are replaced with `Post` instances, and each post's text is overridden to fit its context.
- **On mobile:** countdown tiles and the polaroid shrink to fit the 358 px column.
- **Not updated:** the theme demo and RTL frames keep the old previews. The RTL frames are detached clones.

### Revision 3: implementation notes

- **Feed** (`21:2`, `21:897`, `21:1402`): three Spine posts (Sunday League / Forest, AI Corner / Slate, Startup Founders / Ember), each instance set to its channel palette.
- **Channel** (`17:2`, `17:518`, `17:812`): three Canvas posts that inherit the channel content area's palette (Forest).
- **Profile** (`24:2`, `24:693`, `24:943`): two Canvas posts in the persona palette (Ember).
- **Responsive components:**
  - Countdown tiles fill their row, from 52 to 96 px.
  - The block image in every `Post` version fills its width, capped at 360 px.
  - The Canvas floating reactions are pinned bottom-right.
- **Fixed on the way:** the mobile Profile body was stuck at 100 px tall (a bug from the first build).
- **Audit:** no unbound fills or strokes on the three changed pages.

## Revision 4 (QA, 2026-10-21): full-width posts, flat Canvas

- **No aside on Channel and Profile.** The posts column takes the full content width at every size.
- **Channel** section nav: Posts · About · People. About (description, interests, community) and People (members) are their own tabs, not a side column.
- **Profile** section nav: Posts · Channels · Connected. Connected personas move from the aside into their own tab.
- **Canvas post:** no rotation. The sticker header, photos and posters sit straight (0°).

### Revision 4: implementation notes

- **Channel** (`17:2`): the Aside (About block + People strip) is gone; that content lives under the About and People tabs. Tablet and mobile already had no aside.
- **Profile** (`24:2`, `24:693`, `24:943`): the Connected personas aside is gone at all three widths; it lives under the Connected tab. This also fixes the tablet body, where the aside overflowed the 770 px frame.
- **Posts** columns and their posts fill the body: 1064 px on desktop, 706 on tablet, 358 on mobile. The block image stays capped at 360 px.
- **Rotation:** every decorative tilt on Blocks & Posts is 0°: Canvas header and photo, the Thread and Bubbles images, the gallery carousel cards, the callout stickers, and the superseded Poster, Scrapbook and Stack concepts. Only the icons' own rotations stay (the open accordion chevron, the play triangle). No tilts on any other page.
- **Theme demo** (`28:4368`, `28:4455`, `28:4542`): the About + People aside is removed; posts fill the body (1064 px). They still use the old Post Preview.
- **Feed** (`21:2`): the Suggested channels aside is removed; posts fill the body (1064 px). Tablet and mobile never had it.
- **Not updated:** the RTL clones still have the old aside layout.

## Revision 5 (QA, 2026-10-21): overlap and spacing pass

An overlap scan (siblings intersecting, children overflowing their parent) over every page, then fixes:

- **Canvas post:** the floating reactions pill hung 9 px past the card. It now sits in flow in a footer row with "Read the whole post" (space between); bottom padding 22.
- **Callout:** the sticker hung off the top edge; it's now a tag above the title.
- **Gallery carousel:** the flattened cards stacked on each other; they now sit side by side with a 16 px gap, the side cards peeking (clipped by the block).
- **Interest filter:** the "All interests" button was clipped; the chips are now their own clipped, scrolling row and the button is always visible, 12 px after it.
- **Text spilling out of its frame** (now fills and wraps): mobile Discover header, mobile Personas header (frame was collapsed to 115 px), tablet Visitor home community meta, mobile Onboarding 5 persona meta and "Add another persona" text.
- **Tablet Visitor home:** the two hero buttons wrap instead of running past the column.
- **Mobile post page** (and its RTL clone): the reactions row was wider than 358 px; it now spaces its items between.
- **Collapsed sidebar:** its spacer was 100 px wide in a 64 px rail; it fills now.
- **Left as is (intentional):** overlapping avatar stacks (negative gap), the spoiler's scratch cover, and the chips scrolling past the filter's edge.
