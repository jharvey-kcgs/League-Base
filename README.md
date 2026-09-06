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
- A genuine Swiss-format bracket view for LCP, and real elimination
  (Play-Ins/Playoffs) brackets for LCK, LPL, and LEC — hand-confirmed
  connection data for each, since the raw API carries no structural
  bracket information at all (see
  [The Bracket system](#8-the-bracket-system))
- 58 teams' worth of roster data, carefully researched and cross-verified
  against real sources — not guessed (see [Team data](#7-team-data-teamsjson))
- A crash-safety net (see [Section 11](#11-testflight-release-readiness)) so an
  unexpected edge case shows a friendly recoverable screen, not a hard
  crash

**Where this stands right now:** the app has shipped through TestFlight
and is in active use during the live LCK/LPL/LEC/CBLOL split, with the
elimination bracket system (above) built and refined against real,
in-progress tournament data as each region's Playoffs actually unfolded.
The project completed a full Expo SDK upgrade (54 → 57, including the
New Architecture requirement introduced at SDK 55) on 2026-08-28 — see
[Gotcha #3](#gotcha-3-expo-go-only-ever-supports-the-latest-sdk--plan-for-this-before-it-happens-to-you)
for the real experience of that. What's still genuinely open is tracked
in [Section 12](#12-roadmap-genuinely-open-not-yet-built).

---

## 1. Prerequisites

- **Node.js 22.13.x or newer.** SDK 57's documented minimum — a real jump
  from SDK 54's 20.19.4 requirement, worth checking before anything else
  if this project is ever picked back up after a break. Check with
  `node -v`, and update via [nodejs.org](https://nodejs.org) or
  `nvm install 22.13.0` if you're on nvm-windows.
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
    OverallStandings.tsx              Region standings table, including a
                                       lock icon once a Swiss-stage team
                                       hits the confirmed qualify
                                       threshold (deliberately never shows
                                       an eliminated icon — see Section
                                       10). Owns its own Section wrapper
                                       and disappears entirely, same as
                                       BracketRounds, once the tournament
                                       has genuinely moved past the stage
                                       it represents — see Gotcha #14.
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
                                       (fetchBracketData — see Section 8).
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

`BracketRounds.tsx` + `fetchBracketData()` (in `lolesportsClient.ts`)
render a genuine Swiss-format bracket — confirmed working against LCP's
real 2026 Split 3 data, not built against a guess.

**The section title is dynamic, not hardcoded "Bracket"** — it reads the
real stage name straight from the API (`"Swiss"`, `"Play-Ins"`,
`"Playoffs"`, whatever it genuinely is) and shows it as `"<Stage>
Bracket"`. This needed real stage-detection logic, not just reading
`stages[0]` forever: a tournament's `stages` array is chronological, and
each later stage starts out as pure `TBD vs TBD` until real teams
actually qualify into it. `pickActiveStage()` finds whichever stage is
genuinely current — the *last* stage (by array order) that has at least
one real (non-`"TBD"`) team seeded into it — rather than assuming Swiss
is always the one that matters. This was verified with a direct
simulation across all three real progression states (Swiss active,
Play-Ins just seeded, Playoffs just seeded) before trusting it, not just
read-through logic.

**The actual problem this solves for Swiss specifically:** `getStandings`
never gives Riot's own round number for a Swiss match, and its
`rankings` field comes back completely empty for a Swiss stage (unlike a
normal round-robin group stage, where it's pre-populated). Two things
had to be reconstructed from first principles instead:

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
tracking, corrupting round assignment. `fetchBracketData` filters these
out explicitly now, but it's the kind of thing that could resurface if
this logic is ever copied elsewhere.

**`fetchBracketData` (the function described above) is Swiss-specific
only** — it only attempts the Swiss-shaped record-grouping math when the
*active* stage's real name is literally `"Swiss"`. Every other bracket
shape (Play-Ins, Playoffs) goes through a completely separate function,
`fetchEliminationBracketData`, covered in full below. `BracketRounds`
itself renders both — it disappears entirely (no section at all)
whenever neither path has anything to show for the active stage, the
same honest "nothing to show yet" behavior either way, rather than a
title with an empty or wrong body underneath it.

### Elimination brackets (Play-Ins, Playoffs) — `fetchEliminationBracketData`

Built and currently live for **LCK, LPL, and LEC's Play-Ins and/or
Playoffs stages** (CBLOL's Playoffs bracket is on hold until its own
teams are finalized). This was a genuinely harder problem than Swiss,
worth documenting properly given how many real corrections it took to
get right — future-you (or anyone else building the next region's
bracket) should read this before assuming a new one will "just work."

**The core problem, and why it can't be solved from the API alone:**
`previousMatchIds` — the field that would tell you which match feeds
into which — comes back completely empty for every Play-Ins and Playoffs
match, for every region, always. There is no structural connectivity
data in the raw response at all. Every single connection (who plays
whom next, who drops down on a loss, which slot they land in) has to be
hand-confirmed from the real, official bracket page and encoded directly
into `lolesportsClient.ts` as static lookup tables, keyed by the raw
match ID. This is fundamentally different from Swiss, where the shape
itself falls out of a mathematical property (record-grouping); here,
the *shape itself* is unknowable from data and has to be told to the
code by a person who looked at the real page.

**The seven lookup tables that make this work, all in
`lolesportsClient.ts`, all keyed by raw match ID:**

| Table | What it encodes |
|---|---|
| `KNOWN_MATCH_CONNECTIONS` | A match's **winner** advances to a specific destination match. Draws a connector line by default. |
| `KNOWN_LOSER_CONNECTIONS` | A match's **loser** drops to a specific destination (genuine double-elimination only — a region with no lower bracket, or a match where losing means elimination, has no entry here for that match). Never draws a line, regardless of anything else. |
| `KNOWN_ROUND_LABELS` | The real, confirmed stage name for a match (e.g. `"Upper Bracket Semifinals"`) — overrides the generic `"ROUND N"` fallback. Needed whenever two differently-named stages land in the same computed column and would otherwise be visually indistinguishable. |
| `KNOWN_COLUMN_OVERRIDES` | Explicitly forces a match into a specific column, overriding the automatic "1 + max(source columns)" computation. Needed when the real bracket deliberately delays a stage further right than its data dependency alone implies (LCK's Upper Bracket Finals, held back so the Lower Bracket visually "catches up" first — LPL and LEC's shapes both resolved correctly with zero overrides, so don't assume every region needs one). |
| `SUPPRESSED_CONNECTOR_LINES` | A win-path connection that's real (used for round placement and centering) but the official page draws no line for it anyway. First needed for LCK's Round 1 -> Upper Bracket Round 2, which genuinely has no line on the real page despite the winner clearly advancing. |
| `CONNECTOR_TARGET_OFFSETS` | Makes a connector line land on a destination's specific top or bottom team slot instead of its vertical center — needed whenever a destination match has one "deposited" slot (arriving with no line) and one slot that genuinely advances via this specific line. |
| `KNOWN_TEAM_ORDER_SWAPS` | The raw team array's `[0]`/`[1]` order doesn't always match the official page's actual visual top/bottom order — this set swaps a specific match's rendering order in that case. Confirmed real, not a hypothetical: happened for LPL's AL/BLG and NIP/IG matches and LCK's Upper Bracket Finals, all independently. |

**Column placement is otherwise fully automatic**, via a fixed-point
loop: a match with no confirmed predecessor starts at column 1; anything
else lands one column after the latest of its own confirmed sources
(via either table above), repeating until every match settles. Only
override this when the real page's layout is confirmed to actually
diverge from that computation — most brackets built so far didn't need
one at all.

**Real, hard-won lessons — worth reading before building the next
region's bracket, not just skimming:**

- **Sequential raw match ID order is not a reliable way to guess which
  ID is which stage**, even though it looked that way at first (it
  worked, by coincidence, for several of LCP's Playoffs stages). LCK's
  build initially guessed match `...841619` was "Lower Bracket Round 2"
  based on its position in the ID sequence — it was actually **Upper
  Bracket Finals**, confirmed only once GEN's real win started showing
  up there. When inference is genuinely unconfirmed, say so explicitly
  rather than present a guess as settled — and expect to revisit it once
  real results arrive.
- **A completed match's raw team array can itself confirm or disprove an
  ID mapping.** LCK's `...841613` was confirmed as the real Lower
  Bracket Round 1 not by inference but because it showed up populated
  with exactly the two real Round 1 losers, independent of any
  positional guess.
- **When your own inference is wrong more than once on the same
  bracket, stop guessing and ask the person to check the real page
  directly** — browser devtools' Network tab, filtered to the main
  document/RSC payload rather than XHR, can reveal the same underlying
  match IDs a site's own frontend renders from, if a `getStandings`-style
  request isn't directly visible (worth trying `getStandings` first,
  which is what this app's own client calls, before assuming a page
  doesn't expose the data it's rendering from).
- **A "who drops down where" rule can be genuinely undeterminable from
  data alone, even once you know the correct destination IDs.** LCK's
  rule — the lower-seeded Upper Bracket Round 2 loser drops to Lower
  Bracket Round 2, the higher-seeded one skips ahead to Round 3 — can't
  be resolved until *both* UBR2 matches have actually completed, since
  seeding is an external fact, not something derivable from who beat
  whom. The right move is to leave that specific connection absent
  until it's genuinely knowable, not guess at a plausible-seeming
  destination.
- **Centering a match on "all of its sources" is wrong in general.** The
  correct rule, confirmed against real page layouts on two separate
  occasions: a loss-path source counts toward a destination's centering
  *only if* it has no separate win-path destination of its own — a
  source with both (its winner going one place, its loser going
  another) has its own position already determined by that other
  relationship, and pulling the destination toward it too reintroduces
  visual overlap bugs that were specifically fixed once already.
- **An unconfirmed source match must never block a downstream match's
  own round resolution.** A match excluded from rendering (fully TBD,
  no confirmed label, nothing else feeding it) can still appear as an
  entry in a connection table without breaking anything — *unless* the
  round-assignment loop naively waits for every listed source to
  resolve regardless of whether that source is actually being rendered.
  This produced a real React "duplicate key" warning once (two
  unrelated matches both silently collapsing into a `roundNumber:
  undefined` group) — fixed by filtering each match's source list down
  to only sources that are themselves confirmed/rendered.
- **Every one of the above is diagnosed and fixed with the same
  discipline as Gotcha #10** — a real, current diagnostic log or a
  direct, confirmed observation from the actual official page, never a
  second guess stacked on an unconfirmed first one. Every genuinely
  unconfirmed inference in the tables above is commented as such
  in-place, not left to look more certain than it is.

**Also relevant for a future Worlds screen** (discussed, not started) —
Worlds' own bracket shape would need the exact same "get a real
diagnostic log, confirm the raw match IDs directly, don't guess"
treatment as every region here, from scratch.

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

### Gotcha #3: Expo Go only ever supports the latest SDK — plan for this before it happens to you

This project is on **SDK 57** as of 2026-08-28, having genuinely lived through
the failure mode this gotcha warns about: Expo Go auto-updates to whatever
the newest SDK release is, with no way to keep an older version installed
on a physical iOS device. When this project was still on SDK 54 and Expo
Go silently updated to 57, Expo Go simply refused to open the project at
all — "Project is incompatible with this version of Expo Go."

**The actual upgrade path taken, in case this project (or a future one) is
ever several SDK versions behind again:**

1. **Migrate to the New Architecture first, while still on the old SDK** —
   don't try to bundle this with the SDK bump itself. SDK 55 made the New
   Architecture mandatory (SDK 54 was the last version supporting the Old
   Architecture); Expo's own guidance is explicit about doing this as a
   separate, earlier step. In this project's case there was nothing to
   actually migrate — `newArchEnabled: true` was already set, and
   `react-native-worklets` was already correctly wired for Reanimated 4 —
   but that's not something to assume without checking `expo-doctor` and
   the project's actual `app.config.js` first.
2. **Upgrade one SDK version at a time** (54→55→56→57), not straight to
   latest — `npx expo install expo@latest --fix` will happily jump past
   several versions at once with no warning, confirmed the hard way
   during this exact upgrade (it silently landed on SDK 57 when 55 was
   the actual target; caught only by checking the resolved version
   afterward). Pin explicitly instead: `npx expo install expo@"~55.0.0" --fix`.
3. **Commit after each successful version bump.** If a later step needs
   more work than expected, this keeps a clean rollback point instead of
   several stacked, entangled changes.
4. **Real device testing gets genuinely harder while mid-upgrade.**
   Expo Go on a physical iOS device only ever runs the *one* SDK version
   it's currently built for — there's no way to have "SDK 55 Expo Go" and
   "SDK 57 Expo Go" both installed side by side. For a project sitting on
   an intermediate SDK version with no matching Expo Go available,
   `sign.expo.dev` can produce a real, working build for that exact SDK
   version, signed with a free Apple ID (no paid developer account
   needed just for this) — but the resulting certificate expires after
   about a week. Given SDK 56 and 57 are both officially described as
   low-risk, non-breaking upgrades, this project's own upgrade relied on
   `expo-doctor` and `tsc --noEmit` alone for those two intermediate
   steps, saving the real device test for landing on SDK 57 itself
   (where Expo Go just works again with zero extra setup) — a reasonable
   trade for a low-risk step, not a default to reach for on every future
   upgrade regardless of risk.
5. [Anthropic's `expo-upgrade` skill](https://github.com/expo/skills) (for
   Claude Code) automated most of the actual package-version and
   config-file work across these steps. One install snag worth knowing:
   `/plugin marketplace add expo/skills` fails outright if Git doesn't yet
   trust GitHub's SSH host key (fix: `ssh -T git@github.com` once,
   answering "yes" to the fingerprint prompt) — and even past that, the
   default SSH-based clone fails again for anyone without a personal
   SSH key registered on GitHub, since marketplace repos are public and
   read-only and never actually needed SSH authentication in the first
   place (fix: add the marketplace via its explicit HTTPS URL instead,
   `/plugin marketplace add https://github.com/expo/skills.git`). A
   further snag specific to this one repository: it has a git submodule
   pointing to a private Expo-internal repo, which breaks the marketplace
   clone entirely regardless of HTTPS vs SSH — worked around by cloning
   with `--no-recurse-submodules` and copying just the skill's own folder
   (found under `expo-upgrade/`, not `upgrading-expo/` as the published
   plugin name might suggest) directly into `~/.claude/skills/`. The
   broken submodule (an internal eval harness) isn't referenced by the
   skill itself, so skipping it lost nothing.

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
Reanimated). SDK 54+ installs Reanimated 4, which requires the New
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

### Gotcha #12: A live match's raw data has no direct stream URL — the watch page has to be built from the league slug

Suggested by a friend testing via TestFlight: make the "LIVE" label
tappable, opening the actual live broadcast. Checked a real live event's
complete raw response first rather than assume a `streams` field existed
(a commonly-cited field for this API in third-party wrapper docs, but
that's someone else's unconfirmed claim) — confirmed it genuinely isn't
there; the event object is just team/score/record data, nothing
stream-related at all.

What actually works, confirmed against real, currently-indexed
lolesports.com pages (not a guess): `https://lolesports.com/live/
{leagueSlug}` — e.g. `lolesports.com/live/lcs`. `getLiveWatchUrl()` (in
`lolesportsClient.ts`) builds this from the same `league.slug` every
`ScheduleEvent` already carries. `BracketRounds` specifically needed the
existing `lolesportsSlugForRegion()` mapping exported for this too, since
a `BracketMatch` doesn't carry its own league slug the way a
`ScheduleEvent` does — reused rather than duplicated, so CBLOL's known
non-obvious slug (`cblol-brazil`) stays correct here automatically.

### Gotcha #13: "first to 3 losses is eliminated" is confirmed WRONG for LCP's actual Swiss format — and the active-stage picker needed a second real fix too

Two real bugs, both caught from actual user reports during the LCP
Swiss stage's final week, both fixed by getting the real data rather
than reasoning from screenshots or secondary research alone.

**Bug 1 — the active-stage picker jumped to a later stage too early.**
The original `pickActiveStage` picked the *last* stage with any real
(non-`"TBD"`) team seeded in — but Play-Ins gets partially seeded
*incrementally*, as soon as enough Swiss results are mathematically
known, well before Swiss's own last match happens. That made the whole
Bracket section vanish while Swiss still had a game left to play, since
Play-Ins isn't built out yet. Fixed: "current" is now the *earliest*
stage that has real teams AND at least one unfinished match — Swiss
stays current for as long as it has anything left to play, however far
in advance a later stage has already started filling in.

**Bug 2 — the "3 losses eliminates" half of the qualify/eliminate rule
is provably wrong, not just imprecise.** Traced every one of LCP's real
Swiss matches by hand (`node` script, not guesswork) after a user
noticed a team (Ground Zero Gaming, 1-3) still alive and seeded into
Play-Ins despite already having 3 losses. The real pattern: a team that
loses 3 *straight* games with zero wins mixed in (Fukuoka SoftBank
HAWKS, 0-3 in exactly 3 games) is genuinely, cleanly eliminated. But two
teams that each won one game on the way to their 3rd loss (reaching
"1-3" only on their 4th game) were **not** eliminated — they advanced to
a decider match against each other instead. The real rule depends on
the specific bracket path a team took, not just a loss tally — something
neither the original six-source research nor a deeper Liquipedia dive
fully captured, and not something to trust without seeing it fail on
real data.

Fixed conservatively rather than by reverse-engineering the full real
rule: `computeSwissStandingsFromMatches` no longer ever produces
`'eliminated'` — only `'qualified'` (which IS confirmed solid: every team
that hit exactly 3 wins stopped there and matched the official
"ADVANCES" list exactly) or `'active'`. A wrong ✕ telling someone a team
is out when they're not is worse than showing no icon at all. The UI's
own eliminated-icon rendering in `OverallStandings.tsx` was left
untouched rather than deleted — it's simply dormant now, and will work
correctly again the moment this gets revisited with the real full rule
mapped out.

### Gotcha #14: Overall Standings needed the exact same "disappear once moot" treatment as the Bracket section

`fetchStandingsSections` always read `stages[0]` directly, with no
concept of whether that stage was still the current one — unlike
`fetchBracketData`, which already tracked the genuinely active stage via
`pickActiveStage`. That meant once a Swiss stage actually finished and
the tournament moved on to Play-Ins/Playoffs, Overall Standings would
have kept showing a frozen, stale table (lock/eliminated icons included)
that no longer described the current picture at all — a real correctness
gap, caught before it happened rather than after, thanks to a direct
question about exactly this scenario.

Fixed by reusing the same `pickActiveStage` logic already proven for the
Bracket, rather than inventing a second way to answer the same question:
`fetchStandingsSections` now checks whether `stages[0]` is still the
stage `pickActiveStage` would actually pick. If yes (true for every
normal round-robin region, which only ever has one stage anyway, and
true for Swiss for as long as it has anything left to play), standings
show exactly as before. If the tournament has genuinely moved past it,
this returns empty, and `OverallStandings` — which now owns its own
`Section` wrapper instead of being wrapped externally by
`RegionHomeScreen`, the same restructuring `BracketRounds` already
went through — disappears entirely, title included, rather than show
something stale.

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

- **CBLOL's Playoffs bracket** — the same elimination-bracket system
  built for LCK, LPL, and LEC (see
  [The Bracket system](#8-the-bracket-system)) hasn't been built for
  CBLOL yet, on hold specifically until its own Playoffs teams are
  finalized — not a technical gap, the same "don't build against a
  guess" reasoning as everything else here.
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
