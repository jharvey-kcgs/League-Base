import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import { LogoChip } from './LogoChip';
import { PlaceholderCard } from './PlaceholderCard';
import { getTeam } from '../data/teamsStore';
import { resolveTeamColor } from '../types/team';
import { ensureUIContrastOn } from '../utils/colorContrast';
import { WORLDS_QUALIFIERS, type WorldsQualifiedTeam } from '../data/worldsQualifiers';

export function WorldsTeams({ onSelectTeam }: { onSelectTeam: (teamId: string) => void }) {
  const { colors } = useTheme();

  return (
    <View style={styles.regions}>
      {WORLDS_QUALIFIERS.map((group) => {
        // Region is already the abbreviation ('LCS', 'LEC', etc.) — no
        // need for the full display name here, per explicit request.
        // Seeded teams first, in seed order; unseeded teams after, in
        // whatever order they're listed — their own seed isn't known
        // yet, so there's no meaningful sort within that subset.
        const sorted = [...group.teams].sort((a, b) => {
          if (a.seed !== null && b.seed !== null) return a.seed - b.seed;
          if (a.seed !== null) return -1;
          if (b.seed !== null) return 1;
          return 0;
        });
        const hasAnyUnconfirmedSeed = group.teams.some((t) => t.seed === null);

        return (
          <View key={group.region} style={styles.regionGroup}>
            <AppText weight="bold" style={[styles.regionLabel, { color: colors.textMuted }]}>
              {group.region}
            </AppText>
            {sorted.length === 0 ? (
              <PlaceholderCard permanent label={`Determined by ${group.region} Playoffs`} />
            ) : (
              <>
                <View style={[styles.table, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {sorted.map((qualifier, i) => (
                    <QualifierRow
                      key={qualifier.teamId}
                      qualifier={qualifier}
                      isLast={i === sorted.length - 1}
                      onPress={() => onSelectTeam(qualifier.teamId)}
                    />
                  ))}
                </View>
                {hasAnyUnconfirmedSeed ? (
                  <AppText style={[styles.seedNote, { color: colors.textMuted }]}>
                    Remaining order determined by {group.region} Playoffs
                  </AppText>
                ) : null}
              </>
            )}
          </View>
        );
      })}
    </View>
  );
}

function QualifierRow({
  qualifier,
  isLast,
  onPress,
}: {
  qualifier: WorldsQualifiedTeam;
  isLast: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const team = getTeam(qualifier.teamId);
  // Shouldn't happen — every teamId here should match a real teams.json
  // entry — but a data typo silently disappearing a row is worse than a
  // visible gap while it gets fixed.
  if (!team) return null;
  const rawColor = resolveTeamColor(team, colors.accent);
  const ringColor = ensureUIContrastOn(rawColor, colors.surface);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <AppText weight="bold" style={[styles.seed, { color: colors.textMuted }]}>
        {qualifier.seed !== null ? `#${qualifier.seed}` : '—'}
      </AppText>
      <LogoChip url={team.logoUrl} name={team.name} ringColor={ringColor} size={32} />
      <AppText weight="bold" style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>
        {team.name}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  regions: { gap: 20 },
  regionGroup: { gap: 8 },
  regionLabel: { fontSize: 11, letterSpacing: 0.5 },
  table: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  seed: { fontSize: 13, width: 24 },
  teamName: { fontSize: 14, flex: 1 },
  seedNote: { fontSize: 12, fontStyle: 'italic', marginTop: 2 },
});
