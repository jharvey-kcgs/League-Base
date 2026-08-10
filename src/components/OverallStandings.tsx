import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import { PlaceholderCard } from './PlaceholderCard';
import { Section } from './Section';
import { useAsyncData } from '../hooks/useAsyncData';
import { fetchStandingsForRegion, type StandingsRow } from '../api/lolesportsClient';
import type { Region } from '../types/team';

export function OverallStandings({ region }: { region: Region }) {
  const { colors } = useTheme();
  const { status, data } = useAsyncData(() => fetchStandingsForRegion(region), [region]);

  // Unlike before, this now owns its own Section wrapper instead of
  // RegionHomeScreen wrapping it externally — the same reason Bracket
  // does: once the region's real regular-season stage is no longer the
  // current picture (Swiss finished, moved on to Play-Ins/Playoffs), the
  // underlying fetch correctly returns empty, and this should disappear
  // entirely (title included), not show an empty or stale table.
  if (status === 'loading') {
    return (
      <Section title="Overall standings">
        <View style={[styles.loading, { borderColor: colors.border }]}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Section>
    );
  }

  if (status === 'error') {
    return (
      <Section title="Overall standings">
        <PlaceholderCard label="Regular season standings — couldn't load right now, pull to refresh in a bit" />
      </Section>
    );
  }

  const groups = (data ?? []).filter((g) => g.rows.length > 0);
  if (groups.length === 0) {
    return null;
  }

  // Only show a group label when there's more than one group (LCK's
  // Legend/Rise, LPL's Ascend/Nirvana) — a single-group league (LCS, LEC)
  // doesn't need a redundant heading above its one table.
  const showLabels = groups.length > 1;

  return (
    <Section title="Overall standings">
      <View style={styles.groups}>
        {groups.map((group) => (
          <View key={group.name || 'default'} style={styles.groupWrap}>
            {showLabels && group.name ? (
              <AppText weight="bold" style={[styles.groupLabel, { color: colors.textMuted }]}>
                {group.name.toUpperCase()}
              </AppText>
            ) : null}
            <StandingsTable rows={group.rows} />
          </View>
        ))}
      </View>
    </Section>
  );
}

function StandingsTable({ rows }: { rows: StandingsRow[] }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.table, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {rows.map((row, i) => (
        <View
          key={row.id}
          style={[styles.row, i < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
        >
          <AppText weight="bold" style={[styles.ordinal, { color: colors.textMuted }]}>
            {row.ordinal}
          </AppText>
          <AppText weight="bold" style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {row.name}
          </AppText>
          <AppText style={{ color: colors.textMuted }}>
            {row.wins}-{row.losses}
          </AppText>
          {row.status === 'qualified' ? (
            <Ionicons name="lock-closed" size={14} color={colors.accent} style={styles.statusIcon} />
          ) : row.status === 'eliminated' ? (
            <Ionicons name="close-circle" size={16} color={colors.textMuted} style={styles.statusIcon} />
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { borderWidth: 1, borderRadius: 10, padding: 24, alignItems: 'center' },
  groups: { gap: 16 },
  groupWrap: { gap: 6 },
  groupLabel: { fontSize: 11, letterSpacing: 0.5 },
  table: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  ordinal: { fontSize: 13, width: 20 },
  name: { fontSize: 14, flex: 1 },
  statusIcon: { marginLeft: 2 },
});
