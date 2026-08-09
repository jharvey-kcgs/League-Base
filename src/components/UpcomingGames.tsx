import React from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import { PlaceholderCard } from './PlaceholderCard';
import { getLiveWatchUrl, type ScheduleEvent } from '../api/lolesportsClient';
import type { AsyncStatus } from '../hooks/useAsyncData';
import { formatMatchDateTime } from '../utils/formatMatchTime';

interface Props {
  status: AsyncStatus;
  events: ScheduleEvent[] | undefined;
}

export function UpcomingGames({ status, events }: Props) {
  const { colors } = useTheme();

  if (status === 'loading') {
    return (
      <View style={[styles.loading, { borderColor: colors.border }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (status === 'error') {
    return <PlaceholderCard label="Match schedule — couldn't load right now, pull to refresh in a bit" />;
  }

  const upcoming = (events ?? [])
    .filter((e) => e.state === 'unstarted' || e.state === 'inProgress')
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .slice(0, 5);

  if (upcoming.length === 0) {
    return <PlaceholderCard label="No upcoming matches scheduled right now" />;
  }

  return (
    <View style={styles.list}>
      {upcoming.map((event) => (
        <MatchRow key={event.match?.id ?? `${event.startTime}-${event.match?.teams?.[0]?.code}`} event={event} />
      ))}
    </View>
  );
}

function MatchRow({ event }: { event: ScheduleEvent }) {
  const { colors } = useTheme();
  const [teamA, teamB] = event.match?.teams ?? [];
  const isLive = event.state === 'inProgress';

  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <AppText weight="bold" style={[styles.teams, { color: colors.text }]}>
        {teamA?.code ?? '?'} vs {teamB?.code ?? '?'}
      </AppText>
      {isLive ? (
        <Pressable onPress={() => Linking.openURL(getLiveWatchUrl(event.league.slug))}>
          <AppText weight="bold" style={{ color: colors.accentReadable, textDecorationLine: 'underline' }}>
            LIVE
          </AppText>
        </Pressable>
      ) : (
        <AppText style={{ color: colors.textMuted }}>{formatMatchDateTime(event.startTime)}</AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { borderWidth: 1, borderRadius: 10, padding: 24, alignItems: 'center' },
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  teams: { fontSize: 14 },
});
