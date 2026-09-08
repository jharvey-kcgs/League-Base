import type { Region } from '../types/team';

export interface WorldsQualifiedTeam {
  /** Matches a key in teams.json's teams object. */
  teamId: string;
  /** 1-indexed seed within the region, confirmed once the region's own
   * Playoffs bracket determines final placement — null means the team
   * has qualified but its seed relative to its own region isn't final
   * yet (e.g. LCK's DK is confirmed 4th seed, but T1/GenG/HLE's 1st
   * through 3rd order is still being decided by their own bracket). */
  seed: number | null;
}

export interface WorldsRegionQualifiers {
  region: Region;
  /** Empty array means nothing is confirmed for this region yet. */
  teams: WorldsQualifiedTeam[];
}

/**
 * Hand-maintained, same discipline as the elimination-bracket connection
 * tables in lolesportsClient.ts — Worlds' own qualifying-teams list isn't
 * exposed as a clean, per-region API response anywhere; this is
 * transcribed directly from the official Worlds overview page
 * (https://lolesports.com/en-US/tournament/115660540725177488/overview)
 * plus direct region-specific confirmation, and updated by hand as more
 * regions lock in their own Playoffs. Last confirmed 2026-09-08.
 *
 * Order is deliberate — LCS, LEC, LCK, LPL, CBLOL, LCP — matching
 * REGIONS in teamsStore.ts and every region list elsewhere in the app,
 * not the qualification order teams actually locked in.
 */
export const WORLDS_QUALIFIERS: WorldsRegionQualifiers[] = [
  // LCS — no teams confirmed yet.
  { region: 'LCS', teams: [] },
  // LEC — KC and G2 confirmed qualified (official Worlds overview page),
  // seed order not yet determined.
  {
    region: 'LEC',
    teams: [
      { teamId: 'kc', seed: null },
      { teamId: 'g2', seed: null },
    ],
  },
  // LCK — all 4 semifinalists confirmed qualified (T1, GenG, HLE, DK).
  // DK's 4th seed is directly confirmed (lost Lower Bracket Round 3 to
  // T1 in the Regional Championship); the other three's 1st-3rd order
  // is still being decided by that same bracket.
  {
    region: 'LCK',
    teams: [
      { teamId: 't1', seed: null },
      { teamId: 'geng', seed: null },
      { teamId: 'hle', seed: null },
      { teamId: 'dk', seed: 4 },
    ],
  },
  // LPL — BLG confirmed qualified (won Upper Bracket Finals in Playoffs),
  // remaining slots not yet determined.
  {
    region: 'LPL',
    teams: [{ teamId: 'blg', seed: null }],
  },
  // CBLOL — no teams confirmed yet.
  { region: 'CBLOL', teams: [] },
  // LCP — fully locked: Secret Whales (TSW) 1st, CFO 2nd, MVK 3rd.
  {
    region: 'LCP',
    teams: [
      { teamId: 'secret', seed: 1 },
      { teamId: 'cfo', seed: 2 },
      { teamId: 'mvk', seed: 3 },
    ],
  },
];
