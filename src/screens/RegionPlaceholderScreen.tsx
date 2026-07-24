import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from '../components/AppText';

/** Stand-in for the eventual Drawer (LCS/LEC/LCK/LPL region browsing). Wired
 * to the hamburger button now just so it's testable end-to-end — swap this
 * screen out once RootDrawer + RegionHomeScreen + TeamScreen exist. */
export function RegionPlaceholderScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppText weight="heavy" style={[styles.title, { color: colors.accent }]}>
        Region browsing
      </AppText>
      <AppText style={[styles.body, { color: colors.textMuted }]}>
        This is where the LCS / LEC / LCK / LPL drawer will live — browsing every
        team, not just your favorite. Not built yet.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { fontSize: 20, marginBottom: 12 },
  body: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
