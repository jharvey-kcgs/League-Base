# League of Legends Esports Companion App — Project Brief

## Goal
A personal, local-only (no custom backend) mobile app built with **Expo (React Native) / Expo Go** that tracks LCS, LEC, LCK, and LPL. On first launch the user picks a favorite team, which sets the app's color theme and becomes the default home screen. A drawer/hamburger menu lets the user browse any region → any team, using the same reusable team screen.

No paid hosting, no custom database server. All data comes from two free, public, no-key-required sources, fetched client-side and cached locally.

---

## Data Sources

### 1. lolesports.com unofficial API
No API key required. Powers: leagues, schedules, live/completed match results, series scores, standings.
Reference wrapper libraries to study for endpoint shapes: `lol-esports-api` (JS/TS, GitHub: jpteixeira99/lol-esports-api), `lolesports_api` (Python, GitHub: rigelifland/lolesports_api).
Note: undocumented/unofficial — build in caching + graceful fallback since it can change without notice.

### 2. Leaguepedia Cargo API (lol.fandom.com)
MediaWiki Cargo query API — free, structured, JSON over HTTP. This is the backbone of the app; it removes almost all manual data entry.
Key tables:
- `ScoreboardGames` — every pro game: Team1/Team2, scores, winner/loser, picks/bans, **VOD link field**, patch, date
- `ScoreboardPlayers` — per-player per-game stats, joins to ScoreboardGames
- Roster / roster-change tables — current rosters + historical transfers per team
Rate limit: be polite, ~1 request per 2 seconds, include attribution per Leaguepedia's terms.

### 3. Manual/static (one-time setup only, not ongoing)
- Team → hex color theme (for the theming feature)
- Team → official Twitter/X handle (for embeds)
- Team → logo image URL
- Region → list of current teams (occasionally changes at season boundaries — a small config file to revisit each split)

### 4. Twitter/X
No paid API needed — use the official embeddable timeline widget (`platform.twitter.com/widgets.js` markup) inside a `WebView`, pointed at each team's handle.

### 5. YouTube (optional, for VOD fallback)
Leaguepedia's `ScoreboardGames.VOD` field should cover most matches directly. If gaps exist, YouTube Data API free tier can search official channel uploads by team/date as backup.

---

## App Structure

**Onboarding (first launch only):**
- Team picker (grouped by region) → save `favoriteTeamId` to AsyncStorage → derive theme colors → navigate to home

**Navigation:**
- Root: Drawer navigator
  - "My Team" (default/pinned) → `TeamScreen(favoriteTeamId)`
  - Region drawer items: LCS / LEC / LCK / LPL → each opens a Stack
    - Region home screen: region standings, upcoming/recent matches, region-relevant tweets, list of teams
    - Tap a team → `TeamScreen(teamId)` (same reusable component used for favorite team)

**`TeamScreen` (reusable, parameterized by teamId):**
- Roster (current, sourced from Leaguepedia)
- Recent matches + W/L record + region ranking
- Champion pick rate (aggregated by querying `ScoreboardGames` picks for that team over a date range, tallied client-side or cached)
- VOD links per match (from `ScoreboardGames.VOD`)
- Twitter embed (WebView, team handle)
- Theme applied if this is the favorite team; neutral/region theme otherwise

**Tech stack:**
- Expo / React Native
- React Navigation (Drawer + Stack)
- AsyncStorage (or expo-sqlite) for local caching + favorite team + theme
- WebView for Twitter embeds
- Simple in-memory or cached aggregation for champion pick rates (no server-side compute)

---

## Open Questions / Fields to Track Down Before Coding

1. **Team roster** — confirm current 2026 team lists for all four regions (they can shift at split boundaries): LCS, LEC, LCK, LPL.
2. **Team colors** — a hex code per team for the theming feature (pull from team branding/logos).
3. **Team Twitter/X handles** — official handle per team, for the embed widget.
4. **Team logos** — image URLs or assets per team.
5. **Leaguepedia team name matching** — Leaguepedia team names/page slugs don't always match lolesports.com's team IDs exactly (rebrands, sponsor name changes). Need a small mapping table between the two sources per team.
6. **Champion pick-rate window** — decide the timeframe (current split only? full season? rolling last N games?) since this determines the Cargo query's date filter.
7. **Update frequency** — how often should the app refetch (on app open only? pull-to-refresh? background polling)? Affects whether local caching is enough or if a lightweight scheduled refresh is worth adding.
8. **Offline behavior** — what should render if a fetch fails (last cached data with a "stale" indicator is the simplest approach).
9. **VOD language/region variant** — lolesports/Leaguepedia VOD links are typically the official English broadcast; confirm that's acceptable vs. wanting region-specific language VODs.

---

## Explicitly Out of Scope (for this build)
- Custom backend/server or hosted database
- Paid Twitter/X API usage
- Riot's official commercial esports data (GRID/riotesportsdata.com) — not accessible for a free hobby app
- Scraping Sheep Esports or Tracker.gg (no public API, fragile/ToS risk) — not used as a source
