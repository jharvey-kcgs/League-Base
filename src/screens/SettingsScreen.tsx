import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from '../components/AppText';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const ROWS: Array<{
  key: keyof RootStackParamList;
  label: string;
  subtitle: string;
}> = [
  { key: 'SettingsProfile', label: 'Profile', subtitle: 'Change favorite team' },
  { key: 'SettingsTheme', label: 'Theme', subtitle: 'Light mode, dark mode' },
  { key: 'SettingsAbout', label: 'About', subtitle: 'What this app does, and where data comes from' },
  { key: 'SettingsFAQ', label: 'FAQ', subtitle: 'Common questions' },
  { key: 'SettingsData', label: 'Data', subtitle: 'Export, import, or delete app data' },
];

export function SettingsScreen({ navigation }: Props) {
  const { colors } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {ROWS.map((row) => (
        <Pressable
          key={row.key}
          onPress={() => navigation.navigate(row.key as never)}
          style={({ pressed }) => [
            styles.row,
            { borderBottomColor: colors.border, backgroundColor: pressed ? colors.surface : 'transparent' },
          ]}
        >
          <View style={styles.rowText}>
            <AppText weight="bold" style={[styles.rowLabel, { color: colors.text }]}>
              {row.label}
            </AppText>
            <AppText style={[styles.rowSubtitle, { color: colors.textMuted }]}>{row.subtitle}</AppText>
          </View>
          <AppText style={[styles.chevron, { color: colors.textMuted }]}>{'\u203A'}</AppText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 16 },
  rowSubtitle: { fontSize: 12, marginTop: 2 },
  chevron: { fontSize: 22 },
});
