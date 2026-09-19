import type { Region } from '../types/team';

export interface WorldsQualifiedTeam {
  /** Matches a key in teams.json's teams object — null means this seed
   * position is confirmed to exist, but which specific team will
   * occupy it isn't determined yet (genuinely different from a known
   * team whose seed number isn't final — see the seed field's own
   * comment for that case instead). */
  teamId: string | null;
  /** 1-indexed seed within the region, confirmed once the region's own
   * Playoffs bracket determines final placement — null means the team
   * has qualified but its seed relative to its own region isn't final
   * yet. Both this and teamId can be independently known or unknown:
   * a team can be confirmed with its seed still open (this was LCK's
   * own state before its Regional Championship finished), or a seed
   * position can be confirmed to exist with no team assigned to it yet
   * (LPL's remaining two slots, still undetermined). */
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
 * regions lock in their own Playoffs. Last confirmed 2026-09-09.
 *
 * Order is deliberate — LCS, LEC, LCK, LPL, CBLOL, LCP — matching
 * REGIONS in teamsStore.ts and every region list elsewhere in the app,
 * not the qualification order teams actually locked in.
 */
export const WORLDS_QUALIFIERS: WorldsRegionQualifiers[] = [
  // LCS — no teams confirmed yet. All 3 of LCS's Worlds slots will be
  // determined directly by its own Playoffs bracket (currently
  // underway), not a separate qualifier event.
  { region: 'LCS', teams: [] },
  // LEC — KC and G2 confirmed qualified (official Worlds overview
  // page), seed order not yet determined. LEC sends 3 teams total to
  // Worlds — the third slot, like the seed order for these first two,
  // will be determined directly by LEC's own Playoffs bracket
  // (currently underway).
  {
    region: 'LEC',
    teams: [
      { teamId: 'kc', seed: null },
      { teamId: 'g2', seed: null },
      { teamId: null, seed: null },
    ],
  },
  // LCK — fully locked, confirmed directly: GenG 1st, HLE 2nd, T1 3rd,
  // DK 4th (DK's own 4th seed was confirmed earlier, before the
  // Regional Championship had fully finished; the other three's order
  // is now settled too).
  {
    region: 'LCK',
    teams: [
      { teamId: 'geng', seed: 1 },
      { teamId: 'hle', seed: 2 },
      { teamId: 't1', seed: 3 },
      { teamId: 'dk', seed: 4 },
    ],
  },
  // LPL — fully locked: AL 1st, BLG 2nd (from Playoffs — AL won the
  // overall Finals, BLG runner-up), TES 3rd and IG 4th (from the
  // separate "Regional Qualifier" bracket built to fill these last two
  // seeds — TES won Round 1 outright for #3, and IG, having dropped to
  // Round 2 as Round 1's loser, won that to claim #4).
  {
    region: 'LPL',
    teams: [
      { teamId: 'al', seed: 1 },
      { teamId: 'blg', seed: 2 },
      { teamId: 'tes', seed: 3 },
      { teamId: 'ig', seed: 4 },
    ],
  },
  // CBLOL — no teams confirmed yet. All 3 of CBLOL's Worlds slots will
  // be determined directly by its own Playoffs bracket (currently
  // underway), not a separate qualifier event.
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
