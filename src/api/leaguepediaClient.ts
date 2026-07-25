/**
 * Client for Leaguepedia's Cargo API (lol.fandom.com) — a completely
 * different system from lolesportsClient.ts (esports-api.lolesports.com).
 * MediaWiki's Cargo extension, queried with SQL-like tables/fields/where
 * clauses as URL params, not a REST API in the usual sense.
 *
 * Built specifically as a fallback for regions lolesports.com has a real,
 * structural VOD gap for — confirmed true for LPL (Tencent's exclusive
 * broadcast rights mean LPL VODs generally aren't distributed through
 * lolesports.com/YouTube at all). NOT intended to replace lolesportsClient
 * for LCS/LEC/LCK, which don't have that gap — see the project's README
 * for the reasoning.
 *
 * Community-maintained data (wiki editors fill in the VOD field whenever
 * they get to it) — coverage and correctness aren't guaranteed the way an
 * official source's would be. Treat an empty result as a real, expected
 * possibility, not a bug to chase.
 */

const CARGO_BASE = 'https://lol.fandom.com/api.php';

interface CargoQueryRow {
  Team1?: string;
  Team2?: string;
  DateTime_UTC?: string;
  VOD?: string;
  MatchId?: string;
  N_GameInMatch?: string;
}

async function cargoQuery(params: Record<string, string>): Promise<CargoQueryRow[]> {
  const query = new URLSearchParams({
    action: 'cargoquery',
    format: 'json',
    ...params,
  }).toString();
  const res = await fetch(`${CARGO_BASE}?${query}`);
  if (!res.ok) {
    throw new Error(`Leaguepedia Cargo query failed: HTTP ${res.status}`);
  }
  const data = (await res.json()) as { cargoquery?: Array<{ title: CargoQueryRow }> };
  return (data.cargoquery ?? []).map((r) => r.title);
}

/** Cargo's VOD field is typed "Wikitext", not a plain string — it stores
 * MediaWiki external-link markup like "[https://www.bilibili.com/... Game
 * 1]" rather than a bare URL. Extracts the first real URL out of that. */
function extractUrlFromWikitext(wikitext: string): string | null {
  const match = wikitext.match(/https?:\/\/[^\s\]]+/);
  return match ? match[0] : null;
}

export interface LeaguepediaMatchVods {
  matchId: string;
  opponent: string;
  dateTime: string;
  games: Array<{ gameNumber: number; url: string }>;
}

/** Best-effort VOD fallback, grouped by match (MatchId), most recent
 * first. teamName should be the team's plain display name (teams.json's
 * `name` field) — NOT `liquipediaPage`, which is exactly what it sounds
 * like: a Liquipedia URL, unrelated to this client, which queries
 * Leaguepedia (a different wiki). Whether team.name matches Leaguepedia's
 * own stored name for that team exactly is itself unverified — a sponsor-prefixed or
 * historical name mismatch would silently return nothing here, same as a
 * genuine "no VOD yet" case. Returns [] on any failure, same as
 * lolesportsClient's fetch functions — a fallback failing shouldn't be
 * louder than the primary source failing. */
export async function fetchLeaguepediaVods(teamName: string, matchLimit = 3): Promise<LeaguepediaMatchVods[]> {
  try {
    const escaped = teamName.replace(/"/g, '\\"');
    // Over-fetch rows (a match can be several games) and group client-side
    // — Cargo's `limit` counts rows, not matches, and a Bo3/Bo5 series is
    // multiple rows.
    const rows = await cargoQuery({
      tables: 'ScoreboardGames',
      fields: 'MatchId,Team1,Team2,DateTime_UTC,VOD,N_GameInMatch',
      where: `Team1="${escaped}" OR Team2="${escaped}"`,
      order_by: 'DateTime_UTC DESC',
      limit: String(matchLimit * 5),
    });

    const byMatch = new Map<string, LeaguepediaMatchVods>();
    for (const row of rows) {
      if (!row.MatchId || !row.VOD) continue;
      const url = extractUrlFromWikitext(row.VOD);
      if (!url) continue;

      let match = byMatch.get(row.MatchId);
      if (!match) {
        const opponent = row.Team1 === teamName ? row.Team2 ?? '?' : row.Team1 ?? '?';
        match = { matchId: row.MatchId, opponent, dateTime: row.DateTime_UTC ?? '', games: [] };
        byMatch.set(row.MatchId, match);
      }
      match.games.push({ gameNumber: Number(row.N_GameInMatch) || match.games.length + 1, url });
    }

    return [...byMatch.values()]
      .sort((a, b) => b.dateTime.localeCompare(a.dateTime))
      .slice(0, matchLimit);
  } catch (err) {
    if (__DEV__) {
      console.log('[fetchLeaguepediaVods] threw for', teamName, ':', err);
    }
    return [];
  }
}
