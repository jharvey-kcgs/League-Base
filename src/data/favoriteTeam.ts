import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITE_TEAM_KEY = 'leagueBase:favoriteTeamId';
const THEME_MODE_KEY = 'leagueBase:themeMode';

export type ThemeMode = 'light' | 'dark';

export async function getFavoriteTeamId(): Promise<string | null> {
  return AsyncStorage.getItem(FAVORITE_TEAM_KEY);
}

export async function setFavoriteTeamId(teamId: string): Promise<void> {
  await AsyncStorage.setItem(FAVORITE_TEAM_KEY, teamId);
}

export async function getThemeMode(): Promise<ThemeMode> {
  const stored = await AsyncStorage.getItem(THEME_MODE_KEY);
  // Defaults to 'light' for anyone who's never set a preference — a new
  // user, or someone who set this back when 'system' was still an option
  // and never touched it since (a stored "system" value falls through to
  // this same default, rather than needing a separate migration step).
  return stored === 'dark' ? 'dark' : 'light';
}

export async function setThemeMode(mode: ThemeMode): Promise<void> {
  await AsyncStorage.setItem(THEME_MODE_KEY, mode);
}
