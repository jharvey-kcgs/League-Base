import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import { PlaceholderCard } from './PlaceholderCard';
import { computeRecord, type ScheduleEvent } from '../api/lolesportsClient';
import type { AsyncStatus } from '../hooks/useAsyncData';

interface Props {
  status: AsyncStatus;
  events: ScheduleEvent[] | undefined;
  teamCode: string;
}

export function TeamRecord({ status, events, teamCode }: Props) {
  const { colors } = useTheme();

  if (status === 'loading') {
    return (
      <View style={[styles.loading, { borderColor: colors.border }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (status === 'error') {
    return <PlaceholderCard label="Win/loss record — couldn't load right now, pull to refresh in a bit" />;
  }

  const record = computeRecord(events ?? [], teamCode);

  if (record.wins === 0 && record.losses === 0) {
    return <PlaceholderCard label="No completed matches yet this split" />;
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <AppText weight="heavy" style={[styles.score, { color: colors.text }]}>
        {record.wins}-{record.losses}
      </AppText>
      <AppText style={{ color: colors.textMuted }}>Win / Loss</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { borderWidth: 1, borderRadius: 10, padding: 24, alignItems: 'center' },
  card: { borderWidth: 1, borderRadius: 10, padding: 16, alignItems: 'center', gap: 4 },
  score: { fontSize: 28 },
});
