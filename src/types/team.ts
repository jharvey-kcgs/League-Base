export type Region = 'LCS' | 'LEC' | 'LCK' | 'LPL';

export type Lane = 'Top Lane' | 'Jungle' | 'Mid Lane' | 'ADC' | 'Support';

export interface RosterPlayer {
  username: string;
  /** e.g. "Top Lane", "ADC Substitute". Use laneFromRole() to get the base lane. */
  role: string;
}

export interface RosterCoach {
  username: string;
  role: string;
}

export interface TeamColors {
  primary: string;
  secondary: string;
  accent: string;
}

export interface Team {
  name: string;
  region: Region;
  leaguepediaPage: string;
  lolesportsSlug: string;
  colors: TeamColors;
  logoUrl: string;
  twitter: string;
  /** LPL teams only — Weibo profile URL. Empty string elsewhere. */
  weibo?: string;
  youtubeChannel: string;
  active: boolean;
  roster: {
    lastVerified: string;
    players: RosterPlayer[];
    coaches: RosterCoach[];
  };
}

export interface RegionInfo {
  displayName: string;
  teamIds: string[];
}

export interface TeamsData {
  schemaVersion: number;
  lastUpdated: string;
  notes: string;
  regions: Record<Region, RegionInfo>;
  teams: Record<string, Team>;
}

/** Strips " Substitute" off a role string to get the base lane for icon lookup. */
export function laneFromRole(role: string): Lane | null {
  const base = role.replace(/ Substitute$/, '').trim();
  const valid: Lane[] = ['Top Lane', 'Jungle', 'Mid Lane', 'ADC', 'Support'];
  return (valid as string[]).includes(base) ? (base as Lane) : null;
}

export function isSubstitute(role: string): boolean {
  return role.endsWith('Substitute');
}
