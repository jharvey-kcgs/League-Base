import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';

interface Props {
  label: string;
  /** True for a permanent, deliberate state (like LPL's VOD message) —
   * shows just the label as-is, no "coming once the live data layer is
   * wired up" suffix. That suffix is correct for genuine not-built-yet
   * placeholders (the default, and still what every other use of this
   * component needs) but actively wrong for something that isn't coming
   * later at all. */
  permanent?: boolean;
}

export function PlaceholderCard({ label, permanent = false }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.placeholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <AppText style={{ color: colors.textMuted, fontSize: 13 }}>
        {permanent ? label : `${label} — coming once the live data layer is wired up.`}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { borderWidth: 1, borderRadius: 10, padding: 14 },
});
