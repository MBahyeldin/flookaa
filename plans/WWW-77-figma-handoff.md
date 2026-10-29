# WWW-77 — Figma build: handoff

Progress and IDs for the "Flookaa v2" build. Plan: `plans/WWW-77-redesign.md`.

## File

- **Flookaa v2**: https://www.figma.com/design/cB5tjyC1Vpx9aMQsrX0kDY
- In Sara's team (`team::1694463309195621194`, student tier), as the user asked on 2026-10-21. The Figma MCP is connected as that account.
- Start each session with `create_session` (fileKey above), then load `skill://figma/figma-use/SKILL.md` and `skill://figma/figma-generate-library/SKILL.md` (plus `figma-generate-design` for screens).
- Fonts: Readex Pro (Regular, Medium, SemiBold, Light, Bold, ExtraLight). IBM Plex Sans Arabic is not available.

## Done

- 2026-10-21: pages, variables (Theme 40 colours × 7 modes, Primitives, Breakpoint × 3 modes), 16 text styles, `Shadow/sm`.
- 2026-10-21: Foundations page specimen (`4:2`): palette columns per mode (`4:10` … `4:232`), type scale in EN + AR, radius and shadow.
- 2026-10-21: Components page (`8:2`): 52 lucide icons, Button (35 variants), Icon Button, Chip, Tag, Form Field, Section Nav (+ Tab), Avatar, Logo, Count Badge, Sidebar/Item, Sidebar (Expanded/Collapsed), Mobile Header, Tooltip, Menu (+ Item), Toast, Skeleton (+ Post), Empty State, Error State.
- 2026-10-21: Patterns page (`13:35`): Cover (4 generated, theme-bound patterns), Hero (Channel/Community/Persona × Desktop/Mobile), Section Header, Tile (Channel/Community × None/Joined/Pending), People Strip, About Block, Post Preview (Text/Titled/Image), Comment, Post Body (article), Masonry Tile, Composer (Collapsed/Expanded), Interest Filter.
- 2026-10-21: Screens: Channel (`17:2` / `17:518` / `17:812`, content in Forest), Community (`20:1038` / `20:1517` / `20:1903`, content in Slate, tiles per channel palette), Feed (`21:2` / `21:897` / `21:1402`), Feed empty (`21:398`, `21:1557`), Discover masonry (`21:490` / `21:1117` / `21:1588`).
- 2026-10-21: Post page (`23:1960` / `23:2166` / `23:2335`), Profile (`24:2` / `24:693` / `24:943`), Profile locked (`24:361`, `24:1149`), Personas (`24:505`, `24:1230`), Visitor home (`25:2` / `25:246` / `25:480`), Log in (`25:157` / `25:391` / `25:610`), Sign up (`25:199` / `25:433` / `25:643`), Onboarding 1–5 (desktop `26:286`…`26:793`, tablet `26:854`…`26:1303`, mobile `26:1360`…`26:1809`), RTL (`27:2`, `27:1172`, `27:1805`, `27:2311`, `28:2`, `28:1241`, `28:1918`, `28:2062`), Theme demo (`28:4368`, `28:4455`, `28:4542`), Cover (`28:8838`).
- 2026-10-21: Verified (see the plan's implementation notes). WWW-77 moved to In Review.
- 2026-10-21 (QA revision 1): page `Blocks & Posts` (`32:6`, root `32:8`), `radius/2xl` (`VariableID:32:7`). Blocks: Callout `32:63`, Quote `32:64`, Steps `32:78`, Checklist `32:116`, Divider `32:164`, Accordion `33:28`, Spoiler `33:95`, Image `33:128`, Gallery `33:187`, Voice note `33:188`, Countdown `33:268`. Post concepts: Bubble `34:117`, Spotlight `34:180`, Poster `34:226`, Scrapbook `34:257`, Stack `34:312`, Peek `34:393`; Reactions `34:104`; showcase section `34:425`.
- 2026-10-21 (QA revision 2): unified `Post` set `36:748` (Version: Thread `35:305`, Spine `35:409`, Bubbles `35:518`, Canvas `36:506`, Strip `36:606`) in section `36:725`; Revision 1 concepts relabelled superseded.
- 2026-10-21 (QA revision 3): Feed uses `Post` Spine; Channel and Profile use `Post` Canvas, at all three widths. Countdown tiles and post images are responsive in the main components.
- 2026-10-21 (QA revision 4): asides removed from Channel (`17:425`) and Profile (`24:335`, `24:919`, `24:1125`); Posts columns fill the body (1064 px on desktop). Same for the theme demo asides (`28:4380`, `28:4467`, `28:4554`) and the Feed's Suggested channels aside (`21:311`). Every decorative rotation set to 0 on Blocks & Posts (Canvas header and photo, Thread/Bubbles images, gallery carousel, callout and poster stickers, Scrapbook, Stack); no tilts left on any page.

- 2026-10-21 (QA revision 5): overlap pass. Canvas footer row `44:904` (Read more + Reactions in flow), callout stickers moved into each tone's `Text`, carousel cards spaced, Interest Filter chips row `44:8347` (spacer `16:512` removed), text overflows fixed on Discover, Personas, Visitor home and Onboarding 5 (mobile/tablet), mobile post reactions rows `23:2390` / `27:2323`, collapsed sidebar spacer `11:218`.

- 2026-10-22 (WWW-118 §1 auth states): component `Code Input` (`65:1343`, State Empty/Filled/Error/Disabled) in section `65:1286` on Components. Public & Onboarding: Log in · Error `66:1119`, · Loading `66:1165`, · From a link `66:1221`, Mobile · Error `66:1239`; Sign up · Error `66:1276`, · Loading `66:1327`, Mobile · Error `66:1378`; Verify email `66:1420` / `66:1480` / `66:1540`, · Wrong code `66:1591`, · Expired `66:1651`. Profile & Personas: Select persona `66:8960` / `66:9131`. Mobile Personas rows (`24:1230`) now wrap instead of clipping.
- 2026-10-22 (WWW-118 §2 comments): icons `Icon/trash-2` `69:504`, `Icon/send` `69:508`. Patterns: `Comment` is now a set `70:602` (Level 1/2 × State Default/Liked; props Name, Time, Body, Reply to, Likes, Show reply-to, Show menu; the old `16:327` is Level=1 Default, existing instances kept their text), `Reply Box` `71:427` (Empty/Typing), `Thread Toggle` `71:536` (Collapsed/Expanded/Loading). Channel & Community: Post · Comment thread `72:3753` / `72:4225` / `72:4619`, Comment states board `72:9983`. User decision: deleting a comment removes its replies too (today's behaviour); no removed-comment placeholder.
- 2026-10-22 (WWW-118 §3 persona surfaces): Patterns: `Person Row` `76:436` (Request/Follower/Connected; props Name, Handle), `Persona Card` `76:506` (Full/Locked/Anonymous), `Banner` `76:507` (Title, Body), `Persona Switcher` `76:527`. Profile & Personas: Followers sheet · Requests `78:1476`, · Followers `78:1682`, Mobile `78:1909`; Profile · Invited you `78:2044`; Profile · Connected `78:2200`; Follow link · Request `79:2985`, · Pending `79:3116`, · Invalid `79:3252`, Mobile `79:3394`; Personas · Switcher open `79:3457`. Channel & Community: Post · Persona card `79:11537` (desktop popover) / `79:11841` (mobile sheet, Locked).
- 2026-10-22 (WWW-118 §4–5): Components: `Dialog` `83:214` (Tone Default/Destructive; Title, Body); `Sidebar` (`11:232`) gained Collapse/Expand toggles (`panel-left`). Patterns: `Block Menu` `83:11913` (registry order). Feed & Discovery: Channels `84:2183` / `84:2540` / `84:2827`, Communities `84:3010` / `84:3363` / `84:3650`, Channels · Loading `84:3833`, · Empty filter `84:4023`, · Error `84:4176`, Feed · Sidebar collapsed `84:4335`. Channel & Community: Channel · Composer writing `86:16057`, Composer states `87:7783` (Preview `87:7844`, invalid block `87:7956`), Mobile · Insert block `86:16681`, Community · Rules dialog `86:16808` / `86:16857`, Channel · Leave confirm `86:16903`, Channel · Sidebar collapsed `86:16926`, Post · Sidebar collapsed `86:17076`. Public & Onboarding: Not found `84:14476`, · Logged out `84:14575`, Mobile `84:14616`. Blocks & Posts: Blocks gallery `86:15583` / `87:17364`.
- 2026-10-27 (WWW-96 notifications): Components: section `Notifications` `104:189` with `Notification Row` `104:266` (State Unread/Read/Hover × Lead Actor/Entity; prop `Kind icon`) and `Notification Popover` `108:448` (State List `108:201` / All read `108:284` / Loading `108:365` / Empty `108:391` / Error `108:420`). New page `Notifications & Settings` `109:6`: Notifications `109:7` / `109:17880` / `109:18049`, popover open `109:18370` / `109:18381` / `109:18392`, Desktop · Loading `109:19747`, · Empty `109:19885`, · Error `109:20015`, · Load more failed `109:20142`, Every kind `111:2522`, Deep Tide Dark `111:20143`, Forest `111:20175`.
- 2026-10-27 (WWW-97 settings): Components: section `Settings` `119:330` with `Switch` `119:335` (On/Off), `Segmented Control` `119:346` (Selected First/Second; Option 1, Option 2), `Radio Card` `119:368` (Default/Selected; Title, Body, Icon), `Theme Swatch` `119:381` (Default/Selected; Name; set the instance's Theme mode), `Cover Option` `119:398` (Default/Selected; Name; nested Cover Pattern), `Checklist Rule` `119:413` (Unmet/Met/Failed; Label). Page `Notifications & Settings`: Account `122:3144` / `122:3405` / `122:3617`; Persona (content in Forest) `123:3492` / `123:4053` / `123:4483`, · Deep Tide Dark `126:5538`, · Ember `126:5842`; Account settings · States `124:4305`; Persona settings · States `125:4418`; Change email dialog · Steps `126:4705`, open over the page `126:4822` (desktop) / `126:4915` (mobile); Settings · Loading `126:5232`, · Error `126:5384`. The followers sheet stays the WWW-118 frames (`78:1476`, `78:1682`, `78:1909`).
- 2026-10-28 (WWW-98 create forms): Patterns: `Community Option` `130:17001` (State Default `130:16985` / Selected `130:16993`; props `Name#130:0`, `Meta#130:3`). Channel & Community: Create channel `129:13714` / `130:14421` / `130:14656`; Create community `130:8378` / `130:14894` / `130:15116`; Create forms · States `130:16282`; Create channel · Community picker `131:9470` (desktop dialog) / `131:9641` (mobile sheet); Community picker · States `131:9804` (Loading, Empty, No results); Create channel · Standalone, Ember picked `131:10334`; · Deep Tide Dark `131:10741`.
- 2026-10-29 (WWW-99 manage + members sheets): Patterns: `Person Row` gains `Type=Member` `136:19501` (role `Tag` + `⋯`; prop `Show role#136:2`); `Channel Request Row` `136:19531` (props `Name#136:12`, `Meta#136:13`). Channel & Community: Channel · Manage `136:19539` (desktop) / `138:15694` (mobile) / · Deep Tide Dark `138:15986`; Community · Manage `136:20382` / `138:16849`; Channel · Members `137:11655`, · Requests `137:14152`; Community · Members · Row menu `137:11863` / `138:15861` (mobile); Community · Members · Channel requests `137:14747`; Manage & members · States `138:13726` (empty/loading/error, Community card None/Pending/Rejected, field errors, visibility warnings, saving, toast, six confirm dialogs, Ember look).

## Next steps

1. User review. The theme demo (`28:4368`/`28:4455`/`28:4542`) and RTL frames still show the old Post Preview (RTL also the aside); refresh them if the chosen versions stick.
2. Blocks & Posts was reorganised outside these sessions (new section ids `42:*`, superseded concepts removed). An empty frame `Tilt` (`36:529`) sits at the page origin.
3. Photo covers only if the user approves spending Figma AI credits (`generate_image`).

## Gotchas

- Size overrides on layers two instances deep are ignored; make the main component responsive instead (FILL + min/max width).

- The MCP screenshot renderer leaves some emoji blank; they render in the Figma app.
- `textAutoResize = 'WIDTH_AND_HEIGHT'` on a FILL text centres it and blocks wrapping; use `'HEIGHT'`.
- `resize()` on an auto-layout frame sets its primary axis to FIXED; set `primaryAxisSizingMode = 'AUTO'` again after.

- Component TEXT properties make every variant show the default text; set per-instance values.
- A child with `layoutGrow = 1` inside a hug-height parent collapses. Use `primaryAxisAlignItems = 'SPACE_BETWEEN'` on the parent instead (Tile).
- Covers: wrap the 4:1 Cover instance in a clipping frame and size it to `max(W, H*4)` so it crops instead of stretching.
- Nested layers inside an instance can't take x/y overrides; rely on constraints (Cover: CENTER) and resize the parent instead.
- `findAll(TEXT)` on a tile also returns text inside nested instances (logo initials); filter `parent.type !== 'INSTANCE'`.
- Hover tint rectangles must be resized to the button after its auto width settles.

- `figma.createAutoLayout()` frames get a default white fill. Clear `fills` on wrappers that shouldn't have one (or bind them).
- `base/scrim` is opaque; put the 50% on the layer's `opacity`, not on the paint.
- A bound paint keeps the placeholder `color` you pass to `setBoundVariableForPaint` until the file re-resolves it (screenshots and frames without an explicit mode show it). Pass the variable's Deep Tide Light value as the placeholder. To add paint opacity, JSON-copy the bound paint and set `opacity` (spreading the frozen paint loses the binding).
- A frame's Theme mode is set with `setExplicitVariableModeForCollection(themeCollection, modeId)`; children inherit it.
- Text styles bind `fontSize` to `Breakpoint` variables; a frame set to a Breakpoint mode resizes its type.

## IDs

### Pages
| Page | ID |
|---|---|
| `Cover` | `0:1` |
| `Foundations` | `3:2` |
| `Components` | `3:3` |
| `Patterns` | `3:4` |
| `Channel & Community` | `3:5` |
| `Feed & Discovery` | `3:6` |
| `Profile & Personas` | `3:7` |
| `Public & Onboarding` | `3:8` |
| `RTL` | `3:9` |
| `Notifications & Settings` | `109:6` |

### Collections and modes
| Collection | ID |
|---|---|
| `Theme` | `VariableCollectionId:3:10` |
| `Breakpoint` | `VariableCollectionId:3:70` |
| `Primitives` | `VariableCollectionId:3:51` |

| Mode | ID |
|---|---|
| `Theme / Deep Tide Light` | `3:0` |
| `Theme / Deep Tide Dark` | `3:1` |
| `Theme / Forest` | `3:2` |
| `Theme / Ember` | `3:3` |
| `Theme / Plum` | `3:4` |
| `Theme / Rose` | `3:5` |
| `Theme / Slate` | `3:6` |
| `Breakpoint / Mobile` | `3:8` |
| `Breakpoint / Tablet` | `3:9` |
| `Breakpoint / Desktop` | `3:10` |

### Variables
| Variable | ID |
|---|---|
| `base/background` | `VariableID:3:11` |
| `base/foreground` | `VariableID:3:12` |
| `base/card` | `VariableID:3:13` |
| `base/card-foreground` | `VariableID:3:14` |
| `base/popover` | `VariableID:3:15` |
| `base/popover-foreground` | `VariableID:3:16` |
| `base/border` | `VariableID:3:17` |
| `base/input` | `VariableID:3:18` |
| `base/primary` | `VariableID:3:19` |
| `base/primary-foreground` | `VariableID:3:20` |
| `base/secondary` | `VariableID:3:21` |
| `base/secondary-foreground` | `VariableID:3:22` |
| `base/muted` | `VariableID:3:23` |
| `base/muted-foreground` | `VariableID:3:24` |
| `base/accent` | `VariableID:3:25` |
| `base/accent-foreground` | `VariableID:3:26` |
| `base/ring` | `VariableID:3:27` |
| `base/scrim` | `VariableID:3:28` |
| `base/surface-sunken` | `VariableID:3:29` |
| `base/hero-overlay` | `VariableID:3:30` |
| `sidebar/sidebar` | `VariableID:3:31` |
| `sidebar/sidebar-solid` | `VariableID:3:32` |
| `sidebar/sidebar-foreground` | `VariableID:3:33` |
| `sidebar/sidebar-primary` | `VariableID:3:34` |
| `sidebar/sidebar-primary-foreground` | `VariableID:3:35` |
| `sidebar/sidebar-accent` | `VariableID:3:36` |
| `sidebar/sidebar-accent-foreground` | `VariableID:3:37` |
| `sidebar/sidebar-border` | `VariableID:3:38` |
| `sidebar/sidebar-ring` | `VariableID:3:39` |
| `status/destructive` | `VariableID:3:40` |
| `status/destructive-foreground` | `VariableID:3:41` |
| `status/success` | `VariableID:3:42` |
| `status/success-foreground` | `VariableID:3:43` |
| `status/warning` | `VariableID:3:44` |
| `status/warning-foreground` | `VariableID:3:45` |
| `chart/chart-1` | `VariableID:3:46` |
| `chart/chart-2` | `VariableID:3:47` |
| `chart/chart-3` | `VariableID:3:48` |
| `chart/chart-4` | `VariableID:3:49` |
| `chart/chart-5` | `VariableID:3:50` |
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
| `spacing/20` | `VariableID:3:68` |
| `spacing/24` | `VariableID:3:69` |
| `type/display` | `VariableID:3:71` |
| `type/h1` | `VariableID:3:72` |
| `type/h2` | `VariableID:3:73` |
| `type/h3` | `VariableID:3:74` |
| `type/h4` | `VariableID:3:75` |
| `type/article` | `VariableID:3:76` |
| `type/lead` | `VariableID:3:77` |
| `layout/gutter` | `VariableID:3:78` |
| `layout/section-gap` | `VariableID:3:79` |
| `layout/frame-width` | `VariableID:3:80` |

### Text styles
| Style | ID |
|---|---|
| `Display` | `S:10df9d8e190813a50513183f3285eb6cb630cd24,` |
| `Heading/H1` | `S:88c34265b47b6b63aa2a6c779cb7c04d4845a6ca,` |
| `Heading/H2` | `S:9d60e155beaae9412810eb504d7092231d7e2cde,` |
| `Heading/H3` | `S:93896c07b1c0bab901659cb2c3b6bfd636ee1c17,` |
| `Heading/H4` | `S:82fbbcb87a459cf0117017a88c5d7992a02e777e,` |
| `Article/Lead` | `S:757950d8aad5548e97cbd546a5ed9acbb6ca86ce,` |
| `Article/Body` | `S:7a1dbacddef8759c45ca4a7e87a03822f7f9111d,` |
| `Body/Base` | `S:8719c782196903c0eda1764c4e3ea2ed6441af28,` |
| `Body/Base Medium` | `S:83c05011610d13284d49ec340efd83e4a5f66f00,` |
| `Body/Small` | `S:f93e6ed78dbaba3ef0d589beec6ef6c0f218313d,` |
| `Body/Small Medium` | `S:5688948b3b98c2ab02d23c7041a2f3837f57ec50,` |
| `Body/XS` | `S:14ebf3b176dc4de48d9ebd4068ea420ea3c422cb,` |
| `Body/XS Medium` | `S:c552282c8ec9cac3774150f3677c01d81807955a,` |
| `UI/Label` | `S:6762ab8404633943f4d8723a4343628e86819315,` |
| `UI/Button` | `S:7dd2c32f140365e425fae89562a170050d2cae3a,` |
| `UI/Overline` | `S:8d7843872081f3db6f39c9ab40b56a6d6e76015a,` |

### Effect styles
| Style | ID |
|---|---|
| `Shadow/sm` | `S:db8363ed6367c82887010a4cf3e48d212d0ad43c,` |

### Components
| Component | ID |
|---|---|
| `Button` | `9:191` |
| `Icon Button` | `9:210` |
| `Chip` | `9:227` |
| `Tag` | `9:228` |
| `Form Field` | `10:75` |
| `Section Nav/Tab` | `10:87` |
| `Section Nav` | `10:88` |
| `Avatar` | `10:126` |
| `Logo` | `10:135` |
| `Count Badge` | `11:38` |
| `Sidebar/Item` | `11:67` |
| `Sidebar` | `11:232` |
| `Mobile Header` | `11:233` |
| `Tooltip` | `11:255` |
| `Menu/Item` | `11:257` |
| `Menu` | `11:262` |
| `Toast` | `11:288` |
| `Skeleton` | `12:168` |
| `Skeleton/Post` | `12:169` |
| `Empty State` | `12:178` |
| `Error State` | `12:192` |
| `Notification Row` | `104:266` |
| `Notification Popover` | `108:448` |
| `Switch` | `119:335` |
| `Segmented Control` | `119:346` |
| `Radio Card` | `119:368` |
| `Theme Swatch` | `119:381` |
| `Cover Option` | `119:398` |
| `Checklist Rule` | `119:413` |

### Patterns
| Pattern | ID |
|---|---|
| `Patterns root` | `13:35` |
| `Cover` | `13:36` |
| `Hero` | `14:257` |
| `Section Header` | `15:115` |
| `Tile` | `15:309` |
| `People Strip` | `15:310` |
| `About Block` | `15:334` |
| `Post Preview` | `16:326` |
| `Comment` | `16:327` |
| `Post Body` | `16:338` |
| `Masonry Tile` | `16:401` |
| `Composer` | `16:496` |
| `Interest Filter` | `16:497` |
| `Community Option` | `130:17001` |
| `Channel Request Row` | `136:19531` |

### Variants
| Variant | ID |
|---|---|
| `Cover / Horizon` | `13:7` |
| `Cover / Waves` | `13:14` |
| `Cover / Hills` | `13:21` |
| `Cover / Stripes` | `13:34` |
| `Hero / Channel/Desktop` | `14:2` |
| `Hero / Channel/Mobile` | `14:53` |
| `Hero / Community/Desktop` | `14:97` |
| `Hero / Community/Mobile` | `14:141` |
| `Hero / Persona/Desktop` | `14:185` |
| `Hero / Persona/Mobile` | `14:221` |

### Component property keys
| Component | Keys |
|---|---|
| `Button` | `{"Label": "Label#9:0", "Show icon": "Show icon#9:36", "Icon": "Icon#9:72"}` |
| `Icon Button` | `{"Icon": "Icon#9:108"}` |
| `Chip` | `{"Label": "Label#9:115", "Emoji": "Emoji#9:121"}` |
| `Tag` | `{"Label": "Label#9:127", "Show icon": "Show icon#9:128", "Icon": "Icon#9:129"}` |
| `Count Badge` | `{"Count": "Count#11:0"}` |
| `Sidebar/Item` | `{"Label": "Label#11:1", "Icon": "Icon#11:6", "Show badge": "Show badge#11:11"}` |
| `Segmented Control` | `{"Option 1": "Option 1#119:0", "Option 2": "Option 2#119:3"}` |
| `Radio Card` | `{"Title": "Title#119:6", "Body": "Body#119:9", "Icon": "Icon#119:12"}` |
| `Theme Swatch` | `{"Name": "Name#119:15"}` |
| `Cover Option` | `{"Name": "Name#119:18"}` |
| `Checklist Rule` | `{"Label": "Label#119:21"}` |
| `Tooltip` | `{"Text": "Text#11:16"}` |
| `Menu/Item` | `{"Label": "Label#11:17", "Icon": "Icon#11:18"}` |
| `Toast` | `{"Message": "Message#11:19"}` |
| `Form Field` | `{"Label": "Label#10:0", "Value": "Value#10:9", "Helper": "Helper#10:18", "Show helper": "Show helper#10:27"}` |
| `Section Nav/Tab` | `{"Label": "Label#10:36"}` |
| `Avatar` | `{"Initials": "Initials#10:39"}` |
| `Logo` | `{"Initials": "Initials#10:50"}` |
| `Empty State` | `{"Title": "Title#12:0", "Body": "Body#12:1", "Icon": "Icon#12:2", "Show action": "Show action#12:3"}` |
| `Error State` | `{"Title": "Title#12:4", "Body": "Body#12:5", "Icon": "Icon#12:6", "Show action": "Show action#12:7"}` |
| `Hero` | `{"Name": "Name#14:0", "Tagline": "Tagline#14:7", "Facts": "Facts#14:14", "Cover": "Cover#14:21"}` |
| `Section Header` | `{"Overline": "Overline#15:0", "Title": "Title#15:1", "Show link": "Show link#15:2"}` |
| `Tile` | `{"Name": "Name#15:3", "Meta": "Meta#15:10", "Description": "Description#15:17", "Facts": "Facts#15:24"}` |
| `People Strip` | `{"More": "More#15:31"}` |
| `Notification Row` | `{"Kind icon": "Kind icon#104:0"}` (Text and Meta are plain layers: set `characters`, then SemiBold on the actor range) |

### Icons
| Icon | ID |
|---|---|
| `house` | `8:8` |
| `inbox` | `8:12` |
| `users` | `8:18` |
| `rss` | `8:23` |
| `compass` | `8:27` |
| `search` | `8:31` |
| `bell` | `8:35` |
| `settings` | `8:39` |
| `shield-check` | `8:43` |
| `user-round` | `8:47` |
| `panel-left` | `8:51` |
| `plus` | `8:55` |
| `x` | `8:59` |
| `check` | `8:62` |
| `heart` | `8:65` |
| `message-circle` | `8:68` |
| `share-2` | `8:75` |
| `ellipsis` | `8:80` |
| `lock` | `8:84` |
| `globe` | `8:89` |
| `user-plus` | `8:95` |
| `arrow-right` | `8:99` |
| `arrow-left` | `8:103` |
| `chevron-down` | `8:106` |
| `chevron-right` | `8:109` |
| `chevron-left` | `8:112` |
| `image` | `8:117` |
| `mic` | `8:122` |
| `upload` | `8:127` |
| `sparkles` | `8:133` |
| `pen-line` | `8:137` |
| `clock` | `8:141` |
| `calendar` | `8:147` |
| `eye` | `8:151` |
| `eye-off` | `8:157` |
| `sliders-horizontal` | `8:168` |
| `log-out` | `8:173` |
| `sun-moon` | `8:180` |
| `layout-grid` | `8:186` |
| `book-open` | `8:190` |
| `pin` | `8:194` |
| `scroll-text` | `8:200` |
| `info` | `8:205` |
| `triangle-alert` | `8:210` |
| `circle-alert` | `8:215` |
| `refresh-cw` | `8:221` |
| `link-2` | `8:226` |
| `sailboat` | `8:231` |
| `hash` | `8:237` |
| `list` | `8:245` |
| `bookmark` | `8:248` |
| `user-round-check` | `8:253` |

## Resume prompt

> Continue WWW-77. Read plans/WWW-77-figma-handoff.md, create a Figma session for file cB5tjyC1Vpx9aMQsrX0kDY, load the figma-use and figma-generate-library skills, and pick up from "Next steps".
