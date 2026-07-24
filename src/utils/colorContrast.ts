/** Minimal color helpers — just enough to keep text readable on top of an
 * arbitrary team accent color. Not a full WCAG audit tool. */

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
