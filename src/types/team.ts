import { safeColor } from '../utils/colorContrast';

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
  liquipediaPage: string;
  lolesportsSlug: string;
  colors: TeamColors;
  logoUrl: string;
  twitter: string;
  /** Not every team has every platform — all of these are optional. */
  weibo?: string;
  instagram?: string;
  youtubeChannel: string;
  twitch?: string;
  bilibili?: string;
  active: boolean;
  roster: {
    lastVerified: string;
    players: RosterPlayer[];
    coaches: RosterCoach[];
  };
}

export interface RegionInfo {
  displayName: string;
  liquipediaPage: string;
  logoUrl: string;
  twitter: string;
  /** Not every region has every platform — all of these are optional. */
  weibo?: string;
  instagram?: string;
  discord?: string;
  youtube: string;
  twitch?: string;
  bilibili?: string;
  teamIds: string[];
}

export interface TeamsData {
  schemaVersion: number;
  lastUpdated: string;
  notes: string;
  regions: Record<Region, RegionInfo>;
  teams: Record<string, Team>;
}

// Ordered [prefix in the role string, canonical Lane]. Matching by prefix
// (not exact string) is deliberate: starter roles are "Top Lane" / "Mid
// Lane" but substitute roles are "Top Substitute" / "Mid Substitute" — no
// "Lane" in the substitute variant. Stripping " Substitute" and expecting
// an exact match against the starter strings broke Top/Mid specifically
// (Jungle/ADC/Support happened to work since those starter roles never had
// a suffix to begin with). Prefix matching handles both forms uniformly.
const LANE_PREFIXES: Array<[string, Lane]> = [
  ['Top', 'Top Lane'],
  ['Jungle', 'Jungle'],
  ['Mid', 'Mid Lane'],
  ['ADC', 'ADC'],
  ['Support', 'Support'],
];

export function laneFromRole(role: string): Lane | null {
  const trimmed = role.trim();
  const match = LANE_PREFIXES.find(
    ([prefix]) => trimmed === prefix || trimmed.startsWith(prefix + ' ')
  );
  return match ? match[1] : null;
}

// The canonical Lane values ('Top Lane', 'Mid Lane') exist because that's
// what the icon lookup and teams.json's starter role strings use — but
// showing "Lane" in the UI reads inconsistently next to "Jungle" / "ADC" /
// "Support", which never had it. This is a display-only shortening; icon
// lookup and sorting still use the full Lane value above.
const LANE_SHORT_LABEL: Record<Lane, string> = {
  'Top Lane': 'Top',
  Jungle: 'Jungle',
  'Mid Lane': 'Mid',
  ADC: 'ADC',
  Support: 'Support',
};

export function laneShortLabel(lane: Lane): string {
  return LANE_SHORT_LABEL[lane];
}

export function isSubstitute(role: string): boolean {
  return role.endsWith('Substitute');
}

const LANE_ORDER: Record<Lane, number> = {
  'Top Lane': 0,
  Jungle: 1,
  'Mid Lane': 2,
  ADC: 3,
  Support: 4,
};

/** Sorts by Top → Jungle → Mid → ADC → Support, independent of the order
 * players happen to appear in teams.json. Roles with no recognized lane
 * (only the bare "Substitute" tag for a couple of unconfirmed positions)
 * sort last rather than breaking the ordering. */
export function compareByLane(a: RosterPlayer, b: RosterPlayer): number {
  const laneA = laneFromRole(a.role);
  const laneB = laneFromRole(b.role);
  const rankA = laneA ? LANE_ORDER[laneA] : 5;
  const rankB = laneB ? LANE_ORDER[laneB] : 5;
  return rankA - rankB;
}

/** A team's raw `colors.primary` is its actual brand color — for several
 * teams (a monochrome white or black logo) that's not usable as a UI
 * accent at all, which is what `colors.accent` is for: an explicit,
 * curated override for exactly those teams. Prefers accent when a team has
 * set one, falls back to primary otherwise. Callers still need to run the
 * result through ensureUIContrastOn/ensureReadableOn for the specific
 * background it'll render against — this only picks WHICH color, not
 * whether it's readable in the current mode. */
export function resolveTeamColor(team: Team, fallback = '#4B4B4B'): string {
  if (team.colors.accent && /^#[0-9A-Fa-f]{3,6}$/.test(team.colors.accent.trim())) {
    return team.colors.accent.trim();
  }
  return safeColor(team.colors.primary, fallback);
}
