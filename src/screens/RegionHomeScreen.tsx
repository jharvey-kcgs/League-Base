import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { getTeamIdsForRegion, getTeam } from '../data/teamsStore';
import { AppText } from '../components/AppText';
import { TeamTile } from '../components/TeamTile';
import type { Region } from '../types/team';
import type { RegionStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RegionStackParamList, 'RegionHome'> & { region: Region };

export function RegionHomeScreen({ navigation, region }: Props) {
  const { colors } = useTheme();
  const teams = getTeamIdsForRegion(region)
    .map((id) => ({ id, team: getTeam(id) }))
    .filter((t): t is { id: string; team: NonNullable<typeof t.team> } => Boolean(t.team));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Region News / Upcoming Games / Overall Standings — step 4 */}
      <AppText weight="bold" style={[styles.sectionTitle, { color: colors.accent }]}>
        TEAMS
      </AppText>
      <View style={[styles.sectionRule, { backgroundColor: colors.border }]} />
      <View style={styles.grid}>
        {teams.map(({ id, team }) => (
          <TeamTile key={id} team={team} onPress={() => navigation.navigate('Team', { teamId: id })} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 12, letterSpacing: 1, marginTop: 8 },
  sectionRule: { height: 1, marginTop: 6, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
