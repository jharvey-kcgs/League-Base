/**
 * "Rajdhani" (Google Fonts, SIL Open Font License) — a squarish, technical
 * sans widely used across esports/gaming dashboard UIs. Genuinely free to
 * bundle (OFL, not just "personal use" like the free-font-aggregator sites
 * this project avoided earlier). Has a real weight range, so — unlike
 * "League" (FontGet), which only had one usable weight and was headers-only
 * — Rajdhani covers both headers/titles (Bold) and body/menu text
 * (Regular) from one family.
 *
 * This is a departure from Beaufort's inscriptional-serif character (the
 * real in-client LoL font, not redistributable — see git history for that
 * discussion), but it's not unfaithful: LoL's *other* official font,
 * Spiegel (body text), is itself a plain humanist sans. Riot's actual
 * pairing is "one distinctive display face + one quiet workhorse sans" —
 * Rajdhani plays both roles here instead of splitting them across two
 * families.
 *
 * To enable:
 *   1. Download the family from https://fonts.google.com/specimen/Rajdhani
 *      ("Download family" button — a .zip of all weights).
 *   2. From the zip, you need Rajdhani-Regular.ttf and Rajdhani-Bold.ttf.
 *   3. Drop both into assets/fonts/.
 *   4. Uncomment the block below and delete the no-op version underneath it.
 */

import { useFonts } from 'expo-font';
export const DISPLAY_FONT_ENABLED = true;
export function useAppFonts() {
  return useFonts({
    'Rajdhani-Regular': require('../../assets/fonts/Rajdhani-Regular.ttf'),
    'Rajdhani-Bold': require('../../assets/fonts/Rajdhani-Bold.ttf'),
  });
}

/** Headers/titles use Bold, body/menu text uses Regular — both from the
 * same family now (Rajdhani has a real weight range, unlike League). */
export const FONT_FAMILY: Record<'regular' | 'medium' | 'bold' | 'heavy', string | undefined> = {
  regular: DISPLAY_FONT_ENABLED ? 'Rajdhani-Regular' : undefined,
  medium: DISPLAY_FONT_ENABLED ? 'Rajdhani-Regular' : undefined,
  bold: DISPLAY_FONT_ENABLED ? 'Rajdhani-Bold' : undefined,
  heavy: DISPLAY_FONT_ENABLED ? 'Rajdhani-Bold' : undefined,
};

/** React Navigation's native-stack header title is drawn by the library
 * itself, not through <AppText> — so it needs this applied explicitly in
 * every navigator's screenOptions.headerTitleStyle, or it silently falls
 * back to the plain system font regardless of what AppText does elsewhere. */
export const headerTitleStyle = FONT_FAMILY.bold
  ? { fontFamily: FONT_FAMILY.bold }
  : { fontWeight: '700' as const };
