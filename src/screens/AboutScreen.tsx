import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from '../components/AppText';
import { getTeamsLastUpdated } from '../data/teamsStore';

const SECTIONS: Array<{ heading: string; body: string }> = [
  {
    heading: 'What this is',
    body:
      'League Base is a personal companion app for LCS, LEC, LCK, and LPL — ' +
      'your favorite team on the home screen, and every other team browsable ' +
      'by region.',
  },
  {
    heading: 'Where the data comes from',
    body:
      'Team names, logos, colors, and rosters are compiled from Liquipedia. ' +
      'Live match results, schedules, and standings will come from the ' +
      "lolesports.com and Leaguepedia Cargo APIs — that part's still being built.",
  },
  {
    heading: 'No account, no server',
    body:
      "Everything runs on your device. There's no login and no custom backend " +
      '— your favorite team and theme preference are stored locally.',
  },
];

export function AboutScreen() {
  const { colors } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {SECTIONS.map((s) => (
        <View key={s.heading} style={styles.section}>
          <AppText weight="bold" style={[styles.heading, { color: colors.accent }]}>
            {s.heading}
          </AppText>
          <AppText style={[styles.body, { color: colors.text }]}>{s.body}</AppText>
        </View>
      ))}
      <AppText style={[styles.footnote, { color: colors.textMuted }]}>
        Team data last updated {getTeamsLastUpdated()}.
      </AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  section: { marginBottom: 24 },
  heading: { fontSize: 13, letterSpacing: 0.5, marginBottom: 6 },
  body: { fontSize: 14, lineHeight: 21 },
  footnote: { fontSize: 12, marginTop: 8, marginBottom: 24 },
});
