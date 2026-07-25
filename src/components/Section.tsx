import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <AppText weight="bold" style={[styles.sectionTitle, { color: colors.accentReadable }]}>
        {title.toUpperCase()}
      </AppText>
      <View style={[styles.sectionRule, { backgroundColor: colors.border }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 12, letterSpacing: 1 },
  sectionRule: { height: 1, marginTop: 6, marginBottom: 12 },
});
