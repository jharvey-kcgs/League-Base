import { readableTextOn, safeColor } from '../utils/colorContrast';
import type { Team } from '../types/team';

export interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  accentText: string;
}

const DARK_BASE = {
  background: '#0B0B0D',
  surface: '#17181C',
  text: '#F2F2F2',
  textMuted: '#9A9CA5',
  border: '#2A2B31',
};

const LIGHT_BASE = {
  background: '#F7F7F8',
  surface: '#FFFFFF',
  text: '#16171B',
  textMuted: '#5C5E68',
  border: '#E1E2E6',
};

// No team picked yet (onboarding) falls back to this gold, matching the
// gold/black lane icon set, rather than a generic blue.
const NEUTRAL_ACCENT_DARK = '#C89B3C';
const NEUTRAL_ACCENT_LIGHT = '#0468AC';

/** Picks primary/secondary from team.colors and blends them with the
 * light/dark base palette. Team color is used as an accent (borders, header
 * fills, buttons) rather than a full-screen background — several teams'
 * primary colors (bright yellow, white) would wreck body-text contrast if
 * used as a background fill. */
export function deriveTheme(team: Team | undefined, mode: 'light' | 'dark'): ThemeColors {
  const base = mode === 'dark' ? DARK_BASE : LIGHT_BASE;
  const fallback = mode === 'dark' ? NEUTRAL_ACCENT_DARK : NEUTRAL_ACCENT_LIGHT;
  const accent = safeColor(team?.colors.primary, fallback);
  return { ...base, accent, accentText: readableTextOn(accent) };
}
