# League Base — Setup & Contributor Guide

League Base is a personal, local-first companion app for LCS, LEC, LCK, and
LPL: pick a favorite team on first launch, get a Home screen themed in that
team's colors with their roster and socials, and (eventually) browse every
other team by region. Built with React Native + Expo, developed on Windows.
No custom backend — everything ships in the app or comes from free public
APIs.

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

---

## 2. Install

This project's root config files (`package.json`, `app.json`,
`babel.config.js`, `tsconfig.json`) were written by hand rather than
generated with `npx create-expo-app` — that tool's default template comes
bundled with Expo Router (file-based navigation, an `app/` folder, example
tab screens), which doesn't match how this project is wired (a single
`App.tsx` driving React Navigation directly). Skipping it avoids fighting
two different navigation systems. See
[Gotcha #1](#gotcha-1-no-package-json--why-we-skip-create-expo-app) if
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
  @react-native-async-storage/async-storage @expo/vector-icons expo-font
```

Also add `babel.config.js`'s `react-native-worklets/plugin` line (already in
the config file I gave you) if you're merging by hand rather than replacing
the whole file. Reanimated 4 (required for the New Architecture — see
`app.json`'s `newArchEnabled`) moved its Babel plugin into the separate
`react-native-worklets` package, so both the install *and* the plugin path
matter — an older `react-native-reanimated/plugin` reference will fail with
`Cannot find module 'react-native-worklets/plugin'`. Babel config changes
need a full cache clear to take effect: `npx expo start --clear`, not just
a reload.

### What's actually installed, and why

| Package | What it's for |
|---|---|
| `expo`, `react`, `react-native` | Core framework |
| `@react-navigation/native`, `@react-navigation/native-stack` | Screen navigation — Onboarding, Home, Settings and its four sub-pages |
| `react-native-screens`, `react-native-safe-area-context` | Required by React Navigation, not used directly |
| `@react-native-async-storage/async-storage` | Local storage for favorite team + light/dark mode — the entire app's persisted state runs on this |
| `@expo/vector-icons` | The cog and hamburger icons in Home's header |
| `expo-font` | Font-loading infrastructure for the header typeface — currently a no-op until a font file is actually added, see [Fonts](#6-fonts) |

Nothing here yet for match data, since that layer isn't built — no HTTP
client beyond what's built into `fetch`. `uuid`, date pickers, and similar
will show up once match schedules / VOD lists need them.

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
App.tsx                            Navigation stack, ThemeProvider, font
                                    loading, first-launch onboarding gate

assets/
  icon.png                          App icon (1024x1024, from LeagueBaseLogo)
  adaptive-icon.png                 Android adaptive icon foreground (same
                                     logo, safe-zone padded, transparent bg)
  images/
    lanes/                          Top/Jungle/Mid/ADC/Support role icons
                                     (transparent PNG, gold/black)
    coach.png                       Headset icon for coaching staff rows —
                                     white silhouette, transparent bg, tinted
                                     in code rather than a fixed color (see
                                     Icons section)
  fonts/                           Empty until a display font file is added
                                    — see Fonts section
  data/teams.json                  All 42 teams across 4 regions: colors,
                                    logos, socials, full rosters + coaches

src/
  navigation/
    types.ts                         Root Stack / Drawer / RegionStack param
                                      lists + composite prop helpers
    RootDrawer.tsx                    My Team + LCS/LEC/LCK/LPL
    RegionStack.tsx                   Factory: RegionHome -> Team, one
                                       instance per region

  screens/
    OnboardingScreen.tsx            First-launch team picker, grouped by region
    HomeScreen.tsx                  Cog / title / hamburger header + favorite
                                     team's overview (renders TeamOverview)
    RegionHomeScreen.tsx            Team grid for one region (News/Games/
                                     Standings land in step 4)
    TeamScreen.tsx                  Any team's overview — same TeamOverview
                                     HomeScreen uses, reached via RegionStack
    SettingsScreen.tsx              Nested menu: Profile, Theme, About, FAQ, Data
    ProfileSettingsScreen.tsx       Re-run the team picker to change favorite
    ThemeSettingsScreen.tsx         Light / dark / match-device
    AboutScreen.tsx                 What the app does, where data comes from
    FAQScreen.tsx                   Common questions
    DataSettingsScreen.tsx          Export / import / delete app data

  components/
    AppText.tsx                     Drop-in replacement for RN's <Text> —
                                     applies the header font where relevant.
                                     Every screen imports Text from here.
    TeamOverview.tsx                 The full team-detail view (banner,
                                     roster, coaches, socials) — shared by
                                     HomeScreen and TeamScreen
    TeamTile.tsx                     Logo-chip + name tile — shared by
                                     TeamPickerGrid and RegionHomeScreen
    TeamPickerGrid.tsx               Team-selection grid (all regions),
                                     used by Onboarding and Settings > Profile
    LaneIcon.tsx                     Maps a roster role string to its lane
                                     icon, with a small dot badge for subs

  theme/
    ThemeContext.tsx                 App-wide theme: favorite team's colors
                                      + light/dark mode, both persisted
    deriveTheme.ts                   Picks colors from team.colors + mode
    fonts.ts                         Font-loading toggle — see Fonts section

  data/
    teamsStore.ts                    Reads teams.json, exposes lookups by
                                      id/region
    favoriteTeam.ts                  AsyncStorage: favoriteTeamId + theme
                                      mode preference

  utils/
    colorContrast.ts                 Picks readable black/white text
                                      against an arbitrary team color

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
- **Change the header font** → `src/theme/fonts.ts` (see below)

---

## 5. Icons

App icon and adaptive icon come from a single square logo — see
`assets/icon.png` / `assets/adaptive-icon.png`, wired up in `app.json`'s
`icon` and `android.adaptiveIcon` fields. The adaptive icon foreground was
generated with extra padding around the shield (Android's launcher masks
the outer ring into a circle, squircle, or rounded square depending on the
device, so content needs to stay inside a safe zone) — regenerate it the
same way if the logo ever changes rather than reusing `icon.png` directly.

In-app icons (lane roles, the coach headset) are single-color transparent
PNGs tinted at render time via RN's `tintColor` style, rather than baked-in
colors — `<Image source={...} style={{ tintColor: colors.textMuted }} />`.
That's deliberate: a fixed color (black, in the coach icon's original form)
can disappear against the app's near-black dark background, and tinting
from the current theme color means it's always legible in both light and
dark mode without needing a separate asset per mode.

## 6. Fonts

`AppText`'s bold/heavy headers point at **"League"** from FontGet — a
free-for-commercial-use lookalike inspired by the older LoL logo. This is
**not** the real in-client Beaufort font, which is a commercial typeface
(Nick Shinn / Shinn Type Foundry, licensed to Riot via Monotype) that isn't
legitimately redistributable. The app runs fine on the system font until
the real file is added:

1. Download from https://www.fontget.com/font/league/, check the actual
   filename inside the zip (likely `League-Regular.ttf`).
2. Drop it into `assets/fonts/`.
3. In `src/theme/fonts.ts`, uncomment the "Real version" block, delete the
   "No-op version" block below it.
4. Restart `expo start` — font changes need a full reload, not fast refresh.

Body text (roster names, FAQ answers) intentionally stays on the system
font even once League is enabled — League only ships one real weight, no
bold/heavy, so it's reserved for headers where a display face fits.

---

## 7. Known setup gotchas

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
Architecture (already on — see `app.json`'s `newArchEnabled`) and moved its
Babel plugin into a separate `react-native-worklets` package. Symptom:

```
Error: [BABEL]: Cannot find module 'react-native-worklets/plugin'
```

Fix: `npx expo install react-native-worklets`, then make sure
`babel.config.js` points at `'react-native-worklets/plugin'` (not the old
`'react-native-reanimated/plugin'`), then `npx expo start --clear` — Babel
config changes don't take effect on a plain reload.

---

## 8. Roadmap (intentionally not built yet)

- Region home content beyond the team grid — Region News (Twitter/X embed,
  region-level `twitter`/`youtube` fields already in `teams.json`),
  Upcoming Games, Overall Standings. Same placeholder-card treatment
  `TeamOverview` already uses for Record/Matches/VODs.
- Live match results, standings, and VOD links — lolesports.com +
  Leaguepedia Cargo API clients, plus a season-calendar-driven cache so
  roster data refreshes more often between splits than mid-season
- Twitter/X WebView embed for LCS/LEC/LCK teams; "View on Weibo"
  external-link button for LPL teams (Home already does the external-link
  version for all three — the embedded-timeline upgrade is Twitter-only)
- The actual League display font file (Section 6) — not bundled for
  licensing reasons
- TestFlight / production builds — hasn't come up yet; ask when you're
  ready to move past Expo Go testing
