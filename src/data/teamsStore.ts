import teamsJson from '../../assets/data/teams.json';
import type { Region, Team, TeamsData } from '../types/team';

// teams.json is bundled with the app (no network needed to show team names,
// rosters, colors, logos). Live match/standings data layers on top of this
// later via the lolesports/Leaguepedia clients.
const data = teamsJson as unknown as TeamsData;

export const REGIONS: Region[] = ['LCS', 'LEC', 'LCK', 'LPL', 'CBLOL', 'LCP'];

export function getRegionDisplayName(region: Region): string {
  return data.regions[region].displayName;
}

/** Full region record — displayName, socials, team list. Prefer this over
 * the individual getters below when a screen needs more than one field. */
export function getRegionInfo(region: Region) {
  return data.regions[region];
}

export function getTeamIdsForRegion(region: Region): string[] {
  return data.regions[region].teamIds;
}

export function getTeam(teamId: string): Team | undefined {
  return data.teams[teamId];
}

export function getAllTeams(): Array<{ id: string; team: Team }> {
  return Object.entries(data.teams).map(([id, team]) => ({ id, team }));
}

/** Teams grouped by region, in the order defined in teams.json. Inactive
 * teams (e.g. relegated LPL clubs) are excluded — this feeds the
 * favorite-team picker (Onboarding, Settings > Profile), which shouldn't
 * offer a team that isn't currently competing. RegionHomeScreen filters
 * its own team grid the same way, separately. */
export function getTeamsGroupedByRegion(): Array<{
  region: Region;
  displayName: string;
  teams: Array<{ id: string; team: Team }>;
}> {
  return REGIONS.map((region) => ({
    region,
    displayName: getRegionDisplayName(region),
    teams: getTeamIdsForRegion(region)
      .map((id) => ({ id, team: data.teams[id] }))
      .filter((t) => t.team && t.team.active),
  }));
}

export function getTeamsLastUpdated(): string {
  return data.lastUpdated;
}

/** Case-insensitive substring match on team name, across every active
 * team in every region — the whole point being a user doesn't need to
 * know or navigate to the right region first. Inactive teams (relegated
 * LPL clubs) are excluded, same as everywhere else a team list is
 * shown — surfacing one here would just lead to a dead end, since
 * there's no page for a team that isn't currently competing. Empty
 * query returns nothing rather than every team, so a freshly-opened
 * search screen starts blank instead of dumping the full roster list. */
export function searchTeams(query: string): Array<{ id: string; team: Team; region: Region }> {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const results: Array<{ id: string; team: Team; region: Region }> = [];
  for (const region of REGIONS) {
    for (const id of getTeamIdsForRegion(region)) {
      const team = data.teams[id];
      if (!team?.active) continue;
      if (team.name.toLowerCase().includes(trimmed)) results.push({ id, team, region });
    }
  }

  // Teams whose name STARTS with the query surface first (searching "fn"
  // should put "Fnatic" ahead of a team that merely contains "fn"
  // somewhere in the middle of its name), then alphabetical within each
  // group.
  return results.sort((a, b) => {
    const aStarts = a.team.name.toLowerCase().startsWith(trimmed);
    const bStarts = b.team.name.toLowerCase().startsWith(trimmed);
    if (aStarts !== bStarts) return aStarts ? -1 : 1;
    return a.team.name.localeCompare(b.team.name);
  });
}
