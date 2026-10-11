import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { AppHeader } from '../components/AppHeader';
import { Section } from '../components/Section';
import { FollowButton } from '../components/FollowButton';
import { UpcomingGames } from '../components/UpcomingGames';
import { RecentGames } from '../components/RecentGames';
import { WorldsTeams } from '../components/WorldsTeams';
import { WorldsBracketRounds } from '../components/BracketRounds';
import { useAsyncData } from '../hooks/useAsyncData';
import { fetchScheduleForWorlds } from '../api/lolesportsClient';
import type { WorldsScreenProps } from '../navigation/types';

/** Official LoL Esports socials — not any one region's, since this screen
 * covers the whole event. Confirmed directly against each platform's real
 * account, not guessed: https://x.com/lolesports (2.5M+ followers, the
 * verified account actively posting #Worlds2026 qualification news),
 * https://www.youtube.com/@lolesports (official LoL Esports channel),
 * https://www.twitch.tv/lolesports, https://www.instagram.com/lolesports/
 * (handle confirmed via league official community-links page). */
const WORLDS_SOCIALS: Array<{ label: string; url: string }> = [
  { label: 'Twitter/X', url: 'https://x.com/lolesports' },
  { label: 'YouTube', url: 'https://www.youtube.com/@lolesports' },
  { label: 'Twitch', url: 'https://www.twitch.tv/lolesports' },
  { label: 'Instagram', url: 'https://www.instagram.com/lolesports/' },
];

export function WorldsScreen({ navigation }: WorldsScreenProps) {
  const { colors } = useTheme();
  // One shared fetch for both sections below — RecentGames and
  // UpcomingGames each filter the same full event list down to their own
  // half internally (completed vs unstarted/inProgress), exactly the way
  // every region's own screen already feeds both from one list, so there's
  // no need to split this into two separate fetches or two separate
  // useAsyncData calls.
  const { status, data: scheduleEvents } = useAsyncData(() => fetchScheduleForWorlds(), []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeader
        title="Worlds"
        onOpenSettings={() => navigation.navigate('Settings')}
        onOpenSearch={() => navigation.navigate('Search')}
        onOpenRegions={() => navigation.openDrawer()}
      />
      <ScrollView style={styles.container}>
        <Section title="World news">
          <View style={styles.followRow}>
            {WORLDS_SOCIALS.map((s) => (
              <FollowButton key={s.label} label={s.label} url={s.url} accent={colors.accent} />
            ))}
          </View>
        </Section>

        <Section title="Upcoming games">
          <UpcomingGames status={status} events={scheduleEvents} />
        </Section>

        <Section title="Recent games">
          <RecentGames status={status} events={scheduleEvents} />
        </Section>

        {/* Fires the same fetchActiveStage diagnostic log every other
         * region's bracket was built from, now pointed at Worlds' own
         * tournament ID — see WorldsBracketRounds' own comment. Renders
         * nothing until a stage with real, non-TBD matches comes back, so
         * this is silent until Play-In actually has real data to show. */}
        <WorldsBracketRounds />

        <Section title="Teams">
          <WorldsTeams onSelectTeam={(teamId) => navigation.navigate('TeamDetail', { teamId })} />
        </Section>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  followRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
});
