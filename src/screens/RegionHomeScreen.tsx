import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { getRegionInfo, getTeamIdsForRegion, getTeam } from '../data/teamsStore';
import { Section } from '../components/Section';
import { PlaceholderCard } from '../components/PlaceholderCard';
import { FollowButton } from '../components/FollowButton';
import { UpcomingGames } from '../components/UpcomingGames';
import { TeamTile } from '../components/TeamTile';
import type { Region } from '../types/team';
import type { RegionStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RegionStackParamList, 'RegionHome'> & { region: Region };

export function RegionHomeScreen({ navigation, region }: Props) {
  const { colors } = useTheme();
  const info = getRegionInfo(region);
  const teams = getTeamIdsForRegion(region)
    .map((id) => ({ id, team: getTeam(id) }))
    .filter((t): t is { id: string; team: NonNullable<typeof t.team> } => Boolean(t.team))
    .filter((t) => t.team.active);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Section title="Region news">
        <View style={styles.followRow}>
          {info.twitter ? (
            <FollowButton label="Twitter/X" url={info.twitter} accent={colors.accent} />
          ) : null}
          {info.weibo ? (
            <FollowButton label="Weibo" url={info.weibo} accent={colors.accent} />
          ) : null}
          {info.instagram ? (
            <FollowButton label="Instagram" url={info.instagram} accent={colors.accent} />
          ) : null}
          {info.discord ? (
            <FollowButton label="Discord" url={info.discord} accent={colors.accent} />
          ) : null}
          {info.youtube ? (
            <FollowButton label="YouTube" url={info.youtube} accent={colors.accent} />
          ) : null}
          {info.twitch ? (
            <FollowButton label="Twitch" url={info.twitch} accent={colors.accent} />
          ) : null}
          {info.bilibili ? (
            <FollowButton label="Bilibili" url={info.bilibili} accent={colors.accent} />
          ) : null}
        </View>
      </Section>

      <Section title="Upcoming games">
        <UpcomingGames region={region} />
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
  followRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
