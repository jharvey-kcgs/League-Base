/** Minimal color helpers — enough to keep text readable both on top of an
 * arbitrary team accent color, AND when that accent color is itself used
 * as text against the app's own background (not a full WCAG audit tool,
 * but does real contrast-ratio math, not just a black/white guess). */

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = parseInt(full || '888888', 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [rl, gl, bl] = [toLinear(r), toLinear(g), toLinear(b)];
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/** WCAG contrast ratio between two hex colors — 1 (no contrast) to 21
 * (black on white). 4.5 is the standard minimum for normal-size text. */
export function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexToRgb(hexA));
  const lumB = relativeLuminance(hexToRgb(hexB));
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0);
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    default:
      h = (r - g) / d + 4;
  }
  return [h * 60, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  if (s === 0) {
    const v = Math.round(l * 255);
    return `#${[v, v, v].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hh = h / 360;
  const r = Math.round(hue2rgb(p, q, hh + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, hh) * 255);
  const b = Math.round(hue2rgb(p, q, hh - 1 / 3) * 255);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** Given a team's accent color and whatever background it'll sit on as
 * TEXT (not as a border/ring, where the raw color still looks best), nudges
 * lightness — preserving hue, so it still reads as "that team's color" —
 * just enough to pass WCAG AA (4.5:1) against that background. A pastel
 * team color (LYON's tan-gold, for instance) can fail this against a light
 * background exactly as easily as a very dark team color can fail it
 * against a dark background — this only makes small adjustments, not a
 * black/white flip, so the tuned color stays visibly "that team's hue." */
export function ensureReadableOn(colorHex: string, backgroundHex: string, minRatio = 4.5): string {
  if (contrastRatio(colorHex, backgroundHex) >= minRatio) return colorHex;
  const [h, s, l] = hexToHsl(colorHex);
  const bgIsLight = relativeLuminance(hexToRgb(backgroundHex)) > 0.5;
  let lightness = l;
  for (let i = 0; i < 20; i++) {
    lightness = bgIsLight ? Math.max(0, lightness - 0.04) : Math.min(1, lightness + 0.04);
    const candidate = hslToHex(h, s, lightness);
    if (contrastRatio(candidate, backgroundHex) >= minRatio) return candidate;
    if (lightness <= 0 || lightness >= 1) break;
  }
  // Couldn't get there by adjusting lightness alone (rare — very
  // low-saturation colors) — fall back to a guaranteed-safe neutral.
  return bgIsLight ? '#000000' : '#FFFFFF';
}

/** Returns '#000000' or '#FFFFFF', whichever gives better contrast against
 * the given background hex color. Use for text/icons drawn on a team color. */
export function readableTextOn(backgroundHex: string): '#000000' | '#FFFFFF' {
  const bgLum = relativeLuminance(hexToRgb(backgroundHex || '#888888'));
  const blackContrast = (bgLum + 0.05) / 0.05;
  const whiteContrast = 1.05 / (bgLum + 0.05);
  return blackContrast >= whiteContrast ? '#000000' : '#FFFFFF';
}

/** Falls back to a neutral gray if a team hasn't filled in a color yet, so
 * screens never render on a blank/invalid background. */
export function safeColor(hex: string | undefined, fallback = '#4B4B4B'): string {
  return hex && /^#[0-9A-Fa-f]{3,6}$/.test(hex.trim()) ? hex.trim() : fallback;
}

/** WCAG 1.4.11 (Non-text Contrast) sets 3:1 for UI component boundaries and
 * graphical objects — a real, lower bar than the 4.5:1 required for text
 * (ensureReadableOn's default). Use this for borders, rings, and large
 * color fills (a team-colored banner, a tile's selection border), where the
 * goal is "visually distinguishable from its background," not "readable as
 * text." A handful of teams are white- or black-branded (their logo really
 * is monochrome) — those colors need this adjustment in one mode or the
 * other no matter what, which is why this exists as a real function rather
 * than a one-off fix. */
export function ensureUIContrastOn(colorHex: string, backgroundHex: string): string {
  return ensureReadableOn(colorHex, backgroundHex, 3);
}
