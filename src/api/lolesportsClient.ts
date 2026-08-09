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
import type { Region } from '../types/team';

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

/** Our internal Region code doesn't always match lolesports.com's actual
 * league slug — confirmed via a real failure, not a guess: CBLOL's real
 * slug is "cblol-brazil", not the "cblol" a naive lowercase of the region
 * code produces (which is what every function here used to do, LCS/LEC/
 * LCK/LPL only worked because their real slugs happen to equal their
 * lowercased region code). Any future region with a similarly non-obvious
 * slug goes here too, rather than another blind guess. */
const REGION_SLUG_OVERRIDES: Partial<Record<Region, string>> = {
  CBLOL: 'cblol-brazil',
};

function lolesportsSlugForRegion(region: Region): string {
  return REGION_SLUG_OVERRIDES[region] ?? region.toLowerCase();
}

/** Resolves a Region to the lolesports API's internal league ID by
 * matching against the live getLeagues list — deliberately not hardcoded,
 * since this API is undocumented and IDs aren't something to bake in
 * without a way to verify they stay correct. */
export async function resolveLeagueId(region: Region): Promise<string | null> {
  const regionSlug = lolesportsSlugForRegion(region);
  const leagues = await fetchLeagues();
  const match = leagues.find((l) => l.slug.toLowerCase() === regionSlug.toLowerCase());

  if (!match && __DEV__) {
    console.log('[resolveLeagueId] no match for', JSON.stringify(regionSlug));
    console.log('[resolveLeagueId] available leagues:', JSON.stringify(leagues, null, 2));
  }

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
 * ID first. Returns an empty array (not a throw) if the region doesn't
 * resolve, so a screen can show "no data" rather than crash. */
export async function fetchScheduleForRegion(region: Region): Promise<ScheduleEvent[]> {
  const leagueId = await resolveLeagueId(region);
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
export async function fetchScheduleForTeam(region: Region, teamCode: string): Promise<ScheduleEvent[]> {
  const leagueId = await resolveLeagueId(region);
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
  const scoped = teamEvents.filter((e) => {
    const t = Date.parse(e.startTime);
    return t >= start && t <= end;
  });

  return scoped;
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
  /** Only meaningful for a Swiss-stage table (computeSwissStandingsFromMatches
   * below) — a regular round-robin group stage has no qualify/eliminate
   * threshold, so this is always 'active' there. Confirmed specifically for
   * LCP's 2026 Split 3 Swiss stage, across six independent sources: first to
   * 3 wins qualifies for Playoffs, first to 3 losses is eliminated. If this
   * ever expands to another Swiss-format region, its threshold isn't
   * something to assume matches LCP's without checking. */
  status: 'active' | 'qualified' | 'eliminated';
}

export interface StandingsGroup {
  /** Section name from the API, e.g. "Legend Group" / "Rise Group" for LCK,
   * "Group Ascend" / "Group Nirvana" for LPL. Empty string for leagues that
   * only have one undivided group (LCS, LEC) — the UI skips the label in
   * that case rather than showing a redundant single heading. */
  name: string;
  rows: StandingsRow[];
}

interface RawStandingsMatchTeam {
  id: string;
  name: string;
  code: string;
  image?: string;
  result: { outcome: 'win' | 'loss' | null; gameWins: number } | null;
}

interface RawStandingsMatch {
  id: string;
  state: MatchState;
  teams: Array<RawStandingsMatchTeam | null>;
}

interface RawStandingsSection {
  name: string;
  rankings: Array<{
    ordinal: number;
    teams: Array<{
      id: string;
      name: string;
      code: string;
      image?: string;
      record?: { wins: number; losses: number };
    } | null>;
  }>;
  // Confirmed via a real LCP response: a Swiss-stage section has this
  // populated with real completed match results, but its `rankings` above
  // comes back completely empty regardless — Riot's API just doesn't
  // pre-compute a ranked table for Swiss stages the way it does for a
  // round-robin group stage. Used as a fallback in fetchStandings.
  matches?: RawStandingsMatch[];
}

/** Used by fetchStandings specifically (always reads stages[0] — the
 * regular-season/Swiss stage a standings table means). fetchBracketData
 * uses its own separate fetchActiveStage instead, since the bracket needs
 * whichever stage is genuinely current right now, not always stages[0]. */
async function fetchStandingsSections(tournamentId: string): Promise<RawStandingsSection[]> {
  let data: { data: { standings: Array<{ stages: Array<{ sections: RawStandingsSection[] }> }> } };
  try {
    data = await apiGet('getStandings', { tournamentId });
  } catch (err) {
    if (__DEV__) {
      console.log('[fetchStandingsSections] apiGet THREW for tournamentId', JSON.stringify(tournamentId), ':', err);
    }
    throw err;
  }
  // Regular season is stages[0] in practice — playoffs (bracket-shaped, not
  // a ranked table) would be a separate stage. Within that stage, a league
  // can have multiple sections (groups) that each rank independently —
  // LCK splits into Legend/Rise groups, LPL into Ascend/Nirvana.
  return data.data.standings[0]?.stages?.[0]?.sections ?? [];
}

export async function fetchStandings(tournamentId: string): Promise<StandingsGroup[]> {
  const sections = await fetchStandingsSections(tournamentId);
  return sections.map((section) => {
    const hasRealRankings = (section.rankings ?? []).length > 0;
    const rows: StandingsRow[] = hasRealRankings
      ? rowsFromRankings(section.rankings)
      : computeSwissStandingsFromMatches(section.matches ?? []);
    return { name: section.name ?? '', rows };
  });
}

function rowsFromRankings(rankings: RawStandingsSection['rankings']): StandingsRow[] {
  const rows: StandingsRow[] = [];
  for (const rank of rankings) {
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
        status: 'active',
      });
    }
  }
  rows.sort((a, b) => a.ordinal - b.ordinal);
  return rows;
}

/** Fallback for a Swiss stage, where Riot's API leaves `rankings` empty
 * even with real completed matches sitting right there. Tallies each
 * team's wins/losses directly from match results — the same thing a
 * person watching would do by hand. No tiebreaker data (like a Buchholz
 * score) is available from this endpoint, so ties just share an ordinal,
 * same convention CBLOL's own group stage already uses for tied teams. */
function computeSwissStandingsFromMatches(matches: RawStandingsMatch[]): StandingsRow[] {
  const byTeam = new Map<string, { name: string; code: string; image?: string; wins: number; losses: number }>();

  for (const match of matches) {
    if (match.state !== 'completed') continue;
    for (const team of match.teams) {
      if (!team || team.code === 'TBD') continue;
      const entry = byTeam.get(team.id) ?? { name: team.name, code: team.code, image: team.image, wins: 0, losses: 0 };
      if (team.result?.outcome === 'win') entry.wins += 1;
      if (team.result?.outcome === 'loss') entry.losses += 1;
      byTeam.set(team.id, entry);
    }
  }

  // Confirmed for LCP's 2026 Split 3 specifically — see the StandingsRow
  // status field's own comment for sourcing. Not something to assume holds
  // for a different Swiss-format region without checking first.
  const WINS_TO_QUALIFY = 3;
  const LOSSES_TO_ELIMINATE = 3;

  const rows: StandingsRow[] = [...byTeam.entries()].map(([id, t]) => ({
    ordinal: 0,
    id,
    name: t.name,
    code: t.code,
    image: t.image,
    wins: t.wins,
    losses: t.losses,
    status: t.wins >= WINS_TO_QUALIFY ? 'qualified' : t.losses >= LOSSES_TO_ELIMINATE ? 'eliminated' : 'active',
  }));

  rows.sort((a, b) => b.wins - a.wins || a.losses - b.losses);
  let ordinal = 1;
  for (let i = 0; i < rows.length; i++) {
    if (i > 0 && (rows[i].wins !== rows[i - 1].wins || rows[i].losses !== rows[i - 1].losses)) {
      ordinal = i + 1;
    }
    rows[i].ordinal = ordinal;
  }
  return rows;
}

/** Convenience wrapper: resolves league -> current tournament -> standings
 * in one call. Returns an empty array (not a throw) at any step that comes
 * up empty, so a screen can show "no data" rather than crash. */
export async function fetchStandingsForRegion(region: Region): Promise<StandingsGroup[]> {
  const leagueId = await resolveLeagueId(region);
  if (!leagueId) return [];
  const tournaments = await fetchTournamentsForLeague(leagueId);
  const current = pickCurrentTournament(tournaments);
  if (!current) return [];
  return fetchStandings(current.id);
}

// --- Bracket / rounds (Swiss now; built to generalize to a true
// elimination bracket for Playoffs and Worlds once real seeded data
// exists to design that against) ---

export interface BracketTeam {
  code: string;
  name: string;
  image?: string;
}

export interface BracketMatch {
  matchId: string;
  state: MatchState;
  teamA: BracketTeam;
  teamB: BracketTeam;
  scoreA: number;
  scoreB: number;
}

export interface BracketMatchGroup {
  /** e.g. "1-0", "0-1", "2-0", "1-1", "0-2" — the record both teams share
   * entering this group of matches (Swiss always pairs same-record teams).
   * Empty string for Round 1, where every team is 0-0 and there's only
   * one group — nothing meaningful to label. */
  recordLabel: string;
  matches: BracketMatch[];
}

export interface BracketRound {
  roundNumber: number;
  groups: BracketMatchGroup[];
}

function toBracketTeam(team: RawStandingsMatchTeam | null): BracketTeam {
  return team ? { code: team.code, name: team.name, image: team.image } : { code: 'TBD', name: 'TBD' };
}

/** Reconstructs a Swiss stage's actual bracket shape — not just "Round N"
 * columns, but the real record-based groups within each round (e.g. Round
 * 3 genuinely has three independent groups playing simultaneously: the
 * 2-0 teams, the 1-1 teams, and the 0-2 teams — confirmed via real
 * research into LCP's format, not assumed). getStandings' matches don't
 * carry a round number, a record, OR a timestamp — round number and
 * record are both reconstructed from a real property of Swiss format:
 * a team's round always equals however many matches it's already played,
 * plus one, and its record group is exactly its win-loss record going
 * into that match, since Swiss only ever pairs teams with identical
 * records. Getting this right needs matches in true chronological order,
 * which needs a timestamp getStandings doesn't provide — cross-referenced
 * here against getSchedule's events (matched by match ID). That
 * cross-reference assumes match IDs are identical across both endpoints;
 * unconfirmed for certain but consistent with the same ID scheme already
 * confirmed for VODs (getEventDetails). Confirmed working against LCP's
 * real 2026 Split 3 Swiss stage; not yet tested against any other
 * Swiss-format region. */
interface RawStage {
  name: string;
  sections: RawStandingsSection[];
}

/** Finds whichever stage is genuinely current right now, rather than
 * assuming it's always stages[0] (Swiss). A tournament's stages array is
 * chronological (Swiss, then Play-Ins, then Playoffs for LCP) — each
 * later stage starts out with every match as TBD-vs-TBD until real teams
 * actually qualify into it. So "current" is defined as: the LAST stage
 * that has at least one match where a real team (not "TBD") has been
 * seeded in. Once Play-Ins gets real teams, this correctly stops
 * reporting Swiss as current, without needing to hardcode a transition
 * date or manually flip anything by hand. */
function pickActiveStage(stages: RawStage[]): RawStage | null {
  for (let i = stages.length - 1; i >= 0; i--) {
    const stage = stages[i];
    const hasRealTeam = stage.sections.some((s) =>
      (s.matches ?? []).some((m) => m.teams.some((t) => t && t.code !== 'TBD'))
      || (s.rankings ?? []).some((r) => (r.teams ?? []).some((t) => t))
    );
    if (hasRealTeam) return stage;
  }
  return stages[0] ?? null;
}

async function fetchActiveStage(tournamentId: string): Promise<RawStage | null> {
  let data: { data: { standings: Array<{ stages: RawStage[] }> } };
  try {
    data = await apiGet('getStandings', { tournamentId });
  } catch (err) {
    if (__DEV__) {
      console.log('[fetchActiveStage] apiGet THREW for tournamentId', JSON.stringify(tournamentId), ':', err);
    }
    throw err;
  }
  const stages = data.data.standings[0]?.stages ?? [];
  return pickActiveStage(stages);
}

export interface BracketData {
  /** The real stage name from the API — "Swiss", "Play-Ins", "Playoffs",
   * whatever it actually is right now. Always populated whenever there's
   * an active bracket-shaped stage at all, even for a format not built
   * yet below. */
  stageName: string;
  /** Only populated when stageName is a format this can actually render
   * — currently just Swiss's record-grouped rounds. Play-Ins and
   * Playoffs are real single/double-elimination trees, a fundamentally
   * different shape, and get built once real seeded data (not
   * TBD-vs-TBD) exists to design the connectivity against — see the
   * README roadmap. Empty here on purpose until then, rather than
   * forcing Swiss-shaped math onto data it was never designed for. */
  rounds: BracketRound[];
}

/** Reconstructs a Swiss stage's actual bracket shape — not just "Round N"
 * columns, but the real record-based groups within each round (e.g. Round
 * 3 genuinely has three independent groups playing simultaneously: the
 * 2-0 teams, the 1-1 teams, and the 0-2 teams — confirmed via real
 * research into LCP's format, not assumed). getStandings' matches don't
 * carry a round number, a record, OR a timestamp — round number and
 * record are both reconstructed from a real property of Swiss format:
 * a team's round always equals however many matches it's already played,
 * plus one, and its record group is exactly its win-loss record going
 * into that match, since Swiss only ever pairs teams with identical
 * records. Getting this right needs matches in true chronological order,
 * which needs a timestamp getStandings doesn't provide — cross-referenced
 * here against getSchedule's events (matched by match ID). That
 * cross-reference assumes match IDs are identical across both endpoints;
 * unconfirmed for certain but consistent with the same ID scheme already
 * confirmed for VODs (getEventDetails). Confirmed working against LCP's
 * real 2026 Split 3 Swiss stage; not yet tested against any other
 * Swiss-format region. */
export async function fetchBracketData(region: Region): Promise<BracketData | null> {
  const leagueId = await resolveLeagueId(region);
  if (!leagueId) return null;

  const tournaments = await fetchTournamentsForLeague(leagueId);
  const current = pickCurrentTournament(tournaments);
  if (!current) return null;

  const activeStage = await fetchActiveStage(current.id);
  if (!activeStage) return null;

  const stageName = activeStage.name ?? '';

  // Only Swiss is built out below — anything else reports the real name
  // (so a future update just adds a case, rather than rebuilding this
  // stage-detection plumbing from scratch) but no rounds yet.
  if (stageName.toLowerCase() !== 'swiss') {
    return { stageName, rounds: [] };
  }

  const scheduleEvents = await fetchSchedule(leagueId);

  const swissMatches = activeStage.sections
    .filter((s) => (s.rankings ?? []).length === 0)
    .flatMap((s) => s.matches ?? []);
  if (swissMatches.length === 0) return { stageName, rounds: [] };

  const startTimeByMatchId = new Map<string, string>();
  for (const event of scheduleEvents) {
    if (event.match?.id) startTimeByMatchId.set(event.match.id, event.startTime);
  }

  const withStartTime = swissMatches
    .map((m) => ({ match: m, startTime: startTimeByMatchId.get(m.id) }))
    .filter((m): m is { match: RawStandingsMatch; startTime: string } => !!m.startTime)
    // Pre-allocated future match SLOTS — neither team determined yet —
    // aren't a real pairing at all, and every one of them shares the
    // literal code "TBD" for both sides. Without filtering these out
    // first, they'd all collapse into one fake "team" in the record
    // tracking below, corrupting round/group assignment for real matches.
    // This was the actual cause of extra placeholder matches showing up
    // under Round 1.
    .filter(({ match }) => {
      const [a, b] = match.teams;
      return a?.code && a.code !== 'TBD' && b?.code && b.code !== 'TBD';
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const recordByTeam = new Map<string, { wins: number; losses: number }>();
  const rounds = new Map<number, Map<string, BracketMatch[]>>();

  for (const { match } of withStartTime) {
    const [teamA, teamB] = match.teams;
    // Guaranteed non-null by the filter above, but TypeScript doesn't know
    // that across the .filter/.sort chain.
    const aCode = teamA!.code;
    const bCode = teamB!.code;

    const aRecord = recordByTeam.get(aCode) ?? { wins: 0, losses: 0 };
    const roundNumber = aRecord.wins + aRecord.losses + 1;
    const recordLabel = roundNumber === 1 ? '' : `${aRecord.wins}-${aRecord.losses}`;

    const bracketMatch: BracketMatch = {
      matchId: match.id,
      state: match.state,
      teamA: toBracketTeam(teamA),
      teamB: toBracketTeam(teamB),
      scoreA: teamA?.result?.gameWins ?? 0,
      scoreB: teamB?.result?.gameWins ?? 0,
    };

    if (!rounds.has(roundNumber)) rounds.set(roundNumber, new Map());
    const groupsForRound = rounds.get(roundNumber)!;
    if (!groupsForRound.has(recordLabel)) groupsForRound.set(recordLabel, []);
    groupsForRound.get(recordLabel)!.push(bracketMatch);

    // Only advance a team's tracked record once the match has an actual
    // result — an unstarted match (already paired, not yet played) leaves
    // both teams' records unchanged for now.
    if (teamA?.result?.outcome === 'win') recordByTeam.set(aCode, { wins: aRecord.wins + 1, losses: aRecord.losses });
    else if (teamA?.result?.outcome === 'loss') recordByTeam.set(aCode, { wins: aRecord.wins, losses: aRecord.losses + 1 });

    const bRecord = recordByTeam.get(bCode) ?? { wins: 0, losses: 0 };
    if (teamB?.result?.outcome === 'win') recordByTeam.set(bCode, { wins: bRecord.wins + 1, losses: bRecord.losses });
    else if (teamB?.result?.outcome === 'loss') recordByTeam.set(bCode, { wins: bRecord.wins, losses: bRecord.losses + 1 });
  }

  const roundsOut = [...rounds.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([roundNumber, groupsMap]) => ({
      roundNumber,
      groups: [...groupsMap.entries()]
        .sort((a, b) => b[0].localeCompare(a[0])) // "2-0" before "1-1" before "0-2" — highest wins first
        .map(([recordLabel, matches]) => ({ recordLabel, matches })),
    }));

  return { stageName, rounds: roundsOut };
}
