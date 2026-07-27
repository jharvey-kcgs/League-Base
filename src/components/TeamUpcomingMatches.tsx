import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import { PlaceholderCard } from './PlaceholderCard';
import type { ScheduleEvent } from '../api/lolesportsClient';
import type { AsyncStatus } from '../hooks/useAsyncData';
import { formatMatchDateTime } from '../utils/formatMatchTime';

interface Props {
  status: AsyncStatus;
  events: ScheduleEvent[] | undefined;
  teamCode: string;
}

export function TeamUpcomingMatches({ status, events, teamCode }: Props) {
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
    .filter((e) => e.state !== 'completed')
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .slice(0, 3);

  if (upcoming.length === 0) {
    return <PlaceholderCard label="No upcoming matches scheduled right now" />;
  }

  return (
    <View style={styles.list}>
      {upcoming.map((event) => (
        <MatchRow key={event.match?.id ?? event.startTime} event={event} teamCode={teamCode} />
      ))}
    </View>
  );
}

function MatchRow({ event, teamCode }: { event: ScheduleEvent; teamCode: string }) {
  const { colors } = useTheme();
  const opponent = (event.match?.teams ?? []).find((t) => !!t && t.code !== teamCode);
  const isLive = event.state === 'inProgress';

  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <AppText weight="bold" style={[styles.opponent, { color: colors.text }]}>
        vs {opponent?.code ?? '?'}
      </AppText>
      <AppText weight={isLive ? 'bold' : 'regular'} style={{ color: isLive ? colors.accentReadable : colors.textMuted }}>
        {isLive ? 'LIVE' : formatMatchDateTime(event.startTime)}
      </AppText>
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
  opponent: { fontSize: 14 },
});
