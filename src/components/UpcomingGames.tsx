import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import { PlaceholderCard } from './PlaceholderCard';
import { useAsyncData } from '../hooks/useAsyncData';
import { fetchScheduleForRegion, type ScheduleEvent } from '../api/lolesportsClient';
import type { Region } from '../types/team';
import { formatMatchDateTime } from '../utils/formatMatchTime';

export function UpcomingGames({ region }: { region: Region }) {
  const { colors } = useTheme();
  const { status, data } = useAsyncData(async () => {
    const all = await fetchScheduleForRegion(region.toLowerCase());
    return all
      .filter((e) => e.state === 'unstarted' || e.state === 'inProgress')
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .slice(0, 5);
  }, [region]);

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

  const events = data ?? [];
  if (events.length === 0) {
    return <PlaceholderCard label="No upcoming matches scheduled right now" />;
  }

  return (
    <View style={styles.list}>
      {events.map((event) => (
        <MatchRow key={event.match.id ?? `${event.startTime}-${event.match.teams[0]?.code}`} event={event} />
      ))}
    </View>
  );
}

function MatchRow({ event }: { event: ScheduleEvent }) {
  const { colors } = useTheme();
  const [teamA, teamB] = event.match.teams;
  const isLive = event.state === 'inProgress';
  const time = formatMatchDateTime(event.startTime);

  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <AppText weight="bold" style={[styles.teams, { color: colors.text }]}>
        {teamA?.code ?? '?'} vs {teamB?.code ?? '?'}
      </AppText>
      <AppText weight={isLive ? 'bold' : 'regular'} style={{ color: isLive ? colors.accent : colors.textMuted }}>
        {isLive ? 'LIVE' : time}
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
  teams: { fontSize: 14 },
});
