# WWW-95 — Figma: refresh theme demo and RTL frames

Figma only, no code. The work is in "Flookaa v2" (`cB5tjyC1Vpx9aMQsrX0kDY`, Sara's team). WWW-91 already shipped RTL from the LTR frames, so nothing in the code waits on this; the ticket's "needed before WWW-91" no longer applies. The point is that the file stops showing a design we've left behind.

## What's stale (checked 2026-11-04)

| Frames | Page | Problem |
|---|---|---|
| Theme demo: Ember `28:4368`, Plum `28:4455`, Deep Tide Dark `28:4542` | Channel & Community | Old Post Preview |
| RTL: Channel `27:2` / `27:1172`, Post `27:1805` / `27:2311`, Community `28:2` / `28:1241` | RTL | Old Post Preview; the removed aside (desktop); Community has no Latest band (WWW-79) |
| RTL: Onboarding 2 `28:1918` / `28:2062` | RTL | Checked for drift against its source; only rebuilt if it differs |
| `Tilt` `36:529` | Blocks & Posts | Empty, 100 × 100, no children |

## Sources

| RTL or demo frame | Current LTR source |
|---|---|
| Theme demo ×3 | Channel `17:2` |
| Channel | `17:2` / `17:812` |
| Post | `23:1960` / `23:2335` |
| Community | `20:1038` / `20:1903` |
| Onboarding 2 | `26:332` / `26:1402` |

## Decisions

1. **Keep the frame ids.** Each frame stays and its contents are replaced from the source, so the links in Jira and the plans (`27:2`, `28:4368`, …) keep working. Frame heights will change, because the sources are longer now.
2. **Component instances stay linked.** Contents are cloned from the source, not flattened, so they follow later component changes.
3. **Theme demo:** only the `Theme` mode differs from the source (Ember, Plum, Deep Tide Dark), with the same English content.
4. **RTL mirrors what the code mirrors,** using WWW-91 as the reference: sidebar on the right, start and end swapped in rows, directional icons flipped, and user text keeping its own direction. Logos, media and the Cover pattern don't flip.
5. **Arabic copy comes from the real strings.** UI text comes from `front-end/src/i18n/locales/ar/*.json`, so the file matches the app. Sample post content keeps the Arabic already in the old frames where it still fits.
6. **Numbers and brand follow the code:** Latin digits (`ar-u-nu-latn`), and "Flookaa" in Latin letters. The old frames use Arabic digits in places. Generic masculine wording, as for an unknown gender.
7. **No new RTL screens.** Only the frames listed above; settings, manage sheets and the rest aren't added here.

## Steps

1. Replace the three theme demo frames, check one screenshot each.
2. Replace the six Channel, Post and Community RTL frames, one screenshot per frame.
3. Compare Onboarding 2 with its source and rebuild it only if it differs.
4. Delete `Tilt` `36:529`.
5. Record the change in `plans/WWW-77-figma-handoff.md`, and drop the two now-finished items from its open list (lines about the stale frames and `Tilt`).

No AI credits: these frames use the patterns, with no photos.

## Done when

- No frame on the list shows the old Post Preview or the aside.
- The RTL Community frames show the Latest band.
- All frame ids still resolve.
- `Tilt` is gone.
- You've reviewed the screenshots.
