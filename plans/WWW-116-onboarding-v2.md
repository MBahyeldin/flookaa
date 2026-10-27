# WWW-116 — Onboarding steps to v2

Epic WWW-86. Same route (`DashboardLayout` renders `pages/onboarding` on any route until completed), new layout, existing hooks and step logic. Step ids, `Done` checks, endpoints and `/dev/onboarding` are unchanged. Frontend only, no backend change.

Design: "Flookaa v2", Onboarding 1–5 desktop `26:286` `26:332` `26:417` `26:604` `26:793`, tablet `26:854`…`26:1303`, mobile `26:1360`…`26:1809`. Pulled read-only on 2026-10-27. The persona wizard has no frame (WWW-97 isn't designed yet): it follows step 5's card style.

Already done by earlier tickets: the gradient (`brand-start`/`brand-end`) is gone (WWW-81), and the communities and channels steps already use `CommunityTile`/`ChannelTile` (WWW-93).

## 1. Frame (`OnboardingShell`, `OnboardingProgress`, `OnboardingFooter`)

- **Top bar**: `Brand` left, a ghost **"Save and exit"** button right (see open question 1). The `Header onlyLogo` and its theme toggle go: Figma has neither.
- **Column**: one left-aligned column, `max-w-[540px]` centred on the page (Figma: 540 of 1440, the full width minus a 16 px gutter on mobile), for every step, tiles included.
- **Progress**: a thin bar (`h-1`, `rounded-full`, `bg-primary` on `bg-muted`), then a small muted label **"Step n of N · {short name}"** under it, replacing the "n / N" count. `n`/`N` keep today's meaning (over the steps the server lists; a skipped step counts as passed).
- **Heading**: `h1` (the `text-h1` token, left-aligned) plus a muted lead line under it. `OnboardingStepDef` gains `label` (the short name) and `lead`:

  | key | label | title | lead |
  |---|---|---|---|
  | `about_you` | About you | A little about you | Used only to check age limits on channels. Nobody else sees it. |
  | `interests` | Interests | What are you into? | Pick a few for your default persona. They shape what we suggest. |
  | `communities` | Communities | Join your communities | Suggested from your interests. Joining is instant for public ones. |
  | `channels` | Channels | Pick some channels | Channels are where the posts happen. |
  | `personas` | Personas | Your personas | You start with one. Add another for a different side of you, any time. |

- **Footer**: a `border-t` divider above one row: the left note (muted `text-sm`), then **Back** (ghost), **Skip now** (outline), **Continue** (primary, `loading` instead of "Saving…", no arrow icon). On mobile it stays one row; the left note shrinks and truncates. Error line unchanged.

## 2. Steps

- **About you**: Date of birth as `FormField` with helper "Used only for age limits. Never shown on a persona." (the existing `dateOfBirthField` input keeps its validation). **Gender becomes two `Chip kind="filter"` toggles** (Male, Female) in a `role="radiogroup"` instead of the Select. Save logic unchanged.
- **Interests**: the picker shows each group as an **overline heading over a wrapping row of `Chip kind="interest"`** (emoji + name, selected = accent fill + primary border) instead of the big square buttons. The count moves to the footer's left note ("4 selected"). See open question 2: the picker is shared.
- **Communities / Channels**: tiles in `grid gap-4 sm:grid-cols-2` (two columns fit the 540 column; no third). Channels' group headings become overlines ("FROM YOUR COMMUNITIES", "BASED ON YOUR INTERESTS"), still shown only when both groups exist. Skeletons, empty and error states unchanged.
- **Personas**: each persona is a **row card** (`bg-card`, border, `rounded-xl`): avatar, name, "@slug · {Theme} theme · {Privacy}", a `Badge` "Default" on the default one, and an outline **Manage** button on the right (same targets as today: the wizard for the default persona, the settings sheet for others). Below, a **dashed "Add another persona" card** (plus icon, title, "A work self, a cooking self… each with its own name and theme.") that opens the wizard in create mode. The footer is Back + Finish, as today.

## 3. Persona wizard (restyle only)

Same three steps, same saves. Dialog keeps the persona's `data-theme`; its progress bar matches the onboarding bar (thin, with "Step n of 3"); fields use `FormField`; persona type and privacy options become `Chip`s (`filter` for type, the privacy step keeps its three described options as bordered cards with the selected one in `border-primary bg-accent`); footer like the onboarding footer (ghost Back, primary Next / Save persona with `loading`). The privacy `tone` colours in `options.ts` go if nothing else uses them.

## Open questions

1. **"Save and exit"**: every step already saves through its own endpoint, so there is nothing left to save. Today the only way out of onboarding is closing the tab (every route shows it). **Proposed: it logs out** (`auth/logout`, like the verify step's "Log out"), and the next login resumes at the same step. Alternative: hide it.
2. **InterestPicker is shared** (persona settings `/persona-manager/:id`, the channel Manage sheet's Interests tab, the create channel/community forms, the wizard). **Proposed: restyle it to chip rows everywhere**, since Figma's Chip is the interest look across the app; it keeps the "n / max selected" line by default, and onboarding hides it (`showCount={false}`) because the footer shows the count. Alternative: a `variant="chips"` used only in onboarding and the wizard.
3. **Add-persona privacy presets**: today the add card has Public/Private/Only me chips that preset the wizard's privacy step. Figma's card has none. **Proposed: drop them** (the wizard asks privacy in step 2 anyway) and update the onboarding line in `CLAUDE.md`.

## Out of scope

Persona selection and the personas manager list (WWW-117). Persona settings page design (WWW-97/103). RTL and Arabic (WWW-89..91). Any change to step order, ids or `Done` rules.

## Check

`pnpm build`, `pnpm lint` on touched files. `/dev/onboarding` at 1440 / 834 / 390, light and dark, every step against its frame. The real flow (tiles joining, wizard saving, Save and exit) needs a logged-in account still in onboarding: with you, or on the dev API.

## Done (2026-10-27)

Proposed answers accepted: Save and exit logs out, InterestPicker is chip rows everywhere (`showCount`), add-persona presets dropped (`WizardMode` create carries no privacy; the wizard starts public). Date of birth is a plain `Input type="date"` in `FormField` (the old `TextInput` field object stays for the settings form). Checked: `pnpm build`, eslint on touched files, `/dev/onboarding` at 1440 and 390. Not checked: the five real steps, the wizard and the restyled picker on other pages, which need a logged-in account (still in onboarding for the steps).
