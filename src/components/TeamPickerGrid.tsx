import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, SectionList, StyleSheet, View } from 'react-native';
import { getTeamsGroupedByRegion } from '../data/teamsStore';
import { useTheme } from '../theme/ThemeContext';
import { safeColor } from '../utils/colorContrast';
import { AppText } from './AppText';
import type { Team } from '../types/team';

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
              isSaving={savingId === id}
              isCurrent={currentTeamId === id}
              disabled={savingId !== null}
              onPress={() => handlePick(id)}
              colors={colors}
            />
          ))}
        </View>
      )}
    />
  );
}

function TeamTile({
  team,
  isSaving,
  isCurrent,
  disabled,
  onPress,
  colors,
}: {
  team: Team;
  isSaving: boolean;
  isCurrent: boolean;
  disabled: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const teamColor = safeColor(team.colors.primary, colors.accent);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: colors.surface,
          borderColor: teamColor,
          borderWidth: isCurrent ? 3 : 2,
          opacity: disabled && !isSaving ? 0.4 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={styles.logoWrap}>
        {isSaving ? (
          <ActivityIndicator color={teamColor} />
        ) : imageFailed || !team.logoUrl ? (
          <AppText weight="heavy" style={[styles.logoFallback, { color: teamColor }]}>
            {team.name.slice(0, 2).toUpperCase()}
          </AppText>
        ) : (
          <Image
            source={{ uri: team.logoUrl }}
            style={styles.logo}
            resizeMode="contain"
            onError={() => setImageFailed(true)}
          />
        )}
      </View>
      <AppText weight="medium" style={[styles.tileName, { color: colors.text }]} numberOfLines={1}>
        {team.name}
      </AppText>
    </Pressable>
  );
}

const TILE_SIZE = 100;

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionHeader: { paddingTop: 20, paddingBottom: 10 },
  sectionRegion: { fontSize: 13, letterSpacing: 1 },
  sectionName: { fontSize: 12, marginTop: 2 },
  sectionRule: { height: 1, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  logoWrap: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 48, height: 48 },
  logoFallback: { fontSize: 18 },
  tileName: { fontSize: 11, marginTop: 8, textAlign: 'center' },
});
