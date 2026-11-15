/**
 * Worlds 2026 champion — hand-maintained, shown in the spotlight card at the
 * top of the Worlds screen. BLG beat Gen.G 3-1 in the Finals (2026-11-14).
 *
 * Roster is the five starters from teams.json (last verified 2026-08-24,
 * before Worlds) — double-check against the actual title-run lineup before
 * release; teamId must stay a key in teams.json.
 */
export interface WorldsChampionInfo {
  teamId: string;
  year: number;
  /** Finals series score from the champion's side. */
  score: { champion: number; runnerUp: number };
  runnerUpName: string;
  region: string;
  players: Array<{ username: string; role: string }>;
}

export const WORLDS_CHAMPION: WorldsChampionInfo = {
  teamId: 'blg',
  year: 2026,
  score: { champion: 3, runnerUp: 1 },
  runnerUpName: 'Gen.G',
  region: 'LPL',
  players: [
    { username: 'Bin', role: 'Top' },
    { username: 'XUN', role: 'Jungle' },
    { username: 'Knight', role: 'Mid' },
    { username: 'Viper', role: 'ADC' },
    { username: 'ON', role: 'Support' },
  ],
};
