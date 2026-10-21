# WWW-76 — Figma build: handoff

State when the Figma MCP Starter call limit stopped the work (2026-10-20). Read this, then continue with "Next steps". Plan: `plans/WWW-76-figma-design-system.md`.

## File

- **Flookaa Design System**: https://www.figma.com/design/m7eIIQHkTklctIoPSosLlR
- File key `m7eIIQHkTklctIoPSosLlR`, in the user's own team (`team::1303472949500911559`).
- Starter limits: 1 mode per collection, 3 pages, a capped number of MCP tool calls.
- Start a new session with `create_session` (fileKey above). The old session id doesn't carry over.
- Load the Figma skills before writing: `skill://figma/figma-use/SKILL.md` and `skill://figma/figma-generate-library/SKILL.md` (components/patterns), plus `skill://figma/figma-generate-design/SKILL.md` (screens).

## Done

- **Design System page** (`0:1`):
  - Variables: `Theme` (Tide Light, 48 colours, CSS code syntax) and `Primitives` (radius, spacing, tailwind avatar palette, black/white, brand).
  - 26 text styles, 5 shadow styles.
  - Icons section (68 lucide icons + Google).
  - Components: Button, Form controls, Display, Menus & popovers, Overlays & data, Navigation.
  - Asset components: logo, welcome background, visitor illustration + decoration.
- **Patterns page** (`3:71`):
  - App shell: page background, public/mobile header, sidebar.
  - Content: post, community, persona cards; notification item; interest chip; onboarding progress + footer; and the Channel Card, rebuilt to match flookaa.com.
  - Forms: form field, auth card.
  - Page parts: top actions, filter chip, page header.
  - Form parts: interest tile, upload dropzone, section card, theme option, persona row, post composer.
- **Post blocks** (Patterns page, section `60:691` at x 0, y 5100): `Block/Callout` (Tone), `Block/Quote`, `Block/Steps`, `Block/Accordion`, `Block/Checklist`, `Block/Divider` (Style), `Block/Spoiler` (State Hidden/Revealed), `Block/Image`. Done 2026-10-21.
- **Screens page** (`3:72`): sections Mobile/Tablet/Desktop with Visitor home, Login and Sign-up at 390/834/1440.
- **Logged-in screens** (done 2026-10-21), one frame per width, named `<Width> / <Screen>`: Channels, Channel, Feed, Communities, Community, Profile, Personas, Notifications, Settings, Create community, Create channel, Persona settings, Blocks. References in the session scratchpad only (re-capture with the Playwright loop if needed).
- **Post Card** gained `Block` (instance swap, preferred values = the 8 `Block/*`), `Show block`, `Show text`; posts show a block without detaching.

## Next steps

1. ~~Post blocks~~ (done).
2. ~~Logged-in screens~~ (done). Kept for reference:
   one frame per width in the Mobile / Tablet / Desktop sections (390×844, 834×1194, 1440×900; full-page height where the page scrolls).
   - Shell: `Page/Background` at the matching width; `App/Sidebar` Collapsed (48px, md+) or `App/Mobile Header` (below md); `App/Top Actions` at top-right.
   - Routes to build, as captured on flookaa.com:
     - `/` (feed): renders empty for this account.
     - `/channels`: page header, search input, interest filter chips, 3-column Channel Card grid.
     - `/channels/6`: breadcrumb, channel header card (cover, rounded thumbnail, name, description, stats, Joined/Follow), Post Composer, "Recent Posts" with Post Cards containing post blocks, "Load More Posts".
     - `/communities`: header, filter chips, Community Card grid.
     - `/communities/tech-builders`: banner, avatar, name, "Created by", Join/Follow, counts, description, interest chips, "Channels" grid.
     - `/communities/create` and `/channels/create`: one form card, fields, dropzones, Interest Tile grid by group, actions.
     - `/personas/19`: profile card.
     - `/persona-manager`: page header, table of Persona Rows.
     - `/persona-manager/19`: Persona and Profile Section Cards, Theme Options, Interest Tiles, Save buttons.
     - `/notifications`: header, "Mark all read", card list of Notification Items.
     - `/settings/profile`: three Section Cards, Cancel / Save Changes.
     - `/blocks`: the block catalogue.
   - To re-capture references: open https://flookaa.com in the Playwright browser (the user signs in there; the test persona is "Mo sport", id 19), then full-page screenshots at 1440/834/390. Read-only: never post, join or follow.
3. ~~From code~~ (done 2026-10-21): Onboarding 1–5, Persona wizard 1–3, Select persona, Admin interests. Was: **From code**, because the test account is already onboarded and isn't an Administrator: onboarding steps (about you, interests, communities, channels, personas, persona wizard), select-persona, and `/admin/interests`.
4. ~~Verify~~ (done 2026-10-21, see the plan's implementation notes). Was: **Verify**:
   - Screenshot each frame next to its reference.
   - Check that fills and strokes are bound to variables.
   - Then add implementation notes to the plan and move WWW-76 to In Review.

## Gotchas found so far

- `setBoundVariableForPaint` resets paint opacity, and so does assigning a bound paint whose opacity was set on a copy beforehand. Assign the bound paint first, then JSON-copy `node.fills`, set `opacity`, and assign again.
- Icon instances nested in another instance can't be rescaled, and `findAll` on an icon instance returned no children. Take colours from sibling layers.
- Component TEXT properties make every variant show the default text; set per-instance values.
- Radial gradients: the stop position is the CSS percentage; the transform maps the ellipse radius to 0.5.
- Gradients for `.bg-primary`: 135deg, transform `[[0.5,0.5,0],[-0.5,0.5,0.5]]`, stops bound to `effect/primary-gradient-from/-to`.
- New pages fail on Starter (3 pages max): keep everything in the 3 pages.
- Paint opacity on a variable-bound paint does not survive into instances (the instance reads opacity 1 with no override). Use a stretched child layer with layer `opacity` instead (the callout's `Tint` / `Border`).
- Swapping a nested instance's variant (`setProperties({Type})`) or hiding a sublayer can make a later `findOne`/`findAll` on the same instance throw "node does not exist". Re-fetch the instance by id (`getNodeByIdAsync`) after each such edit.
- `Select/Trigger` (`11:156`) is a component set: swap to its `defaultVariant`.
- Gallery, Voice note and Countdown blocks have no components yet; the Blocks screens leave them out.
- Image hashes: logo `9780891d9c56690880445da6bcff9ab288501cf6`, welcome background `c16f1bdbb0acd86e5194d7d2ec83d67cf5a72ec7`.

## IDs

### Pages and sections
| Name | ID |
|---|---|
| `Design System` | `0:1` |
| `Patterns` | `3:71` |
| `Screens` | `3:72` |
| `Icons` | `6:2` |
| `Button` | `7:117` |
| `Form controls` | `8:61` |
| `Display` | `10:130` |
| `Menus & popovers` | `11:190` |
| `Overlays & data` | `12:203` |
| `Navigation` | `13:186` |
| `App shell` | `18:521` |
| `Content` | `22:784` |
| `Forms` | `25:634` |
| `Screens/Mobile` | `26:159` |
| `Screens/Tablet` | `26:160` |
| `Screens/Desktop` | `26:161` |
| `Page parts` | `30:907` |
| `Form parts` | `31:798` |

### Collections
| Name | ID |
|---|---|
| `Theme` | `VariableCollectionId:3:2` |
| `Primitives` | `VariableCollectionId:3:51` |

### Variables
| Name | ID |
|---|---|
| `base/background` | `VariableID:3:3` |
| `base/foreground` | `VariableID:3:4` |
| `base/card` | `VariableID:3:5` |
| `base/card-foreground` | `VariableID:3:6` |
| `base/popover` | `VariableID:3:7` |
| `base/popover-foreground` | `VariableID:3:8` |
| `base/border` | `VariableID:3:9` |
| `base/input` | `VariableID:3:10` |
| `base/primary` | `VariableID:3:11` |
| `base/primary-foreground` | `VariableID:3:12` |
| `base/secondary` | `VariableID:3:13` |
| `base/secondary-foreground` | `VariableID:3:14` |
| `base/muted` | `VariableID:3:15` |
| `base/muted-foreground` | `VariableID:3:16` |
| `base/accent` | `VariableID:3:17` |
| `base/accent-foreground` | `VariableID:3:18` |
| `base/ring` | `VariableID:3:19` |
| `base/scrim` | `VariableID:3:20` |
| `sidebar/sidebar` | `VariableID:3:21` |
| `sidebar/sidebar-solid` | `VariableID:3:22` |
| `sidebar/sidebar-foreground` | `VariableID:3:23` |
| `sidebar/sidebar-primary` | `VariableID:3:24` |
| `sidebar/sidebar-primary-foreground` | `VariableID:3:25` |
| `sidebar/sidebar-accent` | `VariableID:3:26` |
| `sidebar/sidebar-accent-foreground` | `VariableID:3:27` |
| `sidebar/sidebar-border` | `VariableID:3:28` |
| `sidebar/sidebar-ring` | `VariableID:3:29` |
| `status/destructive` | `VariableID:3:30` |
| `status/destructive-foreground` | `VariableID:3:31` |
| `status/success` | `VariableID:3:32` |
| `status/success-foreground` | `VariableID:3:33` |
| `status/warning` | `VariableID:3:34` |
| `status/warning-foreground` | `VariableID:3:35` |
| `chart/chart-1` | `VariableID:3:36` |
| `chart/chart-2` | `VariableID:3:37` |
| `chart/chart-3` | `VariableID:3:38` |
| `chart/chart-4` | `VariableID:3:39` |
| `chart/chart-5` | `VariableID:3:40` |
| `effect/primary-gradient-from` | `VariableID:3:41` |
| `effect/primary-gradient-to` | `VariableID:3:42` |
| `effect/card-glass` | `VariableID:3:43` |
| `effect/card-glass-sheen` | `VariableID:3:44` |
| `effect/card-glass-border` | `VariableID:3:45` |
| `effect/page-glow-1` | `VariableID:3:46` |
| `effect/page-glow-2` | `VariableID:3:47` |
| `effect/page-glow-3` | `VariableID:3:48` |
| `effect/page-wash-from` | `VariableID:3:49` |
| `effect/page-wash-to` | `VariableID:3:50` |
| `radius/sm` | `VariableID:3:52` |
| `radius/md` | `VariableID:3:53` |
| `radius/lg` | `VariableID:3:54` |
| `radius/xl` | `VariableID:3:55` |
| `radius/full` | `VariableID:3:56` |
| `spacing/0` | `VariableID:3:57` |
| `spacing/1` | `VariableID:3:58` |
| `spacing/2` | `VariableID:3:59` |
| `spacing/3` | `VariableID:3:60` |
| `spacing/4` | `VariableID:3:61` |
| `spacing/5` | `VariableID:3:62` |
| `spacing/6` | `VariableID:3:63` |
| `spacing/8` | `VariableID:3:64` |
| `spacing/10` | `VariableID:3:65` |
| `spacing/12` | `VariableID:3:66` |
| `spacing/16` | `VariableID:3:67` |
| `spacing/0_5` | `VariableID:3:68` |
| `spacing/1_5` | `VariableID:3:69` |
| `spacing/2_5` | `VariableID:3:70` |
| `tailwind/black` | `VariableID:12:116` |
| `tailwind/sky-100` | `VariableID:9:121` |
| `tailwind/sky-700` | `VariableID:9:122` |
| `tailwind/rose-100` | `VariableID:9:109` |
| `tailwind/rose-700` | `VariableID:9:110` |
| `tailwind/emerald-100` | `VariableID:9:117` |
| `tailwind/emerald-700` | `VariableID:9:118` |
| `tailwind/violet-100` | `VariableID:9:125` |
| `tailwind/violet-700` | `VariableID:9:126` |
| `tailwind/amber-100` | `VariableID:9:113` |
| `tailwind/amber-700` | `VariableID:9:114` |
| `brand/start` | `VariableID:17:166` |
| `brand/end` | `VariableID:17:167` |
| `tailwind/white` | `VariableID:17:168` |

### Text styles
| Name | ID |
|---|---|
| `Heading/H1/Mobile` | `S:4ec0657e70fade8b7004e3c57fc7b0424226700b,` |
| `Heading/H1/md+` | `S:0e5dea3768f8ddacb9bf839aa333db7dca0d75a2,` |
| `Heading/H2/Mobile` | `S:48829f3fa9b4423c2bd8b9232432f21f56598b2e,` |
| `Heading/H2/md+` | `S:9b9df8c835f40acc74880fd9c47a7d3d8242a20f,` |
| `Heading/H3/Mobile` | `S:351e17ef673da4e336ff460a4acd4acb653acd83,` |
| `Heading/H3/md+` | `S:c5dfcb11c02806bbfba177d345dd00a288bf3a9b,` |
| `Heading/H4/Mobile` | `S:6146f124b8da30d53fef8680edc1f54572c2035a,` |
| `Heading/H4/md+` | `S:539154bb849696f8b85d550b6a70f56a097bbbb7,` |
| `Heading/H5/Mobile` | `S:8763877a20f3cbdde311b43e47b7dec58b836157,` |
| `Heading/H5/md+` | `S:68dab9942d393f46b7bd99af82950170c49298bb,` |
| `Display/Hero` | `S:655bb698a18eea835ab98a44fab6bfe9e4824e13,` |
| `Body/Base` | `S:3984b87e1bbe30923cdda5c100e7cd6f01095737,` |
| `Body/Base Medium` | `S:a1d44baaf0ceebdd61c8b7dd712c4d5b0fa088db,` |
| `Body/Small` | `S:5275eaf063bcdd10e34d20830fa5491fc63a4567,` |
| `Body/Small Medium` | `S:455f4181ae4f98b8562699c67dd6431ecee3abab,` |
| `Body/Small Semi Bold` | `S:ed5d88218593d622dc6f8027821a75854af671b9,` |
| `Body/XS` | `S:e78ca11e7b0e80252b3b4b3191466e76eae524b5,` |
| `Body/XS Medium` | `S:80286c1d0558fecac9f431f3d398ce464d1a2030,` |
| `UI/Card Title` | `S:98fc91538a6981832e9386a43469adc0e698405c,` |
| `UI/Label` | `S:598af5a2178470282e5effe1774108b321f5c3b9,` |
| `Display/Hero Sub` | `S:b263d0af2956a9fab74f53e04ce29a97ea552e2b,` |
| `Display/Auth Title` | `S:d9783d66ba40243649c457f2a1dcf3910b2c0cd4,` |
| `Display/Onboarding Title/md+` | `S:db3a3a194f875b1f57d2fb350adfca53fe8a0b63,` |
| `Display/Onboarding Title/Mobile` | `S:4feb8fedc7b3b52f90c258db9be2dd413a75eab9,` |

### Effect styles
| Name | ID |
|---|---|
| `Shadow/xs` | `S:8b23c108668fc4fe7db900bac09658e65c7c7711,` |
| `Shadow/sm` | `S:1d59b347bae4400171bab6e9bf8326a89600417c,` |
| `Shadow/md` | `S:d2ba33a7eb6cd21c6b5eda24510e21f3d2133e70,` |
| `Shadow/lg` | `S:73bdeeaa78d34d235cc841c8e5e998d40350fc59,` |
| `Shadow/xl` | `S:69d841192686f707504b85e6e833ce7f3fb1dc4b,` |

### Components and component sets
| Name | ID |
|---|---|
| `Button` | `7:116` |
| `Badge` | `8:22` |
| `Input` | `8:33` |
| `Textarea` | `8:42` |
| `Label` | `8:43` |
| `Switch` | `8:49` |
| `Toggle` | `8:58` |
| `Separator` | `8:59` |
| `Skeleton` | `8:60` |
| `Avatar` | `10:86` |
| `Card` | `10:87` |
| `Tabs/Trigger` | `10:112` |
| `Tabs/List` | `10:113` |
| `Tooltip` | `10:120` |
| `Breadcrumb` | `10:122` |
| `Menu/Item` | `11:94` |
| `Menu/Label` | `11:95` |
| `Menu/Separator` | `11:97` |
| `Dropdown Menu` | `11:99` |
| `Select/Trigger` | `11:156` |
| `Select/Content` | `11:157` |
| `Popover` | `11:172` |
| `Toast` | `11:189` |
| `Dialog` | `12:117` |
| `Dialog/Overlay` | `12:141` |
| `Sheet` | `12:187` |
| `Table/Row` | `12:202` |
| `Sidebar/Item` | `13:168` |
| `Sidebar/Persona` | `13:185` |
| `Asset/Logo` | `17:158` |
| `Asset/Welcome background` | `17:159` |
| `Asset/Visitor illustration` | `17:160` |
| `Asset/Visitor decoration` | `17:161` |
| `Page/Background` | `18:155` |
| `App/Mobile Header` | `18:156` |
| `App/Public Header` | `18:197` |
| `App/Sidebar` | `18:520` |
| `Interest Chip` | `22:430` |
| `Post Card` | `22:550` |
| `Channel Card` | `30:906` |
| `Community Card` | `22:631` |
| `Notification Item` | `22:689` |
| `Persona Card` | `22:690` |
| `Onboarding Progress` (set, `Step` 1–5) | `79:13107` |
| `Onboarding Footer` | `22:783` |
| `Icon/google` | `23:164` |
| `Form Field` | `25:520` |
| `Auth Card` | `25:633` |
| `App/Top Actions` | `30:583` |
| `Filter Chip` | `30:606` |
| `Page Header` | `30:645` |
| `Interest Tile` | `31:640` |
| `Upload Dropzone` | `31:641` |
| `Section Card` | `31:663` |
| `Theme Option` | `31:682` |
| `Persona Row` | `31:683` |
| `Post Composer` | `31:797` |
| `Post blocks` (section) | `60:691` |
| `Block/Callout` | `60:731` |
| `Block/Quote` | `60:732` |
| `Block/Steps` | `60:740` |
| `Block/Accordion` | `60:763` |
| `Block/Checklist` | `60:783` |
| `Block/Divider` | `60:817` |
| `Block/Spoiler` | `60:854` |
| `Block/Image` | `60:855` |

### Component property keys
| Component | Keys |
|---|---|
| `Button` | `{"Label":"Label#7:0","Show icon":"Show icon#7:25","Icon":"Icon#7:50","Show end icon":"Show end icon#22:0","End icon":"End icon#22:25"}` |
| `Menu/Item` | `{"Label":"Label#11:0","Show icon":"Show icon#11:5","Icon":"Icon#11:10"}` |
| `Select/Trigger` | `{"Value":"Value#11:15"}` |
| `Toast` | `{"Message":"Message#11:19"}` |
| `Dialog` | `{"Title":"Title#12:0","Description":"Description#12:1"}` |
| `Sheet` | `{"Title":"Title#12:2","Description":"Description#12:6"}` |
| `Sidebar/Item` | `{"Label":"Label#13:0","Icon":"Icon#13:7","Has children":"Has children#13:14"}` |
| `Sidebar/Persona` | `{"Name":"Name#13:21","Persona":"Persona#13:24"}` |
| `Interest Chip` | `{"Label":"Label#22:50"}` |
| `Onboarding Footer` | `{"Note":"Note#22:54"}` |
| `Onboarding Progress` | `{"Count":"Count#79:0","Step":"Step"}` |
| `Post Card` | `{"Block":"Block#68:0","Show block":"Show block#68:3","Show text":"Show text#68:6"}` |
| `Card` | `{}` |
| `Form Field` | `{"Label":"Label#25:0","Required":"Required#25:1"}` |
| `Input` | `{"Value":"Value#8:5"}` |
| `App/Top Actions` | `{"Unread":"Unread#30:0","Show count":"Show count#30:1"}` |
| `Filter Chip` | `{"Label":"Label#30:2"}` |
| `Page Header` | `{"Title":"Title#30:5","Subtitle":"Subtitle#30:8","Show icon":"Show icon#30:11","Show action":"Show action#30:14","Show subtitle":"Show subtitle#30:17"}` |
| `Channel Card` | `{"Name":"Name#30:20","Description":"Description#30:25","In community":"In community#30:30","Show interests":"Show interests#30:35","Private":"Private#30:40"}` |
| `Interest Tile` | `{"Emoji":"Emoji#31:0","Label":"Label#31:3"}` |
| `Section Card` | `{"Title":"Title#31:6","Description":"Description#31:9","Icon":"Icon#31:12"}` |
| `Theme Option` | `{"Name":"Name#31:15"}` |

### Icons (component ids)
| Icon | ID |
|---|---|
| `home` | `6:6` |
| `inbox` | `6:10` |
| `boxes` | `6:24` |
| `rss` | `6:29` |
| `blocks` | `6:33` |
| `search` | `6:37` |
| `scan-face` | `6:46` |
| `settings` | `6:50` |
| `shield-check` | `6:54` |
| `tags` | `6:59` |
| `user-round` | `6:63` |
| `panel-left` | `6:67` |
| `tv` | `6:71` |
| `chevrons-up-down` | `6:75` |
| `chevron-down` | `6:78` |
| `chevron-right` | `6:81` |
| `chevron-left` | `6:84` |
| `plus` | `6:88` |
| `x` | `6:92` |
| `check` | `6:95` |
| `heart` | `6:98` |
| `message-circle` | `6:101` |
| `send` | `6:105` |
| `ellipsis` | `6:110` |
| `lock` | `6:114` |
| `globe` | `6:119` |
| `users` | `6:125` |
| `user-plus` | `6:131` |
| `bell` | `6:135` |
| `mail` | `6:139` |
| `arrow-right` | `6:143` |
| `arrow-left` | `6:147` |
| `sparkles` | `6:153` |
| `pencil` | `6:157` |
| `clock` | `6:161` |
| `image` | `6:166` |
| `mic` | `6:171` |
| `upload` | `6:176` |
| `sun-moon` | `6:183` |
| `filter` | `6:186` |
| `trending-up` | `6:190` |
| `loader-circle` | `6:193` |
| `log-out` | `6:198` |
| `eye` | `6:202` |
| `calendar` | `6:208` |
| `cat` | `9:23` |
| `bird` | `9:31` |
| `fish` | `9:39` |
| `rabbit` | `9:46` |
| `turtle` | `9:52` |
| `squirrel` | `9:58` |
| `share-2` | `9:65` |
| `trash-2` | `9:72` |
| `chevron-up` | `9:75` |
| `moon` | `9:78` |
| `sun` | `9:89` |
| `user-round-x` | `9:95` |
| `link-2` | `9:100` |
| `camera` | `9:104` |
| `chevrons-left` | `9:108` |
| `google` | `23:164` |
| `info` | `32:163` |
| `circle-check` | `32:167` |
| `triangle-alert` | `32:172` |
| `circle-x` | `32:177` |
| `quote` | `32:181` |
| `eye-off` | `32:187` |
| `sparkle` | `32:190` |
| `save` | `32:195` |

### Screens
| Frame | ID |
|---|---|
| `Mobile/home` | `26:162` |
| `Mobile/Login` | `26:250` |
| `Mobile/Signup` | `26:315` |
| `Tablet/home` | `26:413` |
| `Tablet/Login` | `26:512` |
| `Tablet/Signup` | `26:556` |
| `Desktop/home` | `26:619` |
| `Desktop/Login` | `26:709` |
| `Desktop/Signup` | `26:753` |

## Resume prompt

> Continue WWW-76. Read plans/WWW-76-figma-handoff.md, create a Figma session for file m7eIIQHkTklctIoPSosLlR, load the figma-use and figma-generate-library skills, and pick up from "Next steps" step 1.
