import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import { PlaceholderCard } from './PlaceholderCard';
import { fetchScheduleForRegion, type ScheduleEvent } from '../api/lolesportsClient';
import type { Region } from '../types/team';

type Status = 'loading' | 'error' | 'ready';

export function UpcomingGames({ region }: { region: Region }) {
  const { colors } = useTheme();
  const [status, setStatus] = useState<Status>('loading');
  const [events, setEvents] = useState<ScheduleEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetchScheduleForRegion(region.toLowerCase())
      .then((all) => {
        if (cancelled) return;
        const upcoming = all
          .filter((e) => e.state === 'unstarted' || e.state === 'inProgress')
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
          .slice(0, 5);
        setEvents(upcoming);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
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

  if (events.length === 0) {
    return <PlaceholderCard label="No upcoming matches scheduled right now" />;
  }

  return (
    <View style={styles.list}>
      {events.map((event) => (
        <MatchRow key={event.id} event={event} />
      ))}
    </View>
  );
}

function MatchRow({ event }: { event: ScheduleEvent }) {
  const { colors } = useTheme();
  const [teamA, teamB] = event.match.teams;
  const isLive = event.state === 'inProgress';
  const time = new Date(event.startTime).toLocaleString(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

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
