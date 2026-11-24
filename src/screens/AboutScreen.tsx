import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from '../components/AppText';
import { getTeamsLastUpdated } from '../data/teamsStore';

const SECTIONS: Array<{ heading: string; body: string }> = [
  {
    heading: 'What this is',
    body:
      'League Base is a personal companion app for LCS, LEC, LCK, LPL, CBLOL, and LCP — ' +
      'your favorite team on the home screen, and every other team browsable ' +
      'by region. A Worlds section covers the international event, with the ' +
      'qualified teams listed by region.',
  },
  {
    heading: 'Where the data comes from',
    body:
      "Team names, logos, colors, and rosters are compiled from Liquipedia. Live " +
      'match schedules, results, standings, and VODs come from lolesports.com\u2019s ' +
      'own public data \u2014 free, no account needed. Coverage varies a little by ' +
      'region (see the FAQ for LPL\u2019s VOD situation specifically, and how the ' +
      'Bracket section works during Swiss, Play-Ins, or Playoffs). The Worlds ' +
      'qualified-teams list is maintained by hand from lolesports.com\u2019s official ' +
      'Worlds page and updated as each region finishes.',
  },
  {
    heading: 'Off-season',
    body:
      'Between seasons, rosters are a work in progress \u2014 changes are added as teams ' +
      'confirm them, and spots that are not settled yet show as TBD or RUMOR. Match ' +
      'schedules and results return when the new season starts.',
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
  const version = Constants.expoConfig?.version ?? 'unknown';
  const isUat = (Constants.expoConfig?.name ?? '').includes('UAT');

  const rows: Array<[string, string]> = [
    ['Version', version],
    ['Build', isUat ? 'UAT (testing)' : 'Release'],
    ['Storage', 'On this device only'],
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {SECTIONS.map((s) => (
        <View key={s.heading} style={styles.section}>
          <AppText weight="bold" style={[styles.heading, { color: colors.text }]}>
            {s.heading}
          </AppText>
          <AppText style={[styles.body, { color: colors.textMuted }]}>{s.body}</AppText>
        </View>
      ))}

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {rows.map(([label, value], i) => (
          <View
            key={label}
            style={[
              styles.row,
              i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
            ]}
          >
            <AppText style={[styles.rowLabel, { color: colors.text }]}>{label}</AppText>
            <AppText style={[styles.rowValue, { color: colors.textMuted }]}>{value}</AppText>
          </View>
        ))}
      </View>

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
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  rowLabel: { fontSize: 15 },
  rowValue: { fontSize: 15 },
  footnote: { fontSize: 12, marginTop: 16, marginBottom: 24 },
});
