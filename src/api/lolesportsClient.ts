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

const API_BASE = 'https://esports-api.lolesports.com/persisted/gw';
const API_KEY = '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z';
const DEFAULT_LOCALE = 'en-US';

async function apiGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const query = new URLSearchParams({ hl: DEFAULT_LOCALE, ...params }).toString();
  const res = await fetch(`${API_BASE}/${path}?${query}`, {
    headers: { 'x-api-key': API_KEY },
  });
  if (!res.ok) {
    throw new Error(`lolesports API ${path} failed: HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
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
  id: string;
  startTime: string;
  state: MatchState;
  blockName?: string;
  league: { id: string; slug: string; name: string };
  match: {
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
  return data.data.schedule.events ?? [];
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
