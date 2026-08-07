# League Base — Developer Guide & Documentation

*A solo-built project — this doc serves as both working documentation for
myself (commands, gotchas, decisions, what's still open) and an
overview for anyone else looking at the repo.*

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Install](#2-install)
3. [Running the dev server](#3-running-the-dev-server)
4. [What's here — project structure](#4-whats-here--project-structure)
5. [Icons](#5-icons)
6. [Fonts](#6-fonts)
7. [Team data & teams.json](#7-team-data--teamsjson)
8. [The Bracket system](#8-the-bracket-system)
9. [Color accessibility](#9-color-accessibility)
10. [Known setup gotchas](#10-known-setup-gotchas)
11. [TestFlight / Release readiness](#11-testflight--release-readiness)
12. [Roadmap (genuinely open, not yet built)](#12-roadmap-genuinely-open-not-yet-built)

League Base is a personal companion app for League of Legends esports —
**LCS, LEC, LCK, LPL, CBLOL, and LCP**, all in one place. Pick a favorite
team on first launch and the whole app themes itself around them —
colors, borders, headers, everything. From there, every region gets real
standings, schedules, full rosters, and VOD links, all pulled from
official public data — no account, no backend, no ads, no tracking.

Built with React Native + Expo, developed on Windows. Everything ships in
the app itself or comes from free public APIs — there's no server this
project depends on, and nothing it collects or transmits about you.

**What's actually in here, for anyone skimming this for the first time:**
- Favorite-team theming — pick a team, the whole app recolors around them,
  in both light and dark mode, with real accessibility work behind it
  (see [Color accessibility](#9-color-accessibility))
- Real standings, schedules, rosters, and VODs for all 6 regions, sourced
  live from lolesports.com's own public data
- A genuine Swiss-format bracket view for LCP — round-by-round, correctly
  grouped by each team's actual record, not just a static list
  (see [The Bracket system](#8-the-bracket-system))
- 58 teams' worth of roster data, carefully researched and cross-verified
  against real sources — not guessed (see [Team data](#7-team-data-teamsjson))
- A crash-safety net (see [Section 11](#11-testflight-release-readiness)) so an
  unexpected edge case shows a friendly recoverable screen, not a hard
  crash

**Where this stands right now:** every screen, every region, and all 58
teams have been individually clicked through and tested in both light and
dark mode. The app itself is done in every way that matters — what's left
is entirely TestFlight logistics (Apple Developer Program enrollment,
`eas build`, TestFlight distribution), tracked in
[Section 11](#11-testflight-release-readiness).

---

## 1. Prerequisites

- **Node.js 20 LTS — `20.19.4` or newer.** That's the minimum Expo SDK 54
  requires; anything below it will fail to start the dev server. Check
  with `node -v`, and update via [nodejs.org](https://nodejs.org) or
  `nvm install 20.19.4` if you're on nvm-windows.
- [VS Code](https://code.visualstudio.com) (or any editor)
- The **Expo Go** app on your phone, from the App Store / Play Store — lets
  you preview the app live during development with no build step. See
  [Gotcha #3](#gotcha-3-expo-go-sdk-mismatches) if it refuses to load the
  project.
- An **Apple Developer account** ($99/year) once you're past local
  testing and moving toward TestFlight — see
  [Section 11](#11-testflight-release-readiness).

---

## 2. Install

This project's root config files (`package.json`, `app.config.js`,
`babel.config.js`, `tsconfig.json`) were written by hand rather than
generated with `npx create-expo-app` — that tool's default template comes
bundled with Expo Router (file-based navigation, an `app/` folder, example
tab screens), which doesn't match how this project is wired (a single
`App.tsx` driving React Navigation directly). Skipping it avoids fighting
two different navigation systems. See
[Gotcha #1](#gotcha-1-no-packagejson-why-we-skip-create-expo-app) if
you're setting this up somewhere new.

```powershell
cd League-Base
npm install
```

Then bring in the packages the project actually uses, the Expo-aware way
(matters — see [Gotcha #2](#gotcha-2-use-npx-expo-install-not-npm-install-for-new-native-packages)):

```powershell
npx expo install @react-navigation/native @react-navigation/native-stack `
  @react-navigation/drawer react-native-gesture-handler react-native-reanimated react-native-worklets `
  react-native-screens react-native-safe-area-context `
  @react-native-async-storage/async-storage @expo/vector-icons expo-font `
  expo-splash-screen
```

Also add `babel.config.js`'s `react-native-worklets/plugin` line (already in
the config file I gave you) if you're merging by hand rather than replacing
the whole file. Reanimated 4 (required for the New Architecture — see
`app.config.js`'s `newArchEnabled`) moved its Babel plugin into the separate
`react-native-worklets` package, so both the install *and* the plugin path
matter — an older `react-native-reanimated/plugin` reference will fail with
`Cannot find module 'react-native-worklets/plugin'`. Babel config changes
need a full cache clear to take effect: `npx expo start --clear`, not just
a reload.

### What's actually installed, and why

| Package | What it's for |
|---|---|
| `expo`, `react`, `react-native` | Core framework |
| `@react-navigation/native`, `@react-navigation/native-stack` | Root Stack (Onboarding, the Drawer, Settings + its five sub-pages) and each region's nested Stack |
| `@react-navigation/drawer` | The main Drawer — My Team + LCS/LEC/LCK/LPL/CBLOL/LCP |
| `react-native-gesture-handler`, `react-native-reanimated`, `react-native-worklets` | Drawer peer dependencies (swipe-to-open, open/close animation). See [Gotcha #7](#gotcha-7-reanimated-4-needs-react-native-worklets-not-just-react-native-reanimatedplugin) if the Babel plugin errors |
| `react-native-screens`, `react-native-safe-area-context` | Required by React Navigation, and `SafeAreaView` is used directly for header notch/status-bar clearance |
| `@react-native-async-storage/async-storage` | Local storage for favorite team + light/dark mode — the entire app's persisted state runs on this |
| `@expo/vector-icons` | The cog, hamburger, and drawer-menu icons |
| `expo-font` | Font-loading infrastructure for the header/body typeface — **Rajdhani is active**, see [Fonts](#6-fonts) |
| `expo-splash-screen` | Native launch splash — configured via `app.config.js`'s `plugins` array, shows the app icon on a dark background matching the app's own theme rather than a jarring default flash |

The lolesports.com API client (`src/api/lolesportsClient.ts`) uses RN's
built-in `fetch` directly — no HTTP client dependency needed for that.

---

## 3. Running the dev server

```powershell
npx expo start
```

Scan the QR code with Expo Go (same Wi-Fi network as your computer).
Saving a code change reflects on the phone in about a second.

---

## 4. What's here — project structure

```
App.tsx                            Navigation stack, ThemeProvider, error
                                    boundary, first-launch onboarding gate

assets/
  icon.png                          App icon (1024x1024, sharp source logo)
  adaptive-icon.png                 Android adaptive icon foreground (same
                                     logo, safe-zone padded)
  images/
    lanes/                          Top/Jungle/Mid/ADC/Support role icons
                                     (transparent PNG, gold/black)
    coach.png                       Headset icon for coaching staff rows —
                                     white silhouette, transparent bg, tinted
                                     in code rather than a fixed color (see
                                     Icons section)
  fonts/                           Rajdhani-Regular.ttf + Rajdhani-Bold.ttf
                                    — active, see Fonts section
  data/teams.json                  58 teams across 6 regions: colors,
                                    logos, socials, full rosters + coaches
                                    — see Team data section

src/
  navigation/
    types.ts                         Root Stack / Drawer / RegionStack param
                                      lists + composite prop helpers
    RootDrawer.tsx                    My Team + LCS/LEC/LCK/LPL/CBLOL/LCP
    RegionStack.tsx                   Factory: RegionHome -> Team, one
                                       instance per region

  screens/
    OnboardingScreen.tsx            First-launch team picker, grouped by region
    HomeScreen.tsx                  Cog / title / hamburger header + favorite
                                     team's overview (renders TeamOverview)
    RegionHomeScreen.tsx            Region News, Upcoming/Recent Games,
                                     Overall Standings, Bracket (when
                                     active), and the team grid — all real
                                     data
    TeamScreen.tsx                  Any team's overview — same TeamOverview
                                     HomeScreen uses, reached via RegionStack
    SettingsScreen.tsx              Nested menu: Profile, Theme, About, FAQ
    ProfileSettingsScreen.tsx       Re-run the team picker to change favorite
    ThemeSettingsScreen.tsx         Light / dark / match-device
    AboutScreen.tsx                 What the app does, where data comes from
    FAQScreen.tsx                   Common questions

  components/
    ErrorBoundary.tsx                 Catches any unexpected crash anywhere
                                       in the app (App.tsx wraps the whole
                                       navigator with it) — friendly
                                       recoverable screen instead of a hard
                                       crash or blank white screen
    ErrorFallback.tsx                 Themed fallback UI ErrorBoundary
                                       shows — separate component since a
                                       class-based boundary can't use hooks
    AppText.tsx                     Drop-in replacement for RN's <Text> —
                                     applies Rajdhani. Every screen imports
                                     Text from here.
    AppHeader.tsx                    Cog / title / hamburger — shared by
                                      HomeScreen and RegionHomeScreen.
                                      Custom-built (not React Navigation's
                                      native header) so it isn't subject to
                                      OS-drawn pill/circle chrome around
                                      headerLeft/headerRight
    TeamOverview.tsx                 The full team-detail view (banner,
                                     record/matches/roster/coaches/socials)
                                     — shared by HomeScreen and TeamScreen
    TeamTile.tsx                     Logo-chip + name tile — shared by
                                     TeamPickerGrid and RegionHomeScreen
    TeamPickerGrid.tsx               Team-selection grid (all regions),
                                     used by Onboarding and Settings > Profile
    LogoChip.tsx                     Fixed dark backdrop + team-color ring
                                      for every team logo — see Color
                                      accessibility section
    Section.tsx                      Eyebrow title + rule — shared across
                                     nearly every screen
    PlaceholderCard.tsx              Loading/error/empty-state card, used
                                     across every data-driven section
    FollowButton.tsx                 External-link button (border in accent
                                      color) — Twitter/X, Weibo, Instagram,
                                      YouTube, Twitch, Bilibili on team
                                      pages; same set + Discord on regions
    UpcomingGames.tsx                 Region's next 5 upcoming/live matches
                                       — takes already-fetched schedule
                                       events as props (shares one fetch
                                       with RecentGames, both driven from
                                       RegionHomeScreen)
    RecentGames.tsx                   Region's last 5 completed matches,
                                       same shared-fetch pattern
    OverallStandings.tsx              Region standings table, including
                                       lock/eliminated status icons for a
                                       Swiss stage's qualify/eliminate
                                       thresholds
    BracketRounds.tsx                  Swiss-stage round-by-round pairings,
                                        correctly grouped by record (not
                                        just round number), horizontally
                                        scrollable — see The Bracket system
    TeamRecord.tsx                    Team W/L record — takes already-
                                       fetched schedule events as props
                                       (shares one fetch with the two below,
                                       all driven from TeamOverview)
    TeamUpcomingMatches.tsx           Team's next 3 upcoming/live matches
    TeamRecentMatches.tsx             Team's last 3 completed matches
    TeamVods.tsx                       Per-game VOD links for the same last
                                        3 completed matches — LCS/LEC/LCK/
                                        CBLOL/LCP all covered, LPL shows a
                                        static message by design, see
                                        Section 10
    LaneIcon.tsx                     Maps a roster role string to its lane
                                     icon, with a small dot badge for subs

  theme/
    ThemeContext.tsx                 App-wide theme: favorite team's colors
                                      + light/dark mode, both persisted
    deriveTheme.ts                   Picks colors from team.colors + mode,
                                      including the WCAG-safe accentReadable
                                      derivation — see Color accessibility
    fonts.ts                         Rajdhani font-family mapping + native
                                      header title style

  data/
    teamsStore.ts                    Reads teams.json, exposes lookups by
                                      id/region
    favoriteTeam.ts                  AsyncStorage: favoriteTeamId + theme
                                      mode preference

  api/
    lolesportsClient.ts               lolesports.com unofficial API —
                                       leagues, schedule, live games,
                                       standings (via tournament ID),
                                       per-team schedule + W/L record,
                                       per-game VOD links (getEventDetails),
                                       Swiss-stage round reconstruction
                                       (fetchSwissRounds — see Section 8).
                                       Undocumented endpoint, see file
                                       header before touching it
    cache.ts                           Generic TTL-aware cache (memory +
                                        AsyncStorage) — every
                                        lolesportsClient endpoint routes
                                        through this via apiGet(), except
                                        getLive (always fetched fresh)
    leaguepediaClient.ts               PARKED — not called from anywhere.
                                        LPL VOD fallback that worked but
                                        triggered 8+ hours of rate limiting
                                        from a handful of requests. See
                                        Section 10 before reviving this.

  hooks/
    useAsyncData.ts                   Shared fetch/loading/error/ready
                                       state — every api/-consuming
                                       component uses this instead of its
                                       own copy

  utils/
    colorContrast.ts                 WCAG contrast math — ensureReadableOn,
                                      ensureUIContrastOn, resolveTeamColor
                                      — see Color accessibility
    formatMatchTime.ts               Shared date/time formatting for match
                                      rows (upcoming vs. completed)

  types/team.ts                      TypeScript types matching teams.json's
                                      shape, plus lane-role helpers
```

### Where to make common changes

- **Change what Home or Settings shows** → the matching file in `src/screens/`
- **Change team data** (colors, roster, socials) → `assets/data/teams.json`
  directly — no code change needed, `teamsStore.ts` just reads it
- **Change how team colors map to the app theme** → `src/theme/deriveTheme.ts`
- **Change navigation structure** (add a screen, change the stack) →
  `App.tsx` and `src/navigation/types.ts`
- **Add a new region** → `src/types/team.ts`'s `Region` type,
  `teamsStore.ts`'s `REGIONS` array, `RootDrawer.tsx`, `navigation/types.ts`'s
  `DrawerParamList`, and `App.tsx`'s `DRAWER_TAB_LABELS` — see
  [Gotcha #9](#gotcha-9-a-regions-lolesportscom-slug-isnt-always-its-region-code)
  before assuming the region code matches lolesports.com's actual slug

---

## 5. Icons

App icon and adaptive icon come from a single square logo — see
`assets/icon.png` / `assets/adaptive-icon.png`, wired up in `app.config.js`'s
`icon` and `android.adaptiveIcon` fields. The current icon was verified
objectively sharper than an earlier version (Laplacian variance ~4.3x
higher — a real measurement, not a guess) and checked against Apple's
actual rounded-corner mask to confirm nothing gets clipped at the
corners.

`adaptive-icon.png` is Android's foreground layer specifically — it's
meant to have a transparent background so `app.config.js`'s configured
background color shows through underneath it. The current source has a
solid background baked in, so on Android specifically that covers the
configured color rather than blending with it — a known, low-priority
gap given this project's focus has been iOS/TestFlight throughout.

In-app icons (lane roles, the coach headset) are single-color transparent
PNGs tinted at render time via RN's `tintColor` style, rather than baked-in
colors — `<Image source={...} style={{ tintColor: colors.textMuted }} />`.
That's deliberate: a fixed color (black, in the coach icon's original form)
can disappear against the app's near-black dark background, and tinting
from the current theme color means it's always legible in both light and
dark mode without needing a separate asset per mode.

## 6. Fonts

`AppText` uses **Rajdhani** (Google Fonts, SIL Open Font License —
genuinely free to bundle) for every piece of text in the app. Headers/
titles use Bold, body/menu text uses Regular — both from this one family,
since it actually has a real weight range (unlike "League," an earlier
choice, which only had one usable weight and was headers-only). This is a
departure from Beaufort's inscriptional-serif character — the real
in-client LoL font, not redistributable — but not unfaithful to LoL's
actual type system: the *other* official font, Spiegel (body text), is
itself a plain humanist sans.

Both font files (`Rajdhani-Regular.ttf`, `Rajdhani-Bold.ttf`) are already
in `assets/fonts/` and wired up in `src/theme/fonts.ts`. If you ever need
to re-add them from scratch (a fresh clone that's missing the font files,
say): download the family from
[fonts.google.com/specimen/Rajdhani](https://fonts.google.com/specimen/Rajdhani)
("Download family"), pull the Regular and Bold weights into `assets/fonts/`,
and do a full restart (`npx expo start --clear`) — font changes need a
full reload, not fast refresh.

Native headers (the "LCS" / team-name title bar, Settings' sub-page
titles) don't go through `AppText` at all — React Navigation draws those
itself, so `theme/fonts.ts` also exports a `headerTitleStyle` that gets
applied explicitly in every navigator's `screenOptions`. Worth knowing if
you ever add a new navigator: it needs that same line, or its headers will
silently stay on the system font even with everything else correct.

---

## 7. Team data & teams.json

`assets/data/teams.json` holds **58 teams across 6 regions** (LCS, LEC,
LCK, LPL, CBLOL, LCP), plus one entry per region (display name, logo,
socials, `teamIds`). Every team's roster — starters, substitutes, and
coaching staff — was researched and cross-verified against multiple real
sources (official team announcements, Liquipedia, region-specific stat
trackers), not assumed. Rosters shift constantly during an active season,
so treat `roster.lastVerified` as exactly what it says — a point-in-time
snapshot, not a guarantee it's still current months later.

**Schema, per team:**
```
{
  "name": "...", "region": "LCS | LEC | LCK | LPL | CBLOL | LCP",
  "liquipediaPage": "...",     // a Liquipedia URL — NOT Leaguepedia,
                                 despite how similar those two names are.
                                 This field is purely informational; no
                                 code reads it to do real work.
  "lolesportsSlug": "...",     // must match lolesports.com's own team
                                 "code" field exactly — verified via real
                                 API responses, not guessed
  "colors": { "primary", "secondary", "accent" },
  "logoUrl": "...", "twitter"/"weibo"/"instagram"/"youtubeChannel"/
  "twitch"/"bilibili": "...",  // all optional except twitter
  "active": true,
  "roster": {
    "lastVerified": "YYYY-MM-DD",
    "players": [{ "username", "role" }],   // role: "Top" | "Jungle" |
                                              "Mid" | "ADC" | "Support" |
                                              "<Lane> Substitute"
    "coaches": [{ "username", "role" }]     // "Head Coach" | "Coach" |
                                              "Assistant Coach" |
                                              "Strategic Coach" |
                                              "Positional Coach"
  }
}
```

**A couple of real lessons from building this, worth knowing if you're
adding more teams later:**

- **`colors.accent` is a curated override, not a fallback for missing
  data.** Several teams are genuinely white- or black-branded (their
  actual logo has no other color). For those, `accent` holds a manually
  chosen UI-safe substitute — but *only* set it when `primary` truly has
  no usable hue. The app's automatic contrast system (see
  [Color accessibility](#9-color-accessibility)) already adjusts a real
  color's lightness for legibility *while preserving its hue* — that's
  strictly better than overriding to a flat black/white, which was a
  mistake made and then corrected on several teams during this build.
- **A team's `lolesportsSlug` isn't always the obvious abbreviation.**
  Confirmed the hard way on three CBLOL teams whose slugs turned out to
  be `LOUD`, `PAIN`, and `FX` — not the guessed `LLL`, `PNG`, and `FXW7`.
  Get this from a real `getSchedule`/`getStandings` response
  (`src/api/lolesportsClient.ts` has diagnostic logging patterns used
  throughout this project for exactly this), not by guessing at a
  reasonable-looking abbreviation.

---

## 8. The Bracket system

`BracketRounds.tsx` + `fetchSwissRounds()` (in `lolesportsClient.ts`)
render a genuine Swiss-format bracket — confirmed working against LCP's
real 2026 Split 3 data, not built against a guess.

**The actual problem this solves:** `getStandings` never gives Riot's own
round number for a Swiss match, and its `rankings` field comes back
completely empty for a Swiss stage (unlike a normal round-robin group
stage, where it's pre-populated). Two things had to be reconstructed from
first principles instead:

1. **Standings**, by tallying wins/losses directly from each match's
   result — the same thing a person watching would do by hand
   (`computeSwissStandingsFromMatches`).
2. **Round number and record-group**, from a real mathematical property
   of Swiss format itself: a team's round always equals however many
   matches it's already played, plus one, and Swiss only ever pairs teams
   sitting at the *same* record. So Round 1 is one group (everyone at
   0-0), Round 2 splits into however many distinct records actually
   exist (typically two: 1-0 and 0-1), Round 3 into three (2-0, 1-1,
   0-2), and so on — this isn't hardcoded, it falls out naturally from
   tracking each team's real record as matches resolve.

Getting the *round* right needs matches in true chronological order,
which needs a timestamp `getStandings` doesn't provide — cross-referenced
against `getSchedule`'s events by match ID. That cross-reference is an
assumption (not 100% independently confirmed), though consistent with
the same ID scheme already confirmed for VODs.

**One real bug worth knowing about if this ever looks wrong again:**
pre-allocated future match *slots* (neither team determined yet) all
share the literal team code `"TBD"` — without filtering these out before
grouping, every one of them collapses into one fake "team" in the record
tracking, corrupting round assignment. `fetchSwissRounds` filters these
out explicitly now, but it's the kind of thing that could resurface if
this logic is ever copied elsewhere.

**Deliberately scoped to Swiss stages only** — `BracketRounds` checks
`rankings.length === 0` as the actual signal a section is Swiss-shaped,
not "this section has a matches list at all" (every region's normal
season also exposes one). Get that check wrong and every region shows a
multi-week-long bracket instead of just the one actually in Swiss format
— a real bug hit and fixed during this build.

**What's NOT built yet**: the true visual elimination bracket (Playoffs
stage, connecting lines showing which match feeds into the next). Every
Playoffs match seen so far is still `TBD vs TBD` with an empty
`previousMatchIds`, so the real connectivity mechanism is genuinely
unconfirmed. `BracketRound`/`BracketRounds` were built generically on
purpose (nothing Swiss-specific baked into the component itself) so the
same component should be reusable for that once real seeded data exists
to design the connectivity against — build against real data, not a
guess, same reasoning as everything else in this project. Also relevant
for a future Worlds screen (discussed, not started).

---

## 9. Color accessibility

Team colors drive nearly every visual accent in this app — but a raw team
color is not automatically safe to use as a border, a background fill, or
especially text. Several teams are white- or black-branded, and this app
supports both light and dark mode — meaning the exact same color can be
perfectly legible in one mode and invisible in the other. This was a real,
confirmed bug found via testing (not theoretical), and the fix is now a
real, reusable system, not a one-off patch:

- **`ensureReadableOn(color, background, minRatio = 4.5)`** — WCAG 1.4.3
  contrast for text. Adjusts a color's *lightness* while preserving its
  *hue*, iterating until it clears the target ratio, falling back to
  pure black/white only if a color genuinely can't get there (a true
  monochrome brand). `colors.accentReadable` uses this — every place
  accent color is used as *text* goes through this, never the raw
  `colors.accent`.
- **`ensureUIContrastOn(color, background)`** — same mechanism, WCAG
  1.4.11's lower 3:1 bar for non-text UI elements (borders, rings, large
  fills) — used for team tile borders, the banner fill, and Follow
  button borders.
- **`LogoChip.tsx`** — every team logo sits on a *fixed* dark backdrop
  (`#0B0B0D`), not tied to team color or light/dark mode at all. Team
  logos are Liquipedia's "darkmode" variants (built for a dark
  background) — placed directly on the theme's surface color, a white
  logo is fully legible in dark mode but disappears entirely in light
  mode. A constant dark chip sidesteps the whole problem regardless of
  team color or mode.
- **`resolveTeamColor(team, fallback)`** — prefers a team's explicit
  `colors.accent` override when set, falling back to `primary` otherwise
  — see [Team data](#7-team-data-teamsjson) for when to actually set that
  override versus letting the automatic contrast system handle a
  perfectly fine color on its own.

**Real regression caught during a project-file audit, worth knowing the
shape of in case it recurs:** several components were found using raw
`colors.accent` for text instead of `colors.accentReadable` — meaning the
correct system existed, but a handful of call sites weren't actually
using it. A full accessibility fix is only as good as *every* consumer
actually calling it — worth spot-checking new components against this
specific mistake.

---

## 10. Known setup gotchas

### Gotcha #1: No package.json / why we skip `create-expo-app`

An empty project folder has no `package.json`, so a plain `npm install`
fails with `ENOENT: no such file or directory, open 'package.json'`. The
obvious fix, `npx create-expo-app@latest .`, works but generates its
**default template** — Expo Router, an `app/` folder, example tab
screens — which conflicts with this project's plain `App.tsx` +
React Navigation setup. That's why the config files are hand-written
instead (Section 2). If you ever do run `create-expo-app` by accident and
end up with an `app/` folder, the fix is to start the folder over rather
than try to merge the two navigation systems.

### Gotcha #2: Use `npx expo install`, not `npm install`, for new native packages

`npx expo install <package>` resolves the exact version compatible with
the installed Expo SDK; plain `npm install <package>` grabs whatever's
newest on npm, which can silently mismatch and cause native-module errors
that are confusing to trace back. Reserve plain `npm install` for the
initial `npm install` with no arguments (Section 2).

### Gotcha #3: Expo Go SDK mismatches

Expo Go's build in the App Store / Play Store sometimes lags behind
Expo's latest SDK release. This project targets **SDK 54** specifically
(not 57, the newest one) because that's what the *published* Expo Go app
actually supports on a physical phone right now — SDK 57 currently only
runs via `eas go` or simulators. If `create-expo-app` or `expo upgrade`
ever bumps this project to SDK 57, physical-device Expo Go testing will
break with an "incompatible" error; step back down with
`npx expo install expo@"~54.0.0" --fix`.

### Gotcha #4: ERESOLVE peer dependency errors

If `npm install` refuses to resolve the dependency tree, create a
`.npmrc` file in the project root containing:

```
legacy-peer-deps=true
```

Safe here — Expo's own installer (`npx expo install`) validates the
actual version set independently, so this doesn't risk installing
something incompatible.

### Gotcha #5: Windows path length / OneDrive

Not hit yet on this project specifically, but worth doing upfront since
it's a common Windows + `node_modules` problem: if the project folder
lives inside a OneDrive-synced directory, OneDrive trying to sync
`node_modules` (tens of thousands of small files) while npm writes to it
causes random "file not found" errors. Keep the project somewhere plain
(`C:\GameDevelopment\League-Base` already qualifies — not under OneDrive).
If you ever do hit path-length errors specifically, enabling long paths
once fixes it:

```powershell
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

(Administrator PowerShell, then restart your terminal.)

### Gotcha #6: TypeScript files with JSX need `.tsx`, not `.ts`

Any file containing JSX (`<Component>` tags) must use `.tsx`. All the
`theme/`, `components/`, and `screens/` files that render something are
already named correctly — comes up if you split new files out of them.

### Gotcha #7: Reanimated 4 needs `react-native-worklets`, not just `react-native-reanimated/plugin`

Hit this bringing in the Drawer (`@react-navigation/drawer` depends on
Reanimated). SDK 54 installs Reanimated 4, which requires the New
Architecture (already on — see `app.config.js`'s `newArchEnabled`) and moved its
Babel plugin into a separate `react-native-worklets` package. Symptom:

```
Error: [BABEL]: Cannot find module 'react-native-worklets/plugin'
```

Fix: `npx expo install react-native-worklets`, then make sure
`babel.config.js` points at `'react-native-worklets/plugin'` (not the old
`'react-native-reanimated/plugin'`), then `npx expo start --clear` — Babel
config changes don't take effect on a plain reload.

### Gotcha #8: React Navigation's native headerLeft/headerRight get OS-drawn chrome you can't control

Custom buttons passed to `screenOptions.headerLeft`/`headerRight` on a
native-stack screen get wrapped in whatever background the current OS
applies to header items (a pill shape around the back button, a circle
around custom buttons, on current iOS) — and that chrome doesn't
necessarily center itself around custom content correctly. If a
header icon looks slightly off-center no matter how precisely its own
`View`/`Pressable` is centered, this is almost certainly why. Fix used
here: don't fight it — build the header as a plain custom `View` instead
(see `AppHeader.tsx`) and set `headerShown: false` on that screen, same
as `HomeScreen` already did before this ever came up on `RegionHomeScreen`.

Related: a Stack.Screen that wraps a Drawer (like `MainDrawer` wrapping
`RootDrawer`) only has ONE title in its own parent Stack, regardless of
which Drawer tab is actually focused — so a screen pushed on top (like
Settings) will show the same back-button label no matter which tab you
opened it from, unless that title is computed dynamically from the
focused route (`getFocusedRouteNameFromRoute`, see `App.tsx`) rather than
hardcoded.

### Gotcha #9: A region's lolesports.com slug isn't always its region code

`resolveLeagueId()` used to naively lowercase the region code (`LCS` ->
`"lcs"`) to look up lolesports.com's internal league ID — worked for
LCS/LEC/LCK/LPL purely by coincidence, since their real slugs happen to
match. **CBLOL's actual slug is `cblol-brazil`**, confirmed only after
CBLOL's Region/Team screens came back completely empty despite the
region genuinely having played matches (confirmed via lolesports.com's
own site). `REGION_SLUG_OVERRIDES` in `lolesportsClient.ts` is the fix —
a small lookup table for exactly this case, defaulting to the lowercase
code for every region that doesn't need an override. Check this table
first if a newly-added region shows zero data everywhere despite
everything else looking wired up correctly.

### Gotcha #10: An `Anthropic`-style diagnostic-log-then-ask-the-user loop is the fastest way to fix an API integration bug

Not really a code gotcha, more a working pattern worth naming since it
solved nearly every hard bug in this project: guessing at an undocumented
API's response shape rarely worked on the first try (`getEventDetails`'s
exact path, VOD locale selection, Leaguepedia's `TeamRedirects` table,
the Swiss-stage `rankings` gap). What actually worked, every time: add a
`console.log` at the exact point of uncertainty (gated behind `__DEV__`,
which is automatically stripped in a real release/TestFlight build — see
`lolesportsClient.ts` for the pattern), ask for the real Metro output, fix
against what it actually shows. Cheaper than a second or third guess.

### Gotcha #11: `teams.json`'s top-level `lastUpdated` doesn't update itself

The About screen's "Team data last updated" line reads one single field —
`teams.json`'s top-level `lastUpdated`, via `getTeamsLastUpdated()` in
`teamsStore.ts` — not a per-team timestamp, and not computed
automatically from anything. Editing rosters (individual `roster.lastVerified` dates) does **not** touch this field. Forgetting to bump
it by hand is exactly how the About screen quietly showed a stale date
for several days during this project's own roster-verification pass,
caught only by a manual re-check, not by anything automatic. If you ever
do a roster pass and the About screen still shows an old date afterward,
this field is why — bump `"lastUpdated"` at the very top of `teams.json` every time, not just the individual entries you touched.

---

## 11. TestFlight / Release readiness

Current status, as of this writing:

- **Two real, separate App Store Connect apps, one codebase** — config
  moved from static `app.json` to `app.config.js`, which branches on the
  `APP_VARIANT` env var (see that file's own header comment for the full
  reasoning):
  - Default (a plain `eas build`, no `--profile` flag — unchanged from
    before this split existed): **UAT**, name "League Base (UAT)",
    bundle identifier `com.JHarvey.LeagueBase`. All regular TestFlight
    builds go here, always.
  - `eas build --profile store` (new, explicit, sets `APP_VARIANT=
    production` via `eas.json`): **Store**, name "League Base", bundle
    identifier `com.JHarvey.LeagueBaseStore`. Only ever used for a real
    App Store submission — not something to run casually.
  - Both bundle identifiers are permanent once Apple registers them, so
    neither was picked casually. One EAS project (one `projectId`)
    produces builds for both — this is Expo's own recommended pattern
    for multiple variants from one codebase, not a workaround.
- **Splash screen**: configured (`expo-splash-screen`, app icon on a dark
  background matching the app's own theme).
- **App icon**: finalized — verified objectively sharper than the
  original placeholder and checked against Apple's real rounded-corner
  mask for clipping.
- **Crash safety net**: `ErrorBoundary`/`ErrorFallback` wrap the whole app
  — an unexpected crash shows a friendly recoverable screen instead of a
  hard crash or blank white screen, without losing any saved
  AsyncStorage data.
- **App Store Connect metadata** (description, "What to Test" notes,
  privacy questionnaire guidance, support URL) — drafted separately, not
  checked into this repo.
- **Apple Developer Program enrollment**: done.
- **EAS setup**: done — `eas-cli` installed, `eas build:configure` run,
  first real `eas build` (UAT) completed successfully, `eas submit`
  underway.
- **Not yet done**: the Store variant's first build/submit (only ever
  needed once actually ready for public release, not before), and
  TestFlight group setup for outside testers (Internal vs. External
  testing depends on the Apple Developer account type — an individual/
  solo account may need External testing to add outside testers, which
  requires a short first-build review from Apple, typically 24–48 hours,
  not instant).

App Privacy is worth knowing goes in easily here: **this app collects no
user data at all.** No accounts, no analytics, no backend. The only thing
stored is a favorite-team/theme preference, saved locally on-device via
AsyncStorage, never transmitted anywhere. (If crash reporting is ever
added — discussed as a possible improvement, not yet built — this answer
changes to include diagnostic data specifically, still a low-scrutiny
category but no longer literally nothing.)

---

## 12. Roadmap (genuinely open, not yet built)

- **A true visual elimination bracket** (Playoffs stage, connecting lines
  showing which match feeds into the next) — blocked on real seeded data,
  not effort. See [The Bracket system](#8-the-bracket-system) for why.
- **A Worlds EventScreen** — its own Drawer entry (not shoehorned into the
  per-region navigation, since Worlds spans all 6 regions at once):
  Upcoming/Recent Games, a Bracket section (table format during
  Play-Ins/groups, a real connected bracket for Knockout), and a
  region-grouped list of qualified teams read live from the real
  tournament data once it exists (not hardcoded slot counts, which change
  year to year based on MSI performance). Deferred until Worlds actually
  appears in lolesports.com's live data — same reasoning as waiting for
  LCP's real bracket data before building against it.
- **LPL's VOD gap has a possible community-sourced fallback**
  (Leaguepedia's Cargo API), genuinely built and confirmed working — but
  parked (`src/api/leaguepediaClient.ts`, not deleted) after its rate
  limiting locked out an entire network for 8+ hours from a handful of
  requests. Revisiting this needs real request caching first, not just
  re-enabling it as-is.
- A real `seasonCalendar.ts` (a shorter cache TTL between splits than
  mid-season) is on the table if the current fixed per-endpoint TTLs
  (`CACHE_TTL_BY_PATH` in `lolesportsClient.ts`) turn out too coarse once
  there's more real usage to learn from.
