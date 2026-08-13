import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
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
  colors: ThemeColors;
  setFavoriteTeamId: (teamId: string) => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [favoriteTeamId, setFavoriteTeamIdState] = useState<string | null>(null);
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [storedTeam, storedMode] = await Promise.all([getFavoriteTeamId(), getThemeMode()]);
      setFavoriteTeamIdState(storedTeam);
      setModeState(storedMode);
      setIsLoading(false);
    })();
  }, []);

  const colors = useMemo<ThemeColors>(() => {
    const team = favoriteTeamId ? getTeam(favoriteTeamId) : undefined;
    return deriveTheme(team, mode);
  }, [favoriteTeamId, mode]);

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
      value={{
        favoriteTeamId,
        isLoading,
        mode,
        colors,
        setFavoriteTeamId,
        setMode,
      }}
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
