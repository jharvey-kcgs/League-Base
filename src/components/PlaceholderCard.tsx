import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';

export function PlaceholderCard({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.placeholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <AppText style={{ color: colors.textMuted, fontSize: 13 }}>
        {label} — coming once the live data layer is wired up.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { borderWidth: 1, borderRadius: 10, padding: 14 },
});
