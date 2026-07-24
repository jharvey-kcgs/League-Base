import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { laneFromRole, isSubstitute } from '../types/team';
import { useTheme } from '../theme/ThemeContext';

// Metro's require() for a static image resolves to a numeric asset id at runtime.
const LANE_ICONS: Record<string, number> = {
  'Top Lane': require('../../assets/images/lanes/top.png'),
  Jungle: require('../../assets/images/lanes/jungle.png'),
  'Mid Lane': require('../../assets/images/lanes/mid.png'),
  ADC: require('../../assets/images/lanes/adc.png'),
  Support: require('../../assets/images/lanes/support.png'),
};

interface Props {
  /** The roster player's raw role string, e.g. "ADC Substitute". */
  role: string;
  size?: number;
}

export function LaneIcon({ role, size = 28 }: Props) {
  const { colors } = useTheme();
  const lane = laneFromRole(role);
  const source = lane ? LANE_ICONS[lane] : undefined;

  return (
    <View style={{ width: size, height: size }}>
      {source ? (
        <Image source={source} style={{ width: size, height: size }} resizeMode="contain" />
      ) : (
        <View style={[styles.fallback, { width: size, height: size, borderColor: colors.border }]} />
      )}
      {isSubstitute(role) && (
        <View style={[styles.subBadge, { backgroundColor: colors.accent }]}>
          <View style={[styles.subDot, { backgroundColor: colors.accentText }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    borderWidth: 1,
    borderRadius: 4,
  },
  subBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
