# WWW-114 — Visitor home v2

Epic WWW-86. Frontend only. Same route (`/` when logged out, `pages/home/visitor.tsx`), new layout; replaces the "Coming soon" page.

Design: "Flookaa v2", Visitor home `25:2` (Desktop) / `25:246` (Tablet) / `25:480` (Mobile). Pulled read-only on 2026-10-25.

## What the frames actually hold

The ticket mentions a sailboat illustration; the frames don't have one. The only sailboat is the lucide `Sailboat` icon in the brand mark (header and footer). The "showcase of community heroes" is three compact cards (cover band 96px, `Logo` md, name, facts line, small Join), each in its own palette, stepped right by 32px per card. No asset to export: covers are our `components/cover` patterns (`hills`, `stripes`, `waves`) and icons are lucide.

## Page

Top to bottom, on `bg-background`, content padded `px-4 md:px-6 lg:px-20` (Figma: 24 / 24 / 80 at 1440):

1. **Public header**: brand (`Sailboat` 22px in `text-primary` + "Flookaa" semibold 20), then ghost buttons Discover · Communities · Log in and a primary Sign up. Mobile: brand, Log in, Sign up only.
2. **Hero** (`pt-20 pb-24` desktop, two columns from `md`, stacked on mobile):
   - Pitch: overline "Clubs, channels, communities" (`text-overline text-primary`), `text-display` "Follow a facet, not a person.", `text-lead` muted paragraph, then primary `lg` "Create your first persona" → `/sign-up` and outline `lg` "Explore communities". Mobile shows only the primary button, as in Figma.
   - Showcase: three `ShowcaseCard`s, indented `0 / pl-8 / pl-16`, gap 16. Each wraps itself in its `data-theme` and uses `Cover` + `Logo`. Cards here are an overlay-like stack in Figma (`shadow-sm`), which is the one shadow the token rules allow.
3. **How it works** band (`bg-surface-sunken`, `p-20` desktop): `h2` "How it works", then three columns from `lg` (tablet and mobile stack them, per `25:246`) of icon chip (44px circle, `bg-card` + border, lucide `UserRound` / `Users` / `ShieldCheck` in `text-primary`), `h3` title and muted body text, copy as in Figma.
4. **Footer**: brand (18px icon, 16px text) and "© 2026 Flookaa" (`text-xs` muted). The year comes from `new Date()`.

Type uses the existing tokens (`text-display`, `text-lead`, `text-overline`, `h2`, `h3`), so the Breakpoint sizes come for free.

## Header and footer

`navbar/header` is also used by `verify-email` and `OnboardingShell` (`onlyLogo`) and by the default layout on `/login` and `/sign-up`. It gets the new brand (icon + wordmark, `components/brand`, replacing the PNG logos) and the new buttons; `onlyLogo` keeps working. It stops being `fixed` with a blurred background: Figma's header scrolls with the page. Login/sign-up's own split layout is WWW-115; this ticket only changes what they inherit from the header.

`ToggleTheme` is not in Figma. Proposal: keep it as an `icon-sm` ghost button after Sign up (desktop/tablet) so visitors can still switch to dark; say if you'd rather drop it and follow the system setting.

The empty `navbar/footer/index.tsx` becomes the footer, rendered by `DefaultLayout` under every public page except `/login` and `/sign-up` (WWW-115 decides theirs).

## Decisions (2026-10-25)

Plan approved with the recommended options: static showcase, `ToggleTheme` kept. Review round 2: no "clubs" in the copy (Flookaa has channels and communities only), and the showcase uses **real data**: `GET /api/v1/showcase` (public tier, outside the persona-gated `/communities` group) answers `{communities: [{slug, name, thumbnail, theme, cover_pattern, members_count, channels_count}]}`, up to 3 public, live communities with `min_age = 13` (visitors have no age), most live members first, then id; counts recounted like `ListCommunityStats` / `ListCommunities`. No ids, owners or anything private. The page shows 3 skeleton cards while loading and leaves the showcase out when the list is empty or the call fails (it's decoration, not a list). Join still goes to `/sign-up`. The seeder now gives an existing seeded community its seed theme and cover when it still has migration 034's defaults (`tide` + `horizon`), so databases seeded before WWW-80 don't show three identical cards; a look a manager chose is never touched. Review round: Discover and Communities removed from the header (visitors get no links to pages that need a persona), and the hero's secondary button became "How it works", jumping to that band. The brand mark stays the lucide sailboat until WWW-121 redraws the old logo.

## Options considered

1. **Showcase data.** (a) **Static** (recommended): three illustrative cards in the page, Figma's names and facts, no member counts invented about real communities. Join and the card go to `/sign-up`. No backend, nothing can leak. (b) **Live**: a new public endpoint `GET /api/v1/communities/featured` returning up to 3 public, live communities with `min_age = 13`, their name, theme, cover, logo, recounted `members_count` and first interest. Visitors have no date of birth, so `persona_meets_min_age` can't run; the endpoint would only ever list 13+ communities. More real, but a new public surface and an empty showcase on a fresh database.
2. **Discover / Communities / Explore communities for visitors.** Those pages need a persona. Proposal: they link to `/login?next=/discover` and `/login?next=/communities` (login already honours `next`). Alternative: drop them from the visitor header, per "hide inactive buttons".
3. **ToggleTheme** kept as above?

## Removed

`pages/home/visitor.tsx`'s old body, `assets/images/avatar.svg`, `avatar-bottom.svg`, `logo.svg` (unused after this). `logo-light.png` / `logo-dark.png` stay as WWW-121's reference and are deleted there.

## Out of scope

- Login and sign-up layout (WWW-115). RTL and Arabic copy (WWW-89..91).
- Public, logged-out Discover or community pages.

## Check

`pnpm build`, `pnpm lint`; Playwright at 1440 / 834 / 390 logged out, light and dark, compared with the three frames; `/login`, `/sign-up`, verify-email and onboarding headers still render.
