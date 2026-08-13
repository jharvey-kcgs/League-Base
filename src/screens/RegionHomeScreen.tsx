import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions, DrawerActions } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { getRegionInfo, getTeamIdsForRegion, getTeam } from '../data/teamsStore';
import { AppHeader } from '../components/AppHeader';
import { Section } from '../components/Section';
import { FollowButton } from '../components/FollowButton';
import { UpcomingGames } from '../components/UpcomingGames';
import { RecentGames } from '../components/RecentGames';
import { OverallStandings } from '../components/OverallStandings';
import { BracketRounds } from '../components/BracketRounds';
import { TeamTile } from '../components/TeamTile';
import { useAsyncData } from '../hooks/useAsyncData';
import { fetchScheduleForRegion, clearApiCache } from '../api/lolesportsClient';
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
  // Shared by Upcoming and Recent games below — one fetch, not two.
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Bumped on pull-to-refresh — added to schedule's deps below, and passed
  // as OverallStandings' and BracketRounds' key so their own separate
  // internal fetches re-run too, since both fetch independently of the
  // schedule call here.
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Pull-to-refresh should mean "go get this fresh, right now" — without
    // clearing the cache first, a refetch this soon after the last one
    // would almost always just hit the still-valid cached value and look
    // like nothing happened.
    await clearApiCache();
    setRefreshKey((k) => k + 1);
    setIsRefreshing(false);
  };

  const schedule = useAsyncData(() => fetchScheduleForRegion(region), [region, refreshKey]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeader
        title={region}
        // Settings lives in the root Stack, not this nested RegionStack —
        // CommonActions.navigate bubbles up automatically to find it, same
        // as DrawerActions.openDrawer() does for the Drawer below.
        onOpenSettings={() => navigation.dispatch(CommonActions.navigate('Settings'))}
        onOpenRegions={() => navigation.dispatch(DrawerActions.openDrawer())}
      />
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}
      >
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
          <UpcomingGames status={schedule.status} events={schedule.data} />
        </Section>

        <Section title="Recent games">
          <RecentGames status={schedule.status} events={schedule.data} />
        </Section>

        <OverallStandings key={`standings-${refreshKey}`} region={region} />

        <BracketRounds key={`bracket-${refreshKey}`} region={region} />

        <Section title="Teams">
          <View style={styles.grid}>
            {teams.map(({ id, team }) => (
              <TeamTile key={id} team={team} onPress={() => navigation.navigate('Team', { teamId: id })} />
            ))}
          </View>
        </Section>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  followRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
