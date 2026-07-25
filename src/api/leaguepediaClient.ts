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

async function cargoQuery<T>(params: Record<string, string>): Promise<T[]> {
  const query = new URLSearchParams({
    action: 'cargoquery',
    format: 'json',
    ...params,
  }).toString();
  const url = `${CARGO_BASE}?${query}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Leaguepedia Cargo query failed: HTTP ${res.status}`);
  }
  const data = (await res.json()) as { cargoquery?: Array<{ title: T }>; error?: { code: string; info: string } };

  // TEMPORARY — two consecutive real queries both came back with zero rows,
  // including the TeamRedirects lookup that was supposed to fix this. That's
  // suspicious enough to stop trusting "team name mismatch" as the
  // explanation. MediaWiki's API returns errors as HTTP 200 with an
  // {"error": {...}} body, not a non-2xx status — and the code below this
  // block only ever reads .cargoquery, which would silently treat a real
  // error the same as a genuine zero-row result. Logging the full response
  // (and the exact URL hit) to check for that instead of guessing again.
  if (__DEV__) {
    console.log('[cargoQuery] URL:', url);
    console.log('[cargoQuery] raw response:', JSON.stringify(data, null, 2));
  }

  if (data.error) {
    throw new Error(`Leaguepedia Cargo query error: ${data.error.code} — ${data.error.info}`);
  }

  return (data.cargoquery ?? []).map((r) => r.title);
}

/** ScoreboardGames.Team1/Team2 store a team's canonical Leaguepedia page
 * name, which doesn't reliably match teams.json's plain display name —
 * confirmed directly: querying "Bilibili Gaming" returned zero rows despite
 * that team having played and having completed matches. TeamRedirects
 * exists specifically to resolve name variants (rebrands, alternate
 * spellings, the exact display name at any point in time) to whatever
 * ScoreboardGames actually expects. One real quirk confirmed straight from
 * Leaguepedia's own developer: this table's canonical-name output field is
 * `_pageName`, unlike PlayerRedirects' equivalent (`OverviewPage`) — an
 * inconsistency in Leaguepedia's own schema, not a guess on our part. */
interface TeamRedirectRow {
  ResolvedName?: string;
}

async function resolveLeaguepediaTeamName(teamName: string): Promise<string> {
  try {
    const escaped = teamName.replace(/"/g, '\\"');
    const rows = await cargoQuery<TeamRedirectRow>({
      tables: 'TeamRedirects',
      fields: '_pageName=ResolvedName',
      where: `AllName="${escaped}"`,
      limit: '1',
    });
    return rows[0]?.ResolvedName ?? teamName;
  } catch {
    return teamName; // redirect lookup itself failing shouldn't block the main query
  }
}

interface ScoreboardGameRow {
  Team1?: string;
  Team2?: string;
  DateTime_UTC?: string;
  VOD?: string;
  MatchId?: string;
  N_GameInMatch?: string;
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
 * `name` field) — resolved through TeamRedirects internally, so callers
 * don't need to already know Leaguepedia's exact canonical name for a
 * team. Returns [] on any failure, same as lolesportsClient's fetch
 * functions — a fallback failing shouldn't be louder than the primary
 * source failing. */
export async function fetchLeaguepediaVods(teamName: string, matchLimit = 3): Promise<LeaguepediaMatchVods[]> {
  try {
    const resolvedName = await resolveLeaguepediaTeamName(teamName);
    const escaped = resolvedName.replace(/"/g, '\\"');

    if (__DEV__ && resolvedName !== teamName) {
      console.log('[fetchLeaguepediaVods] resolved', JSON.stringify(teamName), '->', JSON.stringify(resolvedName));
    }

    // Over-fetch rows (a match can be several games) and group client-side
    // — Cargo's `limit` counts rows, not matches, and a Bo3/Bo5 series is
    // multiple rows.
    const rows = await cargoQuery<ScoreboardGameRow>({
      tables: 'ScoreboardGames',
      fields: 'MatchId,Team1,Team2,DateTime_UTC,VOD,N_GameInMatch',
      where: `Team1="${escaped}" OR Team2="${escaped}"`,
      order_by: 'DateTime_UTC DESC',
      limit: String(matchLimit * 5),
    });

    if (__DEV__) {
      console.log('[fetchLeaguepediaVods] rows for', JSON.stringify(resolvedName), ':', JSON.stringify(rows, null, 2));
    }

    const byMatch = new Map<string, LeaguepediaMatchVods>();
    for (const row of rows) {
      if (!row.MatchId || !row.VOD) continue;
      const url = extractUrlFromWikitext(row.VOD);
      if (!url) continue;

      let match = byMatch.get(row.MatchId);
      if (!match) {
        const opponent = row.Team1 === resolvedName ? row.Team2 ?? '?' : row.Team1 ?? '?';
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
