import teamsJson from '../../assets/data/teams.json';
import type { Region, Team, TeamsData } from '../types/team';

// teams.json is bundled with the app (no network needed to show team names,
// rosters, colors, logos). Live match/standings data layers on top of this
// later via the lolesports/Leaguepedia clients.
const data = teamsJson as unknown as TeamsData;

export const REGIONS: Region[] = ['LCS', 'LEC', 'LCK', 'LPL'];

export function getRegionDisplayName(region: Region): string {
  return data.regions[region].displayName;
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
 * teams (e.g. relegated LPL clubs) are included — screens decide whether to
 * gray them out or hide them. */
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
      .filter((t) => t.team),
  }));
}

export function getTeamsLastUpdated(): string {
  return data.lastUpdated;
}
