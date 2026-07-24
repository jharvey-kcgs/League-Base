import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { TeamPickerGrid } from '../components/TeamPickerGrid';
import { AppText } from '../components/AppText';

interface Props {
  /** Called once the user has picked a team and it's been saved. Onboarding
   * never navigates itself — the root navigator swaps screens once
   * favoriteTeamId is set (see App.tsx). */
  onComplete?: () => void;
}

export function OnboardingScreen({ onComplete }: Props) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <AppText weight="bold" style={[styles.eyebrow, { color: colors.accent }]}>
          WELCOME TO LEAGUE BASE
        </AppText>
        <AppText weight="heavy" style={[styles.title, { color: colors.text }]}>
          Pick your team
        </AppText>
        <AppText style={[styles.subtitle, { color: colors.textMuted }]}>
          This sets your home screen and app colors. You can change this later in Settings.
        </AppText>
      </View>

      <TeamPickerGrid onPick={() => onComplete?.()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12 },
  eyebrow: { fontSize: 12, letterSpacing: 1.5 },
  title: { fontSize: 28, marginTop: 6 },
  subtitle: { fontSize: 14, marginTop: 6, lineHeight: 20 },
});
