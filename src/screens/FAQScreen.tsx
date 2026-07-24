import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from '../components/AppText';

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'How often is roster data updated?',
    a: "Rosters are refreshed regularly during the season and more closely watched between splits, when trades happen. If a player looks out of date, that's the gap to check first.",
  },
  {
    q: "Why isn't my team showing up in its region?",
    a: 'A couple of LPL teams get relegated out of the active split roster (12 of 14 teams compete in Split 3). Relegated teams still exist in the app but are marked inactive until they\u2019re re-invited.',
  },
  {
    q: 'How do I change my favorite team?',
    a: 'Settings \u203A Profile \u203A tap any team. Your home screen and app colors update immediately.',
  },
  {
    q: "Why does my team's color look different than I expected?",
    a: "The app uses a team's color as an accent (borders, buttons, headers), not a full background fill \u2014 a few teams' colors (bright yellow, pure white) would make text unreadable as a background.",
  },
  {
    q: 'Where do match results and VODs come from?',
    a: "Match schedules and results come from lolesports.com, and VOD links and detailed scoreboards come from Leaguepedia's Cargo API. Both are free, public, and don't require an account \u2014 that part of the app isn't wired up yet.",
  },
  {
    q: "What's a Substitute badge on a roster entry?",
    a: 'A small dot on the lane icon marking a bench player rather than a starter \u2014 same lane icon, so you can still tell what position they play.',
  },
];

export function FAQScreen() {
  const { colors } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {FAQS.map((item) => (
        <View key={item.q} style={[styles.item, { borderBottomColor: colors.border }]}>
          <AppText weight="bold" style={[styles.question, { color: colors.text }]}>
            {item.q}
          </AppText>
          <AppText style={[styles.answer, { color: colors.textMuted }]}>{item.a}</AppText>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  item: { paddingBottom: 16, marginBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  question: { fontSize: 15, marginBottom: 6 },
  answer: { fontSize: 13, lineHeight: 19 },
});
