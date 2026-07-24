import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { getTeam } from '../data/teamsStore';
import { TeamPickerGrid } from '../components/TeamPickerGrid';
import { AppText } from '../components/AppText';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'SettingsProfile'>;

export function ProfileSettingsScreen({ navigation }: Props) {
  const { colors, favoriteTeamId } = useTheme();
  const currentTeam = favoriteTeamId ? getTeam(favoriteTeamId) : undefined;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <AppText weight="medium" style={[styles.currentLabel, { color: colors.textMuted }]}>
          Current favorite team
        </AppText>
        <AppText weight="heavy" style={[styles.currentTeam, { color: colors.accent }]}>
          {currentTeam?.name ?? 'None set'}
        </AppText>
        <AppText style={[styles.hint, { color: colors.textMuted }]}>
          Tap any team below to switch. Your app colors update immediately.
        </AppText>
      </View>

      <TeamPickerGrid
        currentTeamId={favoriteTeamId}
        onPick={() => navigation.goBack()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  currentLabel: { fontSize: 12 },
  currentTeam: { fontSize: 22, marginTop: 2 },
  hint: { fontSize: 13, marginTop: 6, lineHeight: 18 },
});
