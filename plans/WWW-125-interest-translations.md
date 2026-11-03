# WWW-125 — Arabic names for interests and interest groups

Interests and interest groups are admin-managed rows with English names only, so the Arabic UI shows `Technology` among Arabic text. `slug` stays the stored id (links, `?interest=`, Discover, the seeder); the display name splits into `name_en` (the current `name`, renamed) and `name_ar`. The UI shows `name_ar` in Arabic when it's set, else `name_en`.

## Decisions

- **`slug` is the id, names are only labels.** Nothing looks an interest up by name.
- **In Postgres, not `locales/ar`**: admins add interests at any time, and a JSON bundle only changes on deploy.
- **One column per language** (`name_en`, `name_ar`), matching `language_enum`. A third language is another `name_xx` column.
- **`name_en` required, `name_ar` optional**: an admin can add an interest without an Arabic name, and it shows in English.
- **The API returns every name, the frontend picks.** Public endpoints (`GET /interests`, `GET /showcase`) serve visitors, who have no `users.language`, and a language switch needs no refetch.
- **`name` stays in responses for this release** (= `name_en`), so the frontend still deployed during the backend rollout keeps showing names. The next release drops it.

## Database

Migration `041_interest_names` (the down reverses it):

- `interests` and `interest_groups`: `RENAME COLUMN name TO name_en`, then `ADD COLUMN name_ar VARCHAR(100)`.
- The case-insensitive indexes follow the renamed column; rename them to `interests_name_en_lower_key` / `interest_groups_name_en_lower_key`.
- `name_ar` is unique when set: `CREATE UNIQUE INDEX interests_name_ar_key ON interests (name_ar) WHERE name_ar IS NOT NULL`, same for groups.

Mirror it in `schemas/persona.sql`, then `make generate-models`.

## Queries (`interest.sql`, `community.sql`)

- Every select returning an interest or group reads `name_en, name_ar` instead of `name`: `ListActiveInterests` and `RankedActiveInterests` (plus `group_name_en`, `group_name_ar`), `ListAllInterests`, `GetInterest`, `ListInterestGroups`, `GetInterestGroup`, `ListPersonaInterests`, `ListChannelInterests`, `ListCommunityInterests`. `ORDER BY` tiebreaks use `name_en`.
- `CreateInterest`, `UpdateInterest`, `CreateInterestGroup`, `UpdateInterestGroup` take `name_en` and `name_ar` (`sqlc.narg`).
- `SeedInterest` / `SeedInterestGroup` insert `name_en` and `name_ar`. For existing rows, `FillInterestNameAr` / `FillInterestGroupNameAr` set `name_ar` by slug **only where it's NULL**, like `FillInterestGroup`, so an admin's edit is never overwritten.

## Backend

- One shared shape for an interest's names in `handlers/interests`: `name_en`, `name_ar` (null when unset) and, for this release, `name` (= `name_en`). Used by the catalogue, admin and persona responses, and by `channels` / `communities` `build` (list items, single responses, suggestions, showcase) and `GET /channels/:id/interests`.
- Admin create/`PATCH` for interests and groups take `name_en` (rules and codes of today's `name`: `invalid_name`, 409 `name_taken`) and `name_ar` (trimmed, `""` or missing = NULL, at most 100 characters, 400 `invalid_name_ar`, 409 `name_ar_taken`, in the existing conflict mapper). Admin requests no longer accept `name`; the admin page ships with the change.
- GraphQL is unaffected (Discover takes slugs).
- Seeder: each `interestGroups` / `interests` entry gets `NameEn` and `NameAr`; the `Fill…NameAr` calls run after the existing seed calls.

## Frontend

- `types/interest.ts`: `Interest` and `InterestGroup` get `name_en: string` and `name_ar: string | null` in place of `name`; `InterestInput` / `InterestGroupInput` likewise.
- `lib/interests.ts`: `interestName(x)` returns `name_ar` when the language is `ar` and it's set, else `name_en`. Every place that renders an interest or group name uses it: `InterestChips`, `InterestPicker`, `InterestFilter` (chips, group headings, the selected-names line), tiles, create/manage previews, onboarding steps, About blocks.
- Admin `/admin/interests`:
  - Rows and group headers show `interestName`, so an admin in Arabic sees what Arabic users see. A row without an Arabic name gets a muted "No Arabic name" hint, so gaps are visible.
  - `CatalogueDialog`: "English name" (required, the slug still follows it until edited by hand) and "Arabic name" (`dir="rtl"`, optional, helper "Shown when the app is in Arabic. Leave empty to show the English name."), for interests and groups. The preview shows both chips when both are set.
  - Error codes `invalid_name_ar`, `name_ar_taken` in `errors.json` (en + ar). New strings go in `admin` (en + ar).

## Seeded names (to review)

Groups:

| English | Arabic |
|---|---|
| Technology & Professional | التقنية والعمل |
| Entertainment & Media | الترفيه والإعلام |
| Art & Creativity | الفن والإبداع |
| Lifestyle & Wellness | أسلوب الحياة والعافية |
| Food & Travel | الطعام والسفر |
| Sports & Hobbies | الرياضة والهوايات |
| Knowledge & Culture | المعرفة والثقافة |
| Society & Community | المجتمع |

Interests:

| English | Arabic |
|---|---|
| Technology | التقنية |
| Programming | البرمجة |
| Artificial Intelligence | الذكاء الاصطناعي |
| Design | التصميم |
| Science | العلوم |
| Business | الأعمال |
| Startups | الشركات الناشئة |
| Personal Finance | التمويل الشخصي |
| Career & Productivity | المسيرة المهنية والإنتاجية |
| Education | التعليم |
| Movies & TV | الأفلام والمسلسلات |
| Music | الموسيقى |
| Anime & Manga | الأنمي والمانجا |
| Books & Reading | الكتب والقراءة |
| Writing | الكتابة |
| Gaming | ألعاب الفيديو |
| Memes & Humor | الميمز والكوميديا |
| Art | الفن |
| Photography | التصوير الفوتوغرافي |
| Crafts & Handmade | الحِرف والمشغولات اليدوية |
| Fitness | اللياقة البدنية |
| Health & Wellness | الصحة والعافية |
| Fashion | الموضة |
| Beauty | الجمال |
| Home & DIY | المنزل والأعمال اليدوية |
| Gardening | البستنة |
| Parenting | تربية الأطفال |
| Relationships | العلاقات |
| Lifestyle & Daily Life | أسلوب الحياة واليوميات |
| Food | الطعام |
| Cooking | الطبخ |
| Travel | السفر |
| Nature & Outdoors | الطبيعة والرحلات الخلوية |
| Animals | الحيوانات |
| Sports | الرياضة |
| Cars & Motorcycles | السيارات والدراجات النارية |
| Board Games | ألعاب الطاولة |
| Collecting | جمع المقتنيات |
| History | التاريخ |
| Philosophy | الفلسفة |
| Languages & Culture | اللغات والثقافات |
| Egyptian Culture | الثقافة المصرية |
| Arabic Language | اللغة العربية |
| News & Current Events | الأخبار والأحداث الجارية |
| Politics | السياسة |
| Religion & Spirituality | الدين والروحانيات |

## Deploy

Migration 041, backend and frontend back to back (the old frontend reads `name`, which stays for this release); then `app seed` once to fill the Arabic names on existing databases. The release after drops `name` from responses.

## Not changing

Slugs and `?interest=` links, ordering (still admin order, then the English name as tiebreak), emails, GraphQL, user-written content (channel and community names stay as typed).
