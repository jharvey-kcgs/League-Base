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

import { withCache, clearApiCache } from './cache';
export { clearApiCache };
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

export function lolesportsSlugForRegion(region: Region): string {
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

/** Confirmed via real, currently-indexed lolesports.com pages (not a
 * guess) — e.g. lolesports.com/live/lcs, lolesports.com/live/les both
 * exist and show that league's current live match. The raw schedule/live
 * event data itself has no direct stream URL field at all (checked a
 * real live event's full raw response first, before assuming one
 * existed), so this constructs the watch page from the league slug
 * instead, same slug already present on every ScheduleEvent. */
export function getLiveWatchUrl(leagueSlug: string): string {
  return `https://lolesports.com/live/${leagueSlug}`;
}

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
 * should read 0-0 until they'd actually played a game in it).
 *
 * Confirmed 2026-08-24: this can genuinely disagree with Overall
 * Standings (which reads from getStandings, a separate endpoint) by a
 * couple of games at any given moment — for LPL's Team WE specifically,
 * this returned exactly 12 real, completed, resolved-outcome games,
 * while getStandings showed a 7-7 (14-game) record. Checked directly
 * against the official site's own real game count at the time: 12 was
 * actually correct, and getStandings was the one temporarily ahead of
 * itself — not the reverse, which was the first, wrong assumption here.
 * Neither endpoint is reliably "the current one" in general; this was
 * confirmed real Riot-side data, not a bug in this function. */
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
   * threshold, so this is always 'active' there. The "3 wins qualifies"
   * half is confirmed solid — verified directly against real LCP 2026
   * Split 3 data, all three teams that hit exactly 3 wins stopped there
   * and matched the official "ADVANCES" list exactly. The "3 losses
   * eliminates" half is confirmed WRONG, not just unconfirmed — two real
   * teams (GZ, DFM) each won one game on the way to their 3rd loss and
   * were NOT eliminated, instead advancing to a decider match against
   * each other. A clean 0-3-in-3-games case (SHG) genuinely was
   * eliminated, so the real rule depends on the specific bracket path,
   * not just a loss tally. computeSwissStandingsFromMatches below never
   * produces 'eliminated' as a result of this — a wrong ✕ telling
   * someone a team is out when they're not is worse than showing
   * nothing. If this ever expands to another Swiss-format region, don't
   * assume its rules match LCP's without checking either. */
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
  let data: { data: { standings: Array<{ stages: RawStage[] }> } };
  try {
    data = await apiGet('getStandings', { tournamentId });
  } catch (err) {
    if (__DEV__) {
      console.log('[fetchStandingsSections] apiGet THREW for tournamentId', JSON.stringify(tournamentId), ':', err);
    }
    throw err;
  }
  const stages = data.data.standings[0]?.stages ?? [];
  const stage0 = stages[0];
  if (!stage0) return [];

  // Regular season is stages[0] in practice — playoffs (bracket-shaped, not
  // a ranked table) would be a separate stage. Within that stage, a league
  // can have multiple sections (groups) that each rank independently —
  // LCK splits into Legend/Rise groups, LPL into Ascend/Nirvana.
  //
  // But stages[0] isn't ALWAYS still the meaningful one to show — once a
  // Swiss stage (LCP) genuinely finishes and the tournament moves on to
  // Play-Ins/Playoffs, a win-loss table for stage[0] is a frozen snapshot
  // of something that's no longer the current picture, not a real
  // "standings" anymore. Reusing the exact same pickActiveStage logic
  // already proven for the Bracket section: if stage[0] is still the
  // genuinely active stage, show it as before. If the tournament has
  // moved past it, return empty — same "nothing to show" signal Bracket
  // already uses, letting Overall Standings disappear entirely rather
  // than show a stale table with lock/eliminated icons that no longer
  // describe the current picture. A normal round-robin region (LCS, LEC,
  // etc.) only ever has one stage, so this never triggers for them —
  // stage[0] is always "active" by definition when it's the only stage.
  if (pickActiveStage(stages) !== stage0) return [];

  return stage0.sections ?? [];
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

  // "3 wins qualifies" is confirmed solid for LCP's 2026 Split 3 — see the
  // StandingsRow status field's own comment. There's deliberately no
  // LOSSES_TO_ELIMINATE constant anymore — that half of the rule is
  // confirmed wrong, not just unconfirmed, by real data (see the same
  // comment for the actual proof).
  const WINS_TO_QUALIFY = 3;

  const rows: StandingsRow[] = [...byTeam.entries()].map(([id, t]) => ({
    ordinal: 0,
    id,
    name: t.name,
    code: t.code,
    image: t.image,
    wins: t.wins,
    losses: t.losses,
    status: t.wins >= WINS_TO_QUALIFY ? 'qualified' : 'active',
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
  /** matchId of the specific match this one's WINNER advances into, when
   * known. NOT derived from `previousMatchIds` — that's confirmed empty
   * on every match checked so far, even well into a real tournament with
   * real teams seeded in. Populated instead by direct, explicit
   * confirmation of a specific bracket's real connectivity (see
   * KNOWN_MATCH_CONNECTIONS below) — a narrow, hard-won fact about one
   * specific bracket, not a general rule to assume holds for any other
   * one without the same direct confirmation. */
  feedsInto?: string;
  /** matchId the LOSER advances into instead — only meaningful for a
   * true double-elimination bracket (LCP Playoffs), where a match can
   * have two different destinations depending on outcome. Play-Ins never
   * needed this (a single-elimination shape only ever has one
   * destination), so it's a separate, optional field rather than folded
   * into feedsInto — keeps that field's existing meaning ("on win")
   * unchanged for every place already relying on it. Same confirmation
   * discipline as feedsInto: see KNOWN_MATCH_CONNECTIONS below. */
  feedsIntoOnLoss?: string;
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
 * chronological (Swiss, then Play-Ins, then Playoffs for LCP).
 *
 * The original version of this picked the LAST stage with any real
 * (non-"TBD") team in it — which turned out wrong, confirmed by a real
 * report: Play-Ins gets partially seeded incrementally, as soon as
 * enough Swiss results are mathematically known to fill some of its
 * slots, well before Swiss's actual last match happens. That made this
 * function jump to "Play-Ins is current" while Swiss still had a game
 * left to play, and since Play-Ins isn't built out yet, the whole
 * section just vanished.
 *
 * The correct rule: "current" is the EARLIEST stage (in chronological
 * order) that has both real teams seeded AND at least one match that
 * isn't finished yet. Swiss stays current for as long as it has any
 * unfinished match, however seeded-in-advance a later stage already is.
 * Only once every match in a stage is "completed" does this move on to
 * checking the next one. If every stage with real activity turns out to
 * be fully finished (the whole tournament is over), this falls back to
 * the LAST one with any real activity, so there's still something
 * sensible to show rather than nothing. */
function pickActiveStage(stages: RawStage[]): RawStage | null {
  const hasRealActivity = (stage: RawStage) =>
    stage.sections.some((s) =>
      (s.matches ?? []).some((m) => m.teams.some((t) => t && t.code !== 'TBD'))
      || (s.rankings ?? []).some((r) => (r.teams ?? []).some((t) => t))
    );
  const isFullyFinished = (stage: RawStage) =>
    stage.sections.every((s) => (s.matches ?? []).every((m) => m.state === 'completed'));

  for (const stage of stages) {
    if (hasRealActivity(stage) && !isFullyFinished(stage)) return stage;
  }
  for (let i = stages.length - 1; i >= 0; i--) {
    if (hasRealActivity(stages[i])) return stages[i];
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

  // TEMPORARY — LCP Playoffs has real Round 1 matches now (MVK vs CFO,
  // GAM vs TSW), but this is a genuine double-elimination bracket, not a
  // simple single-elimination one like Play-Ins was: each Round 1 match
  // has TWO different destinations depending on who wins (winner ->
  // Upper Bracket Finals, loser -> Upper Bracket Semifinals), and there
  // are four separate downstream stages (Upper Bracket Finals, Upper
  // Bracket Semifinals, Lower Bracket Finals, Finals) that ALL currently
  // look identical — every one of them is still "TBD vs TBD" with no
  // way to tell them apart by content alone. The real match IDs from
  // this log are the only way to build a correct KNOWN_MATCH_CONNECTIONS
  // entry for each one. Logging every stage's complete, unfiltered
  // matches — remove once the Playoffs match IDs are confirmed.
  if (__DEV__) {
    for (const stage of data.data.standings[0]?.stages ?? []) {
      console.log(`[fetchActiveStage] stage "${stage.name}":`, JSON.stringify(stage.sections, null, 2));
    }
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
  /** Empty when there's genuinely nothing determined yet for the active
   * stage (e.g. Playoffs while every match is still TBD-vs-TBD) — see
   * fetchSwissBracketData and fetchEliminationBracketData for how each
   * stage shape actually gets built. */
  rounds: BracketRound[];
}

/** Top-level entry point — resolves the active stage, then delegates to
 * whichever of the two real bracket shapes actually applies: Swiss's
 * record-grouped rounds, or a generic single/double-elimination bracket
 * for anything else with real (non-fully-TBD) matches. */
export async function fetchBracketData(region: Region): Promise<BracketData | null> {
  const leagueId = await resolveLeagueId(region);
  if (!leagueId) return null;

  const tournaments = await fetchTournamentsForLeague(leagueId);
  const current = pickCurrentTournament(tournaments);
  if (!current) return null;

  const activeStage = await fetchActiveStage(current.id);
  if (!activeStage) return null;

  const stageName = activeStage.name ?? '';

  if (stageName.toLowerCase() === 'swiss') {
    return fetchSwissBracketData(stageName, activeStage, leagueId);
  }

  return fetchEliminationBracketData(stageName, activeStage);
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
async function fetchSwissBracketData(
  stageName: string,
  activeStage: RawStage,
  leagueId: string
): Promise<BracketData> {
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

/** Confirmed working against LCP's real Play-Ins data (2026 Split 3) —
 * initially matched Round 1's two matchups and Round 2's partial pairing
 * exactly. That confirmation had a real gap, though: it only ever
 * checked this while every match was still fully unresolved. The
 * original design used TBD-slot count alone to infer round order (fewer
 * TBD teams = an earlier, more-determined round) — which is a real
 * signal, but not a durable one. The moment CFO actually won its Round 1
 * match, the Round 2 slot against TSW resolved from "TBD" to "CFO" and
 * had zero TBD teams too, making it indistinguishable from Round 1's own
 * matches under that heuristic alone — a real bug (reported as every
 * Play-Ins match flattening into one "Round 1"), not a hypothetical.
 *
 * Fixed by using confirmed connectivity (KNOWN_MATCH_CONNECTIONS) as the
 * primary signal whenever it exists — a real topological fact
 * independent of resolution status — and falling back to the original
 * TBD-count heuristic only for matches with no confirmed predecessor.
 *
 * The real limitation, still stated plainly rather than papered over:
 * `previousMatchIds` is confirmed empty on every match checked so far,
 * even well into the tournament with real results in — so nothing here
 * is read from the API's own structure; every connection is a directly
 * confirmed, hand-entered fact (see KNOWN_MATCH_CONNECTIONS below), and
 * the TBD-count fallback remains exactly as fragile as described above
 * for anything not yet confirmed that way.
 *
 * Renders every round as a single group (no record-label concept the
 * way Swiss has) — BracketRounds already hides an empty recordLabel, so
 * this reuses that component with zero changes needed. */
/** Explicit, directly-confirmed match connections — matchId -> matchId of
 * the match its WINNER advances into. NOT derived from the API (which
 * has confirmed nothing usable for this — see BracketMatch.feedsInto's
 * own comment); each entry here was confirmed by directly viewing the
 * official bracket page's own rendered connector lines, one specific
 * bracket at a time. Every entry needs its own real confirmation before
 * being added — nothing here generalizes to a different bracket, a
 * different region's Play-Ins, or even this same bracket after these
 * specific matches resolve and new ones take their place.
 *
 * Confirmed 2026-08-14, LCP Play-Ins Round 1 -> Round 2, by directly
 * viewing the official bracket page: CTBC Flying Oyster vs MVK Esports
 * (id 116769725389404173) connects to the Round 2 match against Team
 * Secret Whales (id 116769725389404185) — winner takes the open slot.
 * DetonatioN FocusMe vs Ground Zero Gaming (116769725389404179) was
 * directly confirmed to have NO connection drawn on the official page —
 * deliberately absent from this table, not an oversight.
 *
 * LCP Playoffs entries added 2026-08-16 — a genuinely different
 * situation worth being explicit about. The bracket's real SHAPE (which
 * stage feeds which, on win vs on loss) is directly confirmed — both
 * from the official page's own rendered layout and from the user's own
 * explicit, detailed description of the routing rules. What is NOT
 * independently confirmed is which of the four still-fully-TBD-vs-TBD
 * match IDs corresponds to which of the four labeled stages — nothing in
 * the raw data carries that mapping, so this uses the match IDs'
 * sequential order matched against the official page's visual layout
 * order (Upper Bracket Finals, then Upper Bracket Semifinals, then Lower
 * Bracket Finals, then Finals) as a reasonable, but not independently
 * verified, inference. Worth confirming for real the moment Round 1
 * actually resolves and a real team's name appears in one of these —
 * whichever stage it shows up under either confirms this mapping or
 * reveals it needs correcting. */
const KNOWN_MATCH_CONNECTIONS: Record<string, string> = {
  '116769725389404173': '116769725389404185',
  // LCP Playoffs — Round 1 winners both advance to Upper Bracket Finals
  '116769742220455389': '116769742220520937', // CTBC Flying Oyster vs MVK Esports -> Upper Bracket Finals
  '116769742220520931': '116769742220520937', // Team Secret Whales vs GAM Esports -> Upper Bracket Finals
  // Upper Bracket Finals winner advances to Finals
  '116769742220520937': '116769742220520955',
  // Upper Bracket Semifinals winner advances to Lower Bracket Finals
  '116769742220520943': '116769742220520949',
  // Lower Bracket Finals winner advances to Finals
  '116769742220520949': '116769742220520955',
};

/** Same discipline as KNOWN_MATCH_CONNECTIONS above, but for the LOSER's
 * destination — only meaningful for a genuine double-elimination bracket
 * (LCP Playoffs), where losing doesn't mean immediately eliminated. A
 * match with no entry here means its loser is simply eliminated, not
 * that the connection is unknown — Upper Bracket Semifinals and Lower
 * Bracket Finals both deliberately have no entry for exactly this
 * reason, matching the confirmed real rule (lose either of those two and
 * the run is over). Same inferred-ID-mapping caveat as
 * KNOWN_MATCH_CONNECTIONS' own comment applies equally here. */
const KNOWN_LOSER_CONNECTIONS: Record<string, string> = {
  // LCP Playoffs — Round 1 losers both drop to Upper Bracket Semifinals
  '116769742220455389': '116769742220520943', // CTBC Flying Oyster vs MVK Esports -> Upper Bracket Semifinals
  '116769742220520931': '116769742220520943', // Team Secret Whales vs GAM Esports -> Upper Bracket Semifinals
  // Upper Bracket Finals' loser drops to Lower Bracket Finals
  '116769742220520937': '116769742220520949',
};

/** Explicit, directly-confirmed stage name for a specific matchId — same
 * discipline as KNOWN_MATCH_CONNECTIONS above, and the same reason:
 * nothing in the raw data itself carries a per-match label, so this is
 * filled in only from directly viewing the official bracket page, one
 * confirmed match at a time. A round only gets roundLabel set in the
 * output when EVERY match in it has a confirmed entry here — a round
 * with even one unconfirmed match falls back to "ROUND N" rather than
 * risk a half-labeled, half-guessed row.
 *
 * Confirmed 2026-08-16, LCP Playoffs Round 1, by directly viewing the
 * official bracket page: both real Round 1 matches (CTBC Flying Oyster
 * vs MVK Esports, id 116769742220455389; Team Secret Whales vs GAM
 * Esports, id 116769742220520931) sit under the "Lower Bracket -
 * Semifinals" heading, despite being the tournament's actual first
 * round — an intentionally non-obvious label, not a typo.
 *
 * The remaining four labels (also confirmed real, directly visible on
 * the official page) are mapped to specific match IDs using the same
 * inferred sequential-order assumption described in
 * KNOWN_MATCH_CONNECTIONS' own comment — the label names themselves
 * aren't in question, only which raw ID each one corresponds to. */
const KNOWN_ROUND_LABELS: Record<string, string> = {
  '116769742220455389': 'Lower Bracket Semifinals',
  '116769742220520931': 'Lower Bracket Semifinals',
  '116769742220520937': 'Upper Bracket Finals',
  '116769742220520943': 'Upper Bracket Semifinals',
  '116769742220520949': 'Lower Bracket Finals',
  '116769742220520955': 'Finals',
  // LPL Play-in "Knights Rivals" (2026-08-29) — confirmed directly from
  // the official page: a standalone one-day, two-match stage with no
  // continuation into a later round. Both matches share the same
  // "Finals" label, so — unlike LCP Playoffs' four indistinguishable
  // placeholders — there's no ambiguity about which raw ID gets which
  // label here even while both are still fully TBD-vs-TBD.
  '116566921179138936': 'Finals',
  '116566921179204478': 'Finals',
};

function fetchEliminationBracketData(stageName: string, stage: RawStage): BracketData {
  // A stage with a real, populated rankings table (LCS/LEC/LCK/LPL/CBLOL's
  // regular season, every one of them) is NOT bracket-shaped at all — it's
  // the same "does this section have a pre-built ranked table" signal
  // already used everywhere else to detect a genuine Swiss/elimination
  // stage (empty rankings) vs a normal round-robin one. Missing this
  // check here was a real bug: every regular-season match has two known,
  // non-"TBD" teams, so hasAnyRealMatch below was true for literally
  // every region's regular season, and they all collapsed into one giant
  // "Round 1" — a real user-reported bug (a wall-of-text "Regular Season
  // Bracket" appearing for every non-Swiss region), not a hypothetical.
  const isBracketShaped = stage.sections.every((s) => (s.rankings ?? []).length === 0);
  if (!isBracketShaped) return { stageName, rounds: [] };

  const matches = stage.sections.flatMap((s) => s.matches ?? []);

  const tbdCount = (m: RawStandingsMatch) => m.teams.filter((t) => !t || t.code === 'TBD').length;

  // A stage where every match is still fully TBD-vs-TBD (Playoffs' four
  // downstream stages, before Round 1 resolves) has nothing real to show
  // yet — same "nothing to show" signal used everywhere else, rather
  // than a bracket full of blank cards. A match with a confirmed entry
  // in KNOWN_ROUND_LABELS is the one exception: its identity is known
  // even while its actual teams aren't yet, matching what was directly
  // confirmed from the official page for LCP Playoffs.
  const hasAnyRealMatch = matches.some((m) => tbdCount(m) < 2 || KNOWN_ROUND_LABELS[m.id]);
  if (!hasAnyRealMatch) return { stageName, rounds: [] };
  const confirmedMatches = matches.filter((m) => tbdCount(m) < 2 || KNOWN_ROUND_LABELS[m.id]);

  // Matches that are a confirmed feedsInto (win) or feedsIntoOnLoss TARGET
  // of some other match are NOT round 1, no matter how many TBD slots
  // they currently show — a real bug, not hypothetical: once CFO won its
  // Round 1 match, the Round 2 slot against TSW resolved from "TBD" to
  // "CFO" and had zero TBD teams, identical under the old TBD-count-only
  // heuristic to Round 1's own already-resolved matches. All three
  // collapsed into one "Round 1" as a result. Confirmed connectivity is
  // used here whenever it exists, since it's a real topological fact
  // independent of resolution status; TBD count is only the fallback for
  // matches with no confirmed predecessor at all.
  const targetMatchIds = new Set([...Object.values(KNOWN_MATCH_CONNECTIONS), ...Object.values(KNOWN_LOSER_CONNECTIONS)]);

  const withoutPredecessor = confirmedMatches.filter((m) => !targetMatchIds.has(m.id));
  const byTbdCount = new Map<number, RawStandingsMatch[]>();
  for (const match of withoutPredecessor) {
    const count = tbdCount(match);
    if (!byTbdCount.has(count)) byTbdCount.set(count, []);
    byTbdCount.get(count)!.push(match);
  }
  const sortedCounts = [...byTbdCount.keys()].sort((a, b) => a - b);
  const roundNumberByMatchId = new Map<string, number>();
  sortedCounts.forEach((count, i) => {
    for (const m of byTbdCount.get(count)!) roundNumberByMatchId.set(m.id, i + 1);
  });

  // Matches WITH a confirmed predecessor land one round after whichever
  // of their sources resolves latest — a real 2-into-1 merge (Round 1's
  // two winners both feeding the same Upper Bracket Finals match here)
  // is handled the same way: both sources contribute, and the later of
  // the two determines the destination's round.
  //
  // A single pass over matches isn't enough once a chain runs several
  // stages deep — Lower Bracket Finals depends on BOTH Upper Bracket
  // Finals' round AND Upper Bracket Semifinals' round, and Finals
  // depends on Lower Bracket Finals' round in turn. Whichever of those
  // gets processed first in plain array order might not have its own
  // predecessors resolved yet. Looping until nothing changes (a genuine
  // fixed-point iteration, capped at the match count as a safe upper
  // bound on how deep any real chain could possibly go) resolves this
  // correctly regardless of processing order.
  let changed = true;
  let iterations = 0;
  while (changed && iterations < matches.length) {
    changed = false;
    iterations++;
    for (const match of confirmedMatches) {
      if (!targetMatchIds.has(match.id) || roundNumberByMatchId.has(match.id)) continue;
      const sourceIds = [
        ...Object.entries(KNOWN_MATCH_CONNECTIONS).filter(([, dest]) => dest === match.id).map(([src]) => src),
        ...Object.entries(KNOWN_LOSER_CONNECTIONS).filter(([, dest]) => dest === match.id).map(([src]) => src),
      ];
      const sourceRounds = sourceIds.map((id) => roundNumberByMatchId.get(id)).filter((r): r is number => r !== undefined);
      // Only assign once every source has resolved — an incomplete set
      // here means a source deeper in the chain hasn't been assigned
      // yet, not that this match has no real predecessor at all.
      if (sourceRounds.length !== sourceIds.length || sourceIds.length === 0) continue;
      roundNumberByMatchId.set(match.id, Math.max(...sourceRounds) + 1);
      changed = true;
    }
  }

  const byRound = new Map<number, BracketMatch[]>();
  for (const match of confirmedMatches) {
    const [teamA, teamB] = match.teams;
    const roundNumber = roundNumberByMatchId.get(match.id)!;
    if (!byRound.has(roundNumber)) byRound.set(roundNumber, []);
    byRound.get(roundNumber)!.push({
      matchId: match.id,
      state: match.state,
      teamA: toBracketTeam(teamA),
      teamB: toBracketTeam(teamB),
      scoreA: teamA?.result?.gameWins ?? 0,
      scoreB: teamB?.result?.gameWins ?? 0,
      feedsInto: KNOWN_MATCH_CONNECTIONS[match.id],
      feedsIntoOnLoss: KNOWN_LOSER_CONNECTIONS[match.id],
    });
  }

  const rounds = [...byRound.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([roundNumber, roundMatches]) => {
      // Group by each match's OWN confirmed label, not by round alone —
      // the actual bug this fixes: Round 1 happens to have one label
      // shared by both its matches (Lower Bracket Semifinals), but
      // Round 2 has TWO different, independent stages (Upper Bracket
      // Finals, Upper Bracket Semifinals) that share the same round
      // number without being the same stage. Grouping by round number
      // alone lumped them into one flat, unlabeled group — this groups
      // by label instead, so each real stage gets its own labeled
      // section even when two land in the same round. A match with no
      // confirmed label (nothing entered in KNOWN_ROUND_LABELS yet)
      // falls into its own group with an empty recordLabel, same as
      // Swiss's Round 1 always has.
      const byLabel = new Map<string, BracketMatch[]>();
      for (const match of roundMatches) {
        const label = KNOWN_ROUND_LABELS[match.matchId] ?? '';
        if (!byLabel.has(label)) byLabel.set(label, []);
        byLabel.get(label)!.push(match);
      }
      const groups = [...byLabel.entries()].map(([recordLabel, matches]) => ({ recordLabel, matches }));
      return { roundNumber, groups };
    });

  return { stageName, rounds };
}
