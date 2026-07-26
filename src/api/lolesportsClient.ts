/**
 * Client for lolesports.com's unofficial esports API. Undocumented and not
 * guaranteed stable — Riot has explicitly said this isn't a public API and
 * offers no backwards-compatibility guarantee. If schedule/live data stops
 * working, the endpoint shapes below are the first thing to re-verify
 * (open lolesports.com, watch the Network tab for XHR calls to
 * esports-api.lolesports.com).
 *
 * Base URL and API key are the same ones lolesports.com's own web client
 * uses — this isn't bypassing any auth, just using the public,
 * unauthenticated-in-practice key every unofficial wrapper for this API
 * also uses.
 */

import { withCache } from './cache';

const API_BASE = 'https://esports-api.lolesports.com/persisted/gw';
const API_KEY = '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z';
const DEFAULT_LOCALE = 'en-US';

/** How long each endpoint's response stays cached before a fresh fetch is
 * allowed. Reasoned per how often that data actually changes — not one
 * blanket number for everything. getLive is deliberately absent: live
 * match state needs to always be current, caching it would defeat the
 * point of the endpoint. */
const CACHE_TTL_BY_PATH: Record<string, number> = {
  getLeagues: 24 * 60 * 60 * 1000, // 24h — essentially static, changes maybe once a year
  getTournamentsForLeague: 6 * 60 * 60 * 1000, // 6h — a new one appears roughly once per split
  getSchedule: 5 * 60 * 1000, // 5 min — needs to reflect live/just-finished state reasonably fast
  getStandings: 15 * 60 * 1000, // 15 min — updates once per completed match, not continuously
  getEventDetails: 60 * 60 * 1000, // 1h — VODs for a completed match; long-lived once posted, but
  // short enough that a just-posted VOD doesn't stay hidden for most of a day
};

async function apiGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const query = new URLSearchParams({ hl: DEFAULT_LOCALE, ...params }).toString();
  const url = `${API_BASE}/${path}?${query}`;

  const doFetch = async (): Promise<T> => {
    const res = await fetch(url, {
      headers: { 'x-api-key': API_KEY },
    });
    if (!res.ok) {
      throw new Error(`lolesports API ${path} failed: HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  };

  const ttl = CACHE_TTL_BY_PATH[path];
  if (ttl === undefined) {
    return doFetch();
  }
  return withCache(url, ttl, doFetch);
}

// --- Types (best-effort from public documentation of this undocumented
// API — fields are optional/defensive where the exact shape wasn't
// confirmable, rather than assumed) ---

export interface LeagueSummary {
  id: string;
  slug: string;
  name: string;
}

export type MatchState = 'unstarted' | 'inProgress' | 'completed';

export interface ScheduleTeam {
  name: string;
  code: string;
  image?: string;
  result?: { outcome: 'win' | 'loss' | null; gameWins: number };
}

export interface ScheduleEvent {
  // Unconfirmed whether the real API actually has a top-level id on the
  // event itself — match.id below is the one documented by every wrapper
  // library for this API, so that's the one to key React lists on.
  id?: string;
  startTime: string;
  state: MatchState;
  blockName?: string;
  league: { id: string; slug: string; name: string };
  // Optional — confirmed via a real crash (LCS's Split 3, first day) that
  // unscheduled/TBD placeholder events can omit this entirely, not just
  // fields within it. fetchSchedule() filters these out at the source, but
  // the type stays honest so any future unguarded access (event.match.x
  // instead of event.match?.x) is a compile error, not a repeat of that
  // crash.
  match?: {
    id: string;
    teams: ScheduleTeam[];
    strategy?: { type: string; count: number };
  };
}

// --- Leagues (rarely changes — cached in memory for the process lifetime,
// not persisted. A shared, persisted, TTL-aware cache for every endpoint
// here is the next piece to build, per the season-calendar plan.) ---

let leaguesCache: LeagueSummary[] | null = null;

export async function fetchLeagues(): Promise<LeagueSummary[]> {
  if (leaguesCache) return leaguesCache;
  const data = await apiGet<{ data: { leagues: LeagueSummary[] } }>('getLeagues');
  leaguesCache = data.data.leagues;
  return leaguesCache;
}

/** Resolves a region slug ("lcs", "lec", "lck", "lpl") to the lolesports
 * API's internal league ID by matching against the live getLeagues list —
 * deliberately not hardcoded, since this API is undocumented and IDs
 * aren't something to bake in without a way to verify them stay correct. */
export async function resolveLeagueId(regionSlug: string): Promise<string | null> {
  const leagues = await fetchLeagues();
  const match = leagues.find((l) => l.slug.toLowerCase() === regionSlug.toLowerCase());
  return match?.id ?? null;
}

// --- Schedule ---

export async function fetchSchedule(leagueId: string): Promise<ScheduleEvent[]> {
  const data = await apiGet<{ data: { schedule: { events: ScheduleEvent[] } } }>('getSchedule', {
    leagueId,
  });
  const events = data.data.schedule.events ?? [];
  // Some events — unscheduled/TBD placeholders, confirmed on LCS's brand-new
  // Split 3 — come back with no `match` object at all, not just missing
  // fields inside one. Every consumer of this function (UpcomingGames,
  // RecentGames, computeRecord, fetchScheduleForTeam, etc.) assumes
  // event.match exists, so filtering these out here — once, at the source —
  // protects all of them instead of needing the same guard repeated in
  // every single component.
  const filtered = events.filter((e) => e.match && Array.isArray(e.match.teams));

  return filtered;
}

/** Convenience wrapper: schedule events for a region, resolving the league
 * ID first. Returns an empty array (not a throw) if the region slug
 * doesn't resolve, so a screen can show "no data" rather than crash. */
export async function fetchScheduleForRegion(regionSlug: string): Promise<ScheduleEvent[]> {
  const leagueId = await resolveLeagueId(regionSlug);
  if (!leagueId) return [];
  return fetchSchedule(leagueId);
}

// --- Live games (across all leagues — filter client-side by league slug) ---

export async function fetchLive(): Promise<ScheduleEvent[]> {
  const data = await apiGet<{ data: { schedule: { events: ScheduleEvent[] } } }>('getLive');
  return data.data.schedule.events ?? [];
}

// --- VODs (per-game, via getEventDetails on a completed match) ---

export interface GameVod {
  gameNumber: number;
  /** Raw video/VOD ID from the API — build a real URL with vodUrl() below,
   * don't assume this is already a full link. */
  parameter: string;
  /** "youtube" or "twitch" confirmed seen in practice — vodUrl() needs this
   * to build the right kind of link; a Twitch ID in a YouTube URL (or vice
   * versa) just gives a broken link. */
  provider: string;
}

/** Per-game VOD links for one completed match. Coverage is genuinely
 * inconsistent — confirmed directly (not just suspected) that lolesports.com
 * itself has VODs for some regions/matches and not others (LEC yes, LPL no
 * — Tencent holds exclusive LPL broadcast rights and doesn't distribute
 * through lolesports.com/YouTube at all, so an empty result there is
 * expected, not a bug). Returns [] rather than throwing on any failure —
 * missing VODs for one match shouldn't break the ones that do have them. */
export async function fetchGameVods(matchId: string): Promise<GameVod[]> {
  try {
    const data = await apiGet<{
      data: {
        event: {
          // Confirmed via a real response: games sits under match, not
          // directly on the event — the original guess had this one level
          // too shallow, which is why every match came back "no VOD"
          // despite VODs genuinely existing.
          match?: {
            games?: Array<{
              number: number;
              vods?: Array<{ parameter: string; locale: string; provider: string }>;
            }>;
          };
        };
      };
    }>('getEventDetails', { id: matchId });

    const games = data.data.event?.match?.games ?? [];
    const result: GameVod[] = [];
    for (const g of games) {
      const vods = g.vods ?? [];
      if (vods.length === 0) continue;
      // Each game has one VOD per broadcast language (confirmed: German,
      // Greek, English, Spanish, Hungarian-on-Twitch, Polish, Serbian all
      // showed up for a single LEC game) — picking vods[0] grabbed
      // whichever language happened to be listed first, not English.
      const english = vods.find((v) => v.locale?.toLowerCase().startsWith('en'));
      const chosen = english ?? vods[0];
      result.push({ gameNumber: g.number, parameter: chosen.parameter, provider: chosen.provider });
    }
    return result;
  } catch (err) {
    if (__DEV__) {
      console.log('[fetchGameVods] threw for', matchId, ':', err);
    }
    return [];
  }
}

/** The API gives a raw video/VOD ID ("parameter"), not a full URL — and
 * confirmed the provider genuinely varies per language (YouTube for most,
 * Twitch seen for at least one), so the URL format has to match. */
export function vodUrl(parameter: string, provider: string): string {
  if (provider === 'twitch') {
    return `https://www.twitch.tv/videos/${parameter}`;
  }
  return `https://www.youtube.com/watch?v=${parameter}`;
}

// --- Per-team schedule (Record W/L, Recent & Upcoming Matches) ---

/** Schedule events involving one specific team, scoped to the CURRENT
 * tournament (split) only — matched by lolesportsSlug against the live
 * API's team "code" field, confirmed to line up correctly (e.g. Team
 * Liquid's stored slug "TLAW" showed up as "TLAW" in real schedule rows).
 *
 * getSchedule?leagueId= returns events across the WHOLE season, not just
 * the current split — without this date-range filter, a team's "record"
 * silently became its cumulative record across every split played this
 * year (e.g. G2 showing 9-2 on the first day of a new split, when it
 * should read 0-0 until they'd actually played a game in it). */
export async function fetchScheduleForTeam(regionSlug: string, teamCode: string): Promise<ScheduleEvent[]> {
  const leagueId = await resolveLeagueId(regionSlug);
  if (!leagueId) return [];

  // The schedule itself is essential — if this fails, there's genuinely
  // nothing to show, so let it throw and surface as a real error.
  const allEvents = await fetchSchedule(leagueId);
  const teamEvents = allEvents.filter((e) => e.match?.teams?.some((t) => t?.code === teamCode));

  // Scoping to the current split is best-effort, not essential — if
  // tournament resolution fails for any reason, the team's full (unscoped)
  // schedule is a better fallback than a hard error over something
  // secondary. This was actually happening for LCS specifically: since
  // RegionHomeScreen's Upcoming/Recent Games never call
  // fetchTournamentsForLeague (only Standings does), only the team-page
  // path — which bundled both calls together — was breaking.
  let tournaments: Tournament[];
  try {
    tournaments = await fetchTournamentsForLeague(leagueId);
  } catch {
    return teamEvents;
  }

  const current = pickCurrentTournament(tournaments);
  if (!current) return teamEvents; // can't scope without a resolved tournament — better than showing nothing

  const start = Date.parse(current.startDate);
  const end = Date.parse(current.endDate);
  return teamEvents.filter((e) => {
    const t = Date.parse(e.startTime);
    return t >= start && t <= end;
  });
}

export interface TeamRecord {
  wins: number;
  losses: number;
}

/** Computed from completed events' result.outcome for this team — not a
 * separate API call, since the schedule data already has everything
 * needed. */
export function computeRecord(events: ScheduleEvent[], teamCode: string): TeamRecord {
  let wins = 0;
  let losses = 0;
  for (const event of events) {
    if (event.state !== 'completed') continue;
    const team = event.match?.teams?.find((t) => t?.code === teamCode);
    if (team?.result?.outcome === 'win') wins++;
    if (team?.result?.outcome === 'loss') losses++;
  }
  return { wins, losses };
}

// --- Standings (needs a tournament ID, not a league ID — one more lookup
// than schedule/live needed) ---

export interface Tournament {
  id: string;
  slug: string;
  startDate: string;
  endDate: string;
}

export async function fetchTournamentsForLeague(leagueId: string): Promise<Tournament[]> {
  const data = await apiGet<{ data: { leagues: Array<{ tournaments: Tournament[] }> } }>(
    'getTournamentsForLeague',
    { leagueId }
  );
  return data.data.leagues[0]?.tournaments ?? [];
}

/** Picks whichever tournament's date range includes today. Falls back to
 * the most recently started one if none matches exactly (e.g. a short gap
 * between splits where the API hasn't opened the next tournament yet). */
export function pickCurrentTournament(tournaments: Tournament[]): Tournament | null {
  if (tournaments.length === 0) return null;
  const now = Date.now();
  const current = tournaments.find((t) => {
    const start = Date.parse(t.startDate);
    const end = Date.parse(t.endDate);
    return now >= start && now <= end;
  });
  if (current) return current;
  return [...tournaments].sort((a, b) => Date.parse(b.startDate) - Date.parse(a.startDate))[0];
}

export interface StandingsRow {
  ordinal: number;
  id: string;
  name: string;
  code: string;
  image?: string;
  wins: number;
  losses: number;
}

export interface StandingsGroup {
  /** Section name from the API, e.g. "Legend Group" / "Rise Group" for LCK,
   * "Group Ascend" / "Group Nirvana" for LPL. Empty string for leagues that
   * only have one undivided group (LCS, LEC) — the UI skips the label in
   * that case rather than showing a redundant single heading. */
  name: string;
  rows: StandingsRow[];
}

export async function fetchStandings(tournamentId: string): Promise<StandingsGroup[]> {
  const data = await apiGet<{
    data: {
      standings: Array<{
        stages: Array<{
          sections: Array<{
            name: string;
            rankings: Array<{
              ordinal: number;
              teams: Array<{
                id: string;
                name: string;
                code: string;
                image?: string;
                record?: { wins: number; losses: number };
              }>;
            }>;
          }>;
        }>;
      }>;
    };
  }>('getStandings', { tournamentId });

  // Regular season is stages[0] in practice — playoffs (bracket-shaped, not
  // a ranked table) would be a separate stage and doesn't fit "standings"
  // the way this screen means it. Within that stage, a league can have
  // multiple sections (groups) that each rank independently — LCK splits
  // into Legend/Rise groups, LPL into Ascend/Nirvana — so every section
  // needs its own group in the result, not just sections[0].
  const sections = data.data.standings[0]?.stages?.[0]?.sections ?? [];

  return sections.map((section) => {
    const rows: StandingsRow[] = [];
    for (const rank of section.rankings ?? []) {
      for (const team of rank.teams ?? []) {
        // A brand-new split (LCS's Split 3, which just started, is exactly
        // this case) can have unseeded ranking slots — no team assigned
        // yet — represented as a null/undefined entry rather than an
        // omitted one. Without this guard, team.id below throws
        // "Cannot read property 'id' of undefined" the moment any region
        // has even one such slot, which is what was actually happening.
        if (!team) continue;
        rows.push({
          ordinal: rank.ordinal,
          id: team.id,
          name: team.name,
          code: team.code,
          image: team.image,
          wins: team.record?.wins ?? 0,
          losses: team.record?.losses ?? 0,
        });
      }
    }
    rows.sort((a, b) => a.ordinal - b.ordinal);
    return { name: section.name ?? '', rows };
  });
}

/** Convenience wrapper: resolves league -> current tournament -> standings
 * in one call. Returns an empty array (not a throw) at any step that comes
 * up empty, so a screen can show "no data" rather than crash. */
export async function fetchStandingsForRegion(regionSlug: string): Promise<StandingsGroup[]> {
  const leagueId = await resolveLeagueId(regionSlug);
  if (!leagueId) return [];
  const tournaments = await fetchTournamentsForLeague(leagueId);
  const current = pickCurrentTournament(tournaments);
  if (!current) return [];
  return fetchStandings(current.id);
}
