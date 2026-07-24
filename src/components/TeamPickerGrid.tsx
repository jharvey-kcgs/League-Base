import React, { useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { getTeamsGroupedByRegion } from '../data/teamsStore';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import { TeamTile } from './TeamTile';

interface Props {
  /** Called after the pick is saved to storage. */
  onPick: (teamId: string) => void;
  /** The currently-favorited team, if any — gets a highlighted border. */
  currentTeamId?: string | null;
}

export function TeamPickerGrid({ onPick, currentTeamId }: Props) {
  const { colors, setFavoriteTeamId } = useTheme();
  const [savingId, setSavingId] = useState<string | null>(null);

  const sections = getTeamsGroupedByRegion().map((r) => ({
    title: r.displayName,
    region: r.region,
    data: [r.teams], // one row per section, rendered as a wrapped grid below
  }));

  const handlePick = async (teamId: string) => {
    if (savingId) return; // ignore double-taps while saving
    setSavingId(teamId);
    await setFavoriteTeamId(teamId);
    onPick(teamId);
  };

  return (
    <SectionList
      sections={sections}
      keyExtractor={(_, i) => `row-${i}`}
      stickySectionHeadersEnabled
      contentContainerStyle={styles.listContent}
      renderSectionHeader={({ section }) => (
        <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
          <AppText weight="heavy" style={[styles.sectionRegion, { color: colors.accent }]}>
            {section.region}
          </AppText>
          <AppText style={[styles.sectionName, { color: colors.textMuted }]}>{section.title}</AppText>
          <View style={[styles.sectionRule, { backgroundColor: colors.border }]} />
        </View>
      )}
      renderItem={({ item: teams }) => (
        <View style={styles.grid}>
          {teams.map(({ id, team }) => (
            <TeamTile
              key={id}
              team={team}
              isLoading={savingId === id}
              isHighlighted={currentTeamId === id}
              disabled={savingId !== null}
              onPress={() => handlePick(id)}
            />
          ))}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionHeader: { paddingTop: 20, paddingBottom: 10 },
  sectionRegion: { fontSize: 13, letterSpacing: 1 },
  sectionName: { fontSize: 12, marginTop: 2 },
  sectionRule: { height: 1, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
