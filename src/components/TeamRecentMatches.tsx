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
  teamCode: string;
}

export function TeamRecentMatches({ status, events, teamCode }: Props) {
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
    .slice(0, 3);

  if (recent.length === 0) {
    return <PlaceholderCard label="No completed matches yet this split" />;
  }

  return (
    <View style={styles.list}>
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
  const outcome = self?.result?.outcome;
  const score = `${self?.result?.gameWins ?? 0}-${opponent?.result?.gameWins ?? 0}`;
  const resultLabel = `${outcome === 'win' ? 'W' : outcome === 'loss' ? 'L' : '\u2014'} ${score}`;
  const rightLabel = `${resultLabel} \u00b7 ${formatMatchDate(event.startTime)}`;

  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <AppText weight="bold" style={[styles.opponent, { color: colors.text }]}>
        vs {opponent?.code ?? '?'}
      </AppText>
      <AppText style={{ color: outcome === 'win' ? colors.accent : colors.textMuted }}>{rightLabel}</AppText>
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
