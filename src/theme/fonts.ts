/**
 * Header/display font: "League" from FontGet (fontget.com/font/league) — a
 * lookalike inspired by the older LoL logo (itself based on Friz Quadrata),
 * NOT the real in-client Beaufort font. Beaufort itself is a commercial
 * typeface (Nick Shinn / Shinn Type Foundry, licensed to Riot via Monotype)
 * and isn't legitimately redistributable, so it's not what's wired up here.
 * "League" is listed free for personal + commercial use, which is why it's
 * the one this file expects.
 *
 * It only ships one real weight (Regular) plus two decorative Inline
 * styles — no bold/heavy — so it's used for headers/titles only. Body text
 * (roster names, FAQ answers, etc.) stays on the system font for
 * readability. Want League forced everywhere instead? Say so and I'll wire
 * fontFamily.regular to it too — the infra already supports it, this file
 * just doesn't turn it on by default.
 *
 * To enable:
 *   1. Download "League" from https://www.fontget.com/font/league/
 *   2. Unzip it and check the actual filename — likely League-Regular.ttf,
 *      but confirm against what's in the zip.
 *   3. Drop it into assets/fonts/.
 *   4. Uncomment the block below and delete the no-op version underneath it.
 */

// --- Real version — uncomment once assets/fonts/League-Regular.(ttf|otf) exists ---
// import { useFonts } from 'expo-font';
// export const DISPLAY_FONT_ENABLED = true;
// export function useAppFonts() {
//   return useFonts({
//     'League-Regular': require('../../assets/fonts/League-Regular.ttf'),
//   });
// }

// --- No-op version — active until the block above is swapped in ---
export const DISPLAY_FONT_ENABLED = false;
export function useAppFonts(): [boolean, Error | null] {
  return [true, null];
}

/** Headers/titles/eyebrows use the display font once enabled. Body text
 * intentionally stays on the system font — see file header note. */
export const FONT_FAMILY: Record<'regular' | 'medium' | 'bold' | 'heavy', string | undefined> = {
  regular: undefined,
  medium: undefined,
  bold: DISPLAY_FONT_ENABLED ? 'League-Regular' : undefined,
  heavy: DISPLAY_FONT_ENABLED ? 'League-Regular' : undefined,
};
