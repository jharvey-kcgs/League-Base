import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITE_TEAM_KEY = 'leagueBase:favoriteTeamId';
const THEME_MODE_KEY = 'leagueBase:themeMode';

export type ThemeMode = 'light' | 'dark' | 'system';

export async function getFavoriteTeamId(): Promise<string | null> {
  return AsyncStorage.getItem(FAVORITE_TEAM_KEY);
}

export async function setFavoriteTeamId(teamId: string): Promise<void> {
  await AsyncStorage.setItem(FAVORITE_TEAM_KEY, teamId);
}

export async function getThemeMode(): Promise<ThemeMode> {
  const stored = await AsyncStorage.getItem(THEME_MODE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

export async function setThemeMode(mode: ThemeMode): Promise<void> {
  await AsyncStorage.setItem(THEME_MODE_KEY, mode);
}

// --- Data export / import / delete (Settings > Data) ---
// Everything the app persists lives under these two keys right now. As more
// local data gets added later (cached match results, etc.) it should join
// this same export/import/clear trio rather than growing a parallel system.

interface ExportedData {
  schemaVersion: 1;
  exportedAt: string;
  favoriteTeamId: string | null;
  themeMode: ThemeMode;
}

export async function exportAppDataJSON(): Promise<string> {
  const [favoriteTeamId, themeMode] = await Promise.all([getFavoriteTeamId(), getThemeMode()]);
  const payload: ExportedData = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    favoriteTeamId,
    themeMode,
  };
  return JSON.stringify(payload, null, 2);
}

/** Throws with a user-readable message on invalid JSON or shape, so the
 * screen can show it directly rather than a raw parser error. */
export async function importAppDataJSON(json: string): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("That doesn't look like valid JSON.");
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Expected a JSON object.');
  }
  const data = parsed as Partial<ExportedData>;
  if (data.favoriteTeamId !== null && typeof data.favoriteTeamId !== 'string') {
    throw new Error('Missing or invalid "favoriteTeamId".');
  }
  if (data.themeMode !== 'light' && data.themeMode !== 'dark' && data.themeMode !== 'system') {
    throw new Error('Missing or invalid "themeMode".');
  }

  const ops: Promise<void>[] = [AsyncStorage.setItem(THEME_MODE_KEY, data.themeMode)];
  ops.push(
    data.favoriteTeamId
      ? AsyncStorage.setItem(FAVORITE_TEAM_KEY, data.favoriteTeamId)
      : AsyncStorage.removeItem(FAVORITE_TEAM_KEY)
  );
  await Promise.all(ops);
}

export async function clearAllAppData(): Promise<void> {
  await AsyncStorage.multiRemove([FAVORITE_TEAM_KEY, THEME_MODE_KEY]);
}
