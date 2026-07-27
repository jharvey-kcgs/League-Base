import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import { PlaceholderCard } from './PlaceholderCard';
import type { ScheduleEvent } from '../api/lolesportsClient';
import type { AsyncStatus } from '../hooks/useAsyncData';
import { formatMatchDate } from '../utils/formatMatchTime';

interface Props {
  status: AsyncStatus;
  events: ScheduleEvent[] | undefined;
}

export function RecentGames({ status, events }: Props) {
  const { colors } = useTheme();

  if (status === 'loading') {
    return (
      <View style={[styles.loading, { borderColor: colors.border }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (status === 'error') {
    return <PlaceholderCard label="Match results — couldn't load right now, pull to refresh in a bit" />;
  }

  const recent = (events ?? [])
    .filter((e) => e.state === 'completed')
    .sort((a, b) => b.startTime.localeCompare(a.startTime))
    .slice(0, 5);

  if (recent.length === 0) {
    return <PlaceholderCard label="No completed matches yet this split" />;
  }

  return (
    <View style={styles.list}>
      {recent.map((event) => (
        <MatchRow key={event.match?.id ?? event.startTime} event={event} />
      ))}
    </View>
  );
}

function MatchRow({ event }: { event: ScheduleEvent }) {
  const { colors } = useTheme();
  const [teamA, teamB] = event.match?.teams ?? [];
  const scoreA = teamA?.result?.gameWins ?? 0;
  const scoreB = teamB?.result?.gameWins ?? 0;

  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <AppText weight="bold" style={[styles.teams, { color: colors.text }]}>
        <AppText weight="bold" style={{ color: teamA?.result?.outcome === 'win' ? colors.accentReadable : colors.text }}>
          {teamA?.code ?? '?'}
        </AppText>
        {' '}
        {scoreA}-{scoreB}
        {' '}
        <AppText weight="bold" style={{ color: teamB?.result?.outcome === 'win' ? colors.accentReadable : colors.text }}>
          {teamB?.code ?? '?'}
        </AppText>
      </AppText>
      <AppText style={{ color: colors.textMuted }}>{formatMatchDate(event.startTime)}</AppText>
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
