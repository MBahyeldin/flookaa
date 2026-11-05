# WWW-90 — Arabic UI translation

WWW-89 put every UI string into `src/i18n/locales/en/*.json`: 13 namespaces, about 650 keys, 40 of them plural. This ticket adds the Arabic bundle, so `ar` joins `LOCALES` and the account settings Language card appears. RTL layout is WWW-91. Both tickets ship in the same release, because choosing Arabic sets `dir="rtl"` from the first load.

## What changes

### Message files (`src/i18n/locales/ar/`)

- There's one `ar/<ns>.json` per English namespace, with the same keys, plus `ar/index.ts` that exports `ar` shaped like `en`.
- Each English plural key gets the six Arabic forms: `_zero`, `_one`, `_two`, `_few`, `_many` and `_other`. i18next picks a form through `Intl.PluralRules("ar")`, so this needs no code. For example, `members_zero` "لا أعضاء", `_one` "عضو واحد", `_two` "عضوان", `_few` "{{n}} أعضاء", `_many` "{{n}} عضوًا", `_other` "{{n}} عضو".
- `<Trans>` strings keep their named tags (`<link>…</link>`) and can put them anywhere in the sentence.
- Where the Figma RTL frames have copy, I reuse it: Channel `27:2`, Community `28:2`, Post `27:1805` and Onboarding 2 `28:1918`. Examples are "نبذة", "القواعد", "الأشخاص", "المشرفون", "اقرأ المزيد", "مشاركة", "منذ ساعتين", "عامة · يمكن لأي شخص القراءة والانضمام" and "اكتب في …". I write the rest in the same voice.
- **Register**: Modern Standard Arabic, short and plain like the English.
- **Brand**: "Flookaa" stays in Latin letters. Figma's RTL sidebar does the same.
- **Typing**: `ar/check.ts` holds a type-only check that `ar` has every key in `en`, ignoring plural suffixes. A missing key then fails `tsc -b`. At runtime, a missing key still falls back to English (`fallbackLng: "en"`).

### Loader (`src/i18n/index.ts`)

- `LOADERS.ar = () => import("./locales/ar")`. Vite splits it into its own chunk, so English users never download it.
- `LOCALES` becomes `["en", "ar"]`. That turns on the Language card (WWW-89) and the browser and `localStorage` detection for Arabic.

### Addressing the reader by gender

Arabic text that speaks to the reader follows the user's own gender, `users.gender` (`male` ذكر / `female` أنثى). There are only those two values.

- **Files:** the base key holds the masculine text. Only where the feminine text differs is there a sibling key with `_female` appended: `save_hint` / `save_hint_female`, and for plurals `members_few` / `members_few_female`.
- **Applying it:** when Arabic loads for a user whose gender is `female`, the loader copies each `_female` value over its base key before adding the bundle. Every `t(...)` and `<Trans>` then comes out right with no change at the call sites. Changing gender in settings, or logging in as someone else, reloads the bundle and remounts the app, the same path a language change takes.
- **No gender known:** visitors, the auth pages, the verify step, and the onboarding step before About you. These use the masculine text, as the Figma copy does.
- **Other people** (actors in notifications, post authors) are written in the generic masculine. Their gender is never sent to other personas.
- **Type check:** the parity check strips `_female` too, and fails on a `_female` key with no base key.
- English has no `_female` keys.

### Digits

Latin digits everywhere. `lib/format.ts` formats Arabic with the locale tag `ar-u-nu-latn` (one `intlLocale(lang)` used by every `Intl` formatter). The Figma RTL frames show Arabic-Indic digits in a few places; those are superseded. Plural selection is unaffected.

### Not translated

As agreed in WWW-89, these stay as they are:

- **Content people write**: names, posts, rules, and the interest catalogue. The catalogue is admin-edited data with no translated column; translating interests would be its own ticket.
- **`/dev/*` pages** and **block `examples`**.
- **Emails**: they're Go templates in `backend/util/*`, not the frontend's i18n, and CLAUDE.md says they stay English. Localising them by `users.language` gets its own ticket if wanted.
- **Backend error text**: the backend sends codes, and the Arabic `errors.json` maps them.

## Backend

- `language_enum` already has `ar` (migration 040), and `PUT /users/language` accepts it.
- **`auth/info` adds `gender`** (`"male"`, `"female"` or null). `GetUserBasicInfo` selects the column, then `make generate-models`. This is the user's own account endpoint, so nothing leaks. It reverses the CLAUDE.md line "never `auth/info`" for gender; date of birth still stays out. `PATCH /users/profile` already answers with the saved gender, so the frontend updates `user.gender` from that answer.

## CLAUDE.md

- **i18n paragraph:** `ar` is shipped; missing keys fail `tsc` through `ar/check.ts`; `_female` keys follow the reader's gender, masculine when it's unknown; Latin digits (`ar-u-nu-latn`); "Flookaa" stays Latin.
- **About you:** `auth/info` returns `gender`, never `date_of_birth`.

## Checking

- `pnpm build` and `pnpm lint` pass, and `tsc -b` passes (the key check covers `.ts` files too).
- In a browser:
  - Switch to العربية in account settings. `<html lang="ar" dir="rtl">` is set, the chunk loads, and the choice survives a reload.
  - Visit the public pages, login and sign-up, the feed, a channel, a community, the post page, notifications and onboarding. No English strings should be left except user content.
  - Check plurals at 0, 1, 2, 3, 11 and 100.
  - Switch the profile gender between ذكر and أنثى and check that the text addressing the reader changes.
- Layout will still look LTR-ish in places. That's WWW-91.
- Deploy the backend (`auth/info` gender) before the frontend.

## Decisions (2026-11-02)

- Latin digits only.
- Text addressing the reader uses the user's gender: male ذكر / female أنثى, the only two options.
