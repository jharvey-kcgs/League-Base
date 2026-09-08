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

        {/* Play-In doesn't start until mid-October — no real schedule data
         * exists yet to fetch. status="ready" with an empty events array
         * (rather than "loading" forever, or a custom one-off message) is
         * deliberate: it's honest (there genuinely are zero upcoming/recent
         * matches right now) and reuses each component's own already-
         * correct empty-state messaging, so nothing here needs to change
         * once a real fetchScheduleForWorlds()-style function exists later
         * — only the status/events source feeding these two would. */}
        <Section title="Upcoming games">
          <UpcomingGames status="ready" events={[]} />
        </Section>

        <Section title="Recent games">
          <RecentGames status="ready" events={[]} />
        </Section>

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
