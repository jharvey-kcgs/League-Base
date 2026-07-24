import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppText } from '../../components/AppText';
import type { ThemeMode } from '../../data/favoriteTeam';

const OPTIONS: Array<{ mode: ThemeMode; label: string; subtitle: string }> = [
  { mode: 'system', label: 'Match device', subtitle: "Follow your phone's system setting" },
  { mode: 'light', label: 'Light', subtitle: 'Always use light mode' },
  { mode: 'dark', label: 'Dark', subtitle: 'Always use dark mode' },
];

export function ThemeSettingsScreen() {
  const { colors, mode, setMode } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {OPTIONS.map((opt) => {
        const selected = mode === opt.mode;
        return (
          <Pressable
            key={opt.mode}
            onPress={() => setMode(opt.mode)}
            style={({ pressed }) => [
              styles.row,
              {
                borderColor: selected ? colors.accent : colors.border,
                backgroundColor: pressed ? colors.surface : 'transparent',
              },
            ]}
          >
            <View style={styles.rowText}>
              <AppText weight="bold" style={[styles.label, { color: colors.text }]}>
                {opt.label}
              </AppText>
              <AppText style={[styles.subtitle, { color: colors.textMuted }]}>{opt.subtitle}</AppText>
            </View>
            <View
              style={[
                styles.radioOuter,
                { borderColor: selected ? colors.accent : colors.border },
              ]}
            >
              {selected && <View style={[styles.radioInner, { backgroundColor: colors.accent }]} />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
  },
  rowText: { flex: 1 },
  label: { fontSize: 16 },
  subtitle: { fontSize: 12, marginTop: 2 },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
});
