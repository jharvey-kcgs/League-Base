import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { readableTextOn, ensureUIContrastOn } from '../utils/colorContrast';
import { AppText } from './AppText';

// Fixed dark backdrop — deliberately not tied to team color or light/dark
// mode. Team logos are Liquipedia's "darkmode" variants (built to sit on a
// dark background), so a lot of them are white or near-white. Placed
// directly on the theme's surface color, they're fully legible in dark
// mode (surface is dark) but disappear entirely in light mode (surface is
// white) — a real accessibility failure, not just a cosmetic one. A
// constant dark chip guarantees contrast regardless of team color OR
// which mode the user has selected.
const LOGO_CHIP_COLOR = '#0B0B0D';

interface Props {
  url: string;
  name: string;
  ringColor: string;
  /** Chip diameter. Inner logo is sized proportionally. */
  size?: number;
}

export function LogoChip({ url, name, ringColor, size = 96 }: Props) {
  const [failed, setFailed] = useState(false);
  const fallbackTint = readableTextOn(LOGO_CHIP_COLOR);
  const logoSize = Math.round(size * 0.67);
  // The backdrop is fixed, but a team's color isn't guaranteed to show up
  // against it — a black-override team (several teams with monochrome
  // branding use one) would otherwise draw an invisible black ring on this
  // near-black chip. Checked here, once, rather than expecting every
  // caller to know this chip's own backdrop color.
  const safeRing = ensureUIContrastOn(ringColor, LOGO_CHIP_COLOR);

  return (
    <View
      style={[
        styles.chip,
        { width: size, height: size, borderRadius: size / 2, borderColor: safeRing },
      ]}
    >
      {!url || failed ? (
        <AppText weight="heavy" style={{ fontSize: size * 0.23, color: fallbackTint }}>
          {name.slice(0, 2).toUpperCase()}
        </AppText>
      ) : (
        <Image
          source={{ uri: url }}
          style={{ width: logoSize, height: logoSize }}
          resizeMode="contain"
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LOGO_CHIP_COLOR,
  },
});
