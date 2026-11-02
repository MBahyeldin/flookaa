# WWW-89 — i18n setup: translatable UI and language preference

The app has no i18n. This ticket adds the plumbing so the UI can run in English and Arabic: a library, message files with English as the source, a language preference on the user, `<html lang dir>`, and per-locale formatting. Arabic strings are WWW-90 and RTL layout is WWW-91.

## What exists today

- About 250 `.tsx` files with hard-coded English: roughly 220 JSX text nodes, 280 `title`/`label`/`placeholder`/`aria-label` props, 100 toasts, and local `ERRORS` maps that turn backend codes into sentences.
- Formatting uses the browser locale (`undefined`): `lib/format.ts` `formatCount` (compact numbers plus a hand-picked "one/many" word), `utils/formateDate.ts` (`formatDate`, `formatDateOnly`, `formatRelativeDate`), `components/notifications/time.ts` (`shortTime` builds "now", "2m", "5h" by hand, and `dateGroup` returns English labels), plus a few direct `Intl` calls (countdown block, about block, community picker, rules section, channel people).
- `index.html` hard-codes `<html lang="en">`. There's nothing about language on the user.

## Library

**i18next + react-i18next.**

- Plurals go through `Intl.PluralRules`, so Arabic's six forms (`_zero`, `_one`, `_two`, `_few`, `_many`, `_other`) work with no extra code.
- Messages are plain JSON per namespace. Keys are typed via `CustomTypeOptions` (resources typed from the English JSON), so a wrong key fails `tsc`.
- Non-English locales are loaded lazily with a dynamic `import()`, so English users don't download Arabic.

I'm not using react-intl or Lingui. react-intl's ICU strings are heavier to write by hand. Lingui needs a Babel/SWC macro step in the Vite build.

## Frontend

### Setup (`src/i18n/`)

- `index.ts`:
  - `LOCALES = ["en"] as const` for now; WWW-90 adds `"ar"`.
  - `DIR` map: `ar` → `rtl`, the rest `ltr`.
  - `i18next.init` with `fallbackLng: "en"`, `ns` per feature, `escapeValue: false` (React escapes).
- `resources.d.ts`: `CustomTypeOptions` built from `locales/en/*.json`.
- `locales/en/<ns>.json`, one namespace per area: `common` (buttons, states, nav), `auth`, `onboarding`, `settings`, `channels`, `communities`, `personas`, `posts`, `blocks`, `editor`, `notifications`, `admin`, `errors`.
- `useLanguage()` hook: current language plus `setLanguage(lang)`.
- On every language change, an effect sets `document.documentElement.lang` and `.dir`. `index.html` keeps `lang="en"` as the first paint.
- A language change remounts the app below the providers (`App` keyed on the language), so strings built outside React refresh. Module-level objects that hold text (the static `Form`s, block field lists) are built once per language with `perLanguage`, and block titles are getters.
- `main.tsx` imports `@/i18n` before `App`. There's no Suspense: English is bundled, and switching awaits the lazy import before `changeLanguage`.

### Which language is used

1. A logged-in user's `language` from `auth/info`, when set.
2. Otherwise `localStorage["language"]` (wrapped in try/catch).
3. Otherwise the first `navigator.languages` entry whose base tag is in `LOCALES`.
4. Otherwise `en`.

Logging in applies the user's stored language. If the user has none, the language in use is saved for them once, so the next device gets it too.

### Formatting (`lib/format.ts`, one place)

- `formatNumber(n)`, `formatCompact(n)` ("1.2k"), `formatDate`, `formatDateOnly`, `formatRelativeDate` and `shortTime` all take the locale from `i18n.language`. `Intl` formatters are cached per locale.
- `utils/formateDate.ts` and `notifications/time.ts` move into it. Every direct `Intl`/`toLocale*` call goes through it.
- `formatCount(n, one, many)` goes away. Callers use plural keys, e.g. `t("channels:followers", { count, n: formatCompact(count) })` with `followers_one` / `followers_other` in English.
- `shortTime`'s "now", "2m" and "5h" become `common` keys. `dateGroup` returns ids (`today` / `week` / `earlier`) that the list labels through `t`.
- Whether Arabic uses Arabic-Indic or Latin digits is decided in WWW-90 by the locale tag (`ar` vs `ar-u-nu-latn`). The helpers already take whatever `LOCALES` says.

### Backend error codes

- Codes stay codes. `errors.json` maps each code the UI shows (`slug_taken`, `invalid_min_age`, `weak_password`…) to a message.
- `lib/errors.ts` `errorMessage(code, fallback?)` replaces each component's local `ERRORS` map, with a generic "Something went wrong" for unknown codes.

### Strings

- Every user-facing string goes to its namespace through `useTranslation(ns)` / `t`. This covers text, `aria-label`, `title`, placeholders, toasts, `SECTIONS` labels, zod messages (built inside the component or keyed by code), and `describe.ts` for notifications.
- Sentences with links or bold parts use `<Trans>` with named components, never concatenation.
- Not translated:
  - user content (names, posts, rules, interest names, which come from the catalogue);
  - `/dev/*` pages;
  - block `examples`, which are sample posts;
  - `console` messages.
- `GENDER_LABELS` and the similar label maps become `t` lookups.

### Language switch (from WWW-97)

- A **Language** card in account settings, between Password and Appearance: a `SegmentedControl` ("English" / "العربية", each written in its own language) that applies at once, with no Save.
- Logged in: `PUT /users/language`, then `changeLanguage`. Logged out: `localStorage` only.
- **Hidden while `LOCALES` has one entry**, the same as other controls that don't apply yet. It shows up with WWW-90. The auth pages get no switch (Figma has none); a visitor gets the browser language.

## Backend

- **Migration 040** `user_language`: `CREATE TYPE language_enum AS ENUM ('en', 'ar')` and `users.language language_enum NULL`. NULL means "never chosen", so the frontend uses the browser's language. The down migration drops the column and the type. Then `make generate-models`.
- `auth/info` adds `language` (string or null). It's account data, and `auth/info` is the user's own.
- **`PUT /api/v1/users/language`** `{language}`, User tier, answers `{language}` or 400 `invalid_language`. This is its own endpoint rather than `PATCH /users/profile`, because the switch applies at once and `UpdateUser` rewrites every column.
- `POST auth/register` takes an optional `language` (the one the visitor is using). An invalid value is ignored, not a 400, so sign-up never fails over it. Google sign-up leaves it NULL; the "save once" rule above fills it in.
- Emails stay English. Localising them (the user's `language` in `backend/util/*` mail templates) gets its own ticket if wanted.

## CLAUDE.md

- Frontend conventions: i18n in `src/i18n`, namespaces, the `t`/`<Trans>` rule, `lib/format.ts` as the only place for `Intl`, `errorMessage`.
- Auth section: `users.language` and `PUT /users/language`.

## Scope

Every UI string moves in this ticket (about 1,000 strings across about 250 files), as the ticket text says. It isn't split out.

## Not changing

There's no Arabic text (WWW-90) and no RTL layout or logical-property sweep (WWW-91). Arabic picks up `dir="rtl"` once it's in `LOCALES`, so WWW-90 and WWW-91 ship together. No server-side locale negotiation (`Accept-Language`).
