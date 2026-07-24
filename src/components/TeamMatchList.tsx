import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import { PlaceholderCard } from './PlaceholderCard';
import type { ScheduleEvent } from '../api/lolesportsClient';
import type { AsyncStatus } from '../hooks/useAsyncData';

interface Props {
  status: AsyncStatus;
  events: ScheduleEvent[] | undefined;
  teamCode: string;
}

export function TeamMatchList({ status, events, teamCode }: Props) {
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

  const all = events ?? [];
  const upcoming = all
    .filter((e) => e.state !== 'completed')
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .slice(0, 3);
  const recent = all
    .filter((e) => e.state === 'completed')
    .sort((a, b) => b.startTime.localeCompare(a.startTime))
    .slice(0, 3);

  if (upcoming.length === 0 && recent.length === 0) {
    return <PlaceholderCard label="No matches scheduled right now" />;
  }

  return (
    <View style={styles.list}>
      {upcoming.map((event) => (
        <MatchRow key={event.match.id} event={event} teamCode={teamCode} />
      ))}
      {recent.map((event) => (
        <MatchRow key={event.match.id} event={event} teamCode={teamCode} />
      ))}
    </View>
  );
}

function MatchRow({ event, teamCode }: { event: ScheduleEvent; teamCode: string }) {
  const { colors } = useTheme();
  const self = event.match.teams.find((t) => t.code === teamCode);
  const opponent = event.match.teams.find((t) => t.code !== teamCode);
  const opponentLabel = opponent?.code ?? '?';

  let rightLabel: string;
  let rightColor: string;
  if (event.state === 'inProgress') {
    rightLabel = 'LIVE';
    rightColor = colors.accent;
  } else if (event.state === 'completed') {
    const outcome = self?.result?.outcome;
    const score = `${self?.result?.gameWins ?? 0}-${opponent?.result?.gameWins ?? 0}`;
    rightLabel = `${outcome === 'win' ? 'W' : outcome === 'loss' ? 'L' : '—'} ${score}`;
    rightColor = outcome === 'win' ? colors.accent : colors.textMuted;
  } else {
    rightLabel = new Date(event.startTime).toLocaleString(undefined, {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
    rightColor = colors.textMuted;
  }

  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <AppText weight="bold" style={[styles.opponent, { color: colors.text }]}>
        vs {opponentLabel}
      </AppText>
      <AppText weight={event.state === 'inProgress' ? 'bold' : 'regular'} style={{ color: rightColor }}>
        {rightLabel}
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
