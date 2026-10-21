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
- Each palette keeps a warm neutral background and has a single accent. Its values go in this plan before the Figma build.
- **Retired tokens:** `card-glass*`, `page-glow-*`, `page-wash-*`, `primary-gradient-*`. The page background becomes the plain `background`. This decision is recorded here; removing them from the code is the frontend ticket's job.
- **New tokens:**
  - `hero-overlay` (scrim over cover images, so hero text stays readable)
  - `surface-sunken` (section bands behind the hero)

### Type

- **IBM Plex Sans + IBM Plex Sans Arabic**: one family in both scripts, with matching weights and metrics, and very readable. Fallback: Readex Pro.
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

1. New file "Flookaa v2" in the user's team (Professional).
2. Pages: Cover · Foundations · Components · Patterns · Channel & Community · Feed & Discovery · Profile & Personas · Public & Onboarding · RTL.
3. Variables:
   - `Theme` with modes Deep Tide Light, Deep Tide Dark, Forest, Ember, Plum, Rose, Slate
   - `Primitives` (radius, spacing, avatar palette)
   - `Breakpoint` with modes Mobile, Tablet, Desktop (type sizes, gutters)
4. Text styles in Plex, bound to `Breakpoint`. Shadow style `sm` only.
5. Components, then patterns, then screens in the order of the pages above.
6. Theme switching shown on the Channel page: the same frame in three palettes, plus Deep Tide Dark.
7. Gotchas from WWW-76 apply (paint opacity on bound paints, re-fetching instances after a variant swap).

## Follow-ups (Backlog, label `redesign`)

| Ticket | What |
|---|---|
| WWW-78 | Optional post title (schema, composer, rendering in preview, post page and masonry) |
| WWW-79 | Community page: "Latest from its channels" band |
| WWW-80 | Backend: theme, cover and logo on channels and communities |
| WWW-81 | Frontend: v2 palettes, tokens and IBM Plex fonts |
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
