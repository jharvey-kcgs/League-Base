import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import { getTeam } from '../data/teamsStore';
import {
  getFavoriteTeamId,
  getThemeMode,
  setFavoriteTeamId as persistFavoriteTeamId,
  setThemeMode as persistThemeMode,
  type ThemeMode,
} from '../data/favoriteTeam';
import { deriveTheme, type ThemeColors } from './deriveTheme';

interface ThemeContextValue {
  favoriteTeamId: string | null;
  isLoading: boolean;
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  colors: ThemeColors;
  setFavoriteTeamId: (teamId: string) => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [favoriteTeamId, setFavoriteTeamIdState] = useState<string | null>(null);
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [storedTeam, storedMode] = await Promise.all([getFavoriteTeamId(), getThemeMode()]);
      setFavoriteTeamIdState(storedTeam);
      setModeState(storedMode);
      setIsLoading(false);
    })();
  }, []);

  const resolvedMode: 'light' | 'dark' =
    mode === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : mode;

  const colors = useMemo<ThemeColors>(() => {
    const team = favoriteTeamId ? getTeam(favoriteTeamId) : undefined;
    return deriveTheme(team, resolvedMode);
  }, [favoriteTeamId, resolvedMode]);

  const setFavoriteTeamId = async (teamId: string) => {
    await persistFavoriteTeamId(teamId);
    setFavoriteTeamIdState(teamId);
  };

  const setMode = async (next: ThemeMode) => {
    await persistThemeMode(next);
    setModeState(next);
  };

  return (
    <ThemeContext.Provider
      value={{ favoriteTeamId, isLoading, mode, resolvedMode, colors, setFavoriteTeamId, setMode }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
