import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { getRegionInfo, getTeamIdsForRegion, getTeam } from '../data/teamsStore';
import { Section } from '../components/Section';
import { PlaceholderCard } from '../components/PlaceholderCard';
import { TwitterTimeline } from '../components/TwitterTimeline';
import { TeamTile } from '../components/TeamTile';
import type { Region } from '../types/team';
import type { RegionStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RegionStackParamList, 'RegionHome'> & { region: Region };

export function RegionHomeScreen({ navigation, region }: Props) {
  const { colors } = useTheme();
  const info = getRegionInfo(region);
  const teams = getTeamIdsForRegion(region)
    .map((id) => ({ id, team: getTeam(id) }))
    .filter((t): t is { id: string; team: NonNullable<typeof t.team> } => Boolean(t.team));

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Section title="Region news">
        <TwitterTimeline url={info.twitter} />
      </Section>

      <Section title="Upcoming games">
        <PlaceholderCard label="Match schedule" />
      </Section>

      <Section title="Overall standings">
        <PlaceholderCard label="Regular season standings" />
      </Section>

      <Section title="Teams">
        <View style={styles.grid}>
          {teams.map(({ id, team }) => (
            <TeamTile key={id} team={team} onPress={() => navigation.navigate('Team', { teamId: id })} />
          ))}
        </View>
      </Section>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
