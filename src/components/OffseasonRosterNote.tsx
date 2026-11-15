import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';

/** Small notice shown wherever a team roster appears, for as long as it's the
 * off-season and rosters are still being rebuilt. To retire it when the new
 * season starts, delete the <OffseasonRosterNote /> usages (or make this
 * component return null). */
export function OffseasonRosterNote() {
  const { colors } = useTheme();
  return (
    <View style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <AppText style={[styles.text, { color: colors.textMuted }]}>
        🛠 Off-season: rosters are a work in progress. Changes are added as teams confirm them.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 8 },
  text: { fontSize: 12, lineHeight: 17 },
});
