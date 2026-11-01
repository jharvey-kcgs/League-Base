import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import { LogoChip } from './LogoChip';
import { PlaceholderCard } from './PlaceholderCard';
import { getTeam } from '../data/teamsStore';
import { resolveTeamColor } from '../types/team';
import { ensureUIContrastOn } from '../utils/colorContrast';
import { WORLDS_QUALIFIERS, WORLDS_CODE_TO_TEAM_ID, type WorldsQualifiedTeam } from '../data/worldsQualifiers';
import { useAsyncData } from '../hooks/useAsyncData';
import { fetchWorldsKnockoutLosers } from '../api/lolesportsClient';

// Same red the Swiss loss squares use in BracketRounds.tsx.
const ELIMINATED_RED = '#E5484D';

export function WorldsTeams({ onSelectTeam }: { onSelectTeam: (teamId: string) => void }) {
  const { colors } = useTheme();
  // Knockouts is single-elimination Bo5, so any team that has lost a match
  // there is out. Derived live from the same stage data the bracket uses —
  // the hand-set `eliminated` flags still count too (Play-In/Swiss exits).
  // If the request fails or Knockouts isn't live yet this is just empty and
  // the list shows only the hand-set flags.
  const { data: knockoutLosers } = useAsyncData(() => fetchWorldsKnockoutLosers(), []);
  const knockoutOutIds = new Set((knockoutLosers ?? []).map((code) => WORLDS_CODE_TO_TEAM_ID[code]).filter(Boolean));

  return (
    <View style={styles.regions}>
      {WORLDS_QUALIFIERS.map((group) => {
        // Region is already the abbreviation ('LCS', 'LEC', etc.) — no
        // need for the full display name here, per explicit request.
        // Seeded entries first, in seed order; unseeded ones after, in
        // whatever order they're listed — nothing to meaningfully sort
        // within that subset since none of them have a seed yet.
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
                      // teamId can be null (seed position confirmed, team
                      // not yet determined) — seed itself is always a
                      // stable, unique value within a region's own list
                      // here, unlike teamId, so it's the safer key.
                      key={qualifier.seed ?? `unseeded-${qualifier.teamId}`}
                      qualifier={qualifier}
                      knockoutOut={!!qualifier.teamId && knockoutOutIds.has(qualifier.teamId)}
                      isLast={i === sorted.length - 1}
                      onPress={qualifier.teamId ? () => onSelectTeam(qualifier.teamId!) : undefined}
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
  knockoutOut,
  isLast,
  onPress,
}: {
  qualifier: WorldsQualifiedTeam;
  /** True when the live Knockouts data says this team has lost a match. */
  knockoutOut: boolean;
  isLast: boolean;
  onPress?: () => void;
}) {
  const { colors } = useTheme();

  // A confirmed seed position with no team assigned yet (e.g. LPL's
  // remaining two Worlds slots) — same visual rhythm as a normal row,
  // but no logo, no team name, and not tappable, since there's nothing
  // real to show or navigate to yet.
  if (!qualifier.teamId) {
    return (
      <View style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
        <AppText weight="bold" style={[styles.seed, { color: colors.textMuted }]}>
          {qualifier.seed !== null ? `#${qualifier.seed}` : '—'}
        </AppText>
        <AppText style={[styles.teamName, { color: colors.textMuted }]}>TBD</AppText>
      </View>
    );
  }

  const team = getTeam(qualifier.teamId);
  // Shouldn't happen — every teamId here should match a real teams.json
  // entry — but a data typo silently disappearing a row is worse than a
  // visible gap while it gets fixed.
  if (!team) return null;
  const rawColor = resolveTeamColor(team, colors.accent);
  const ringColor = ensureUIContrastOn(rawColor, colors.surface);
  const out = !!qualifier.eliminated || knockoutOut;

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
      {/* An eliminated team stays in the list (so region grouping and seed
       * order still make sense, and it's still tappable) but its logo and
       * name are dimmed, the name is struck through, and a red ELIMINATED
       * tag sits on the right — the tag itself is NOT dimmed. */}
      <View style={out ? styles.dimmed : undefined}>
        <LogoChip url={team.logoUrl} name={team.name} ringColor={ringColor} size={32} />
      </View>
      <AppText
        weight="bold"
        style={[
          styles.teamName,
          { color: out ? colors.textMuted : colors.text },
          out && styles.struck,
        ]}
        numberOfLines={1}
      >
        {team.name}
      </AppText>
      {out ? (
        <View style={styles.eliminatedTag}>
          <AppText weight="bold" style={styles.eliminatedText}>
            ELIMINATED
          </AppText>
        </View>
      ) : null}
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
  dimmed: { opacity: 0.45 },
  struck: { textDecorationLine: 'line-through' },
  eliminatedTag: {
    borderWidth: 1,
    borderColor: ELIMINATED_RED,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  eliminatedText: { fontSize: 10, letterSpacing: 0.5, color: ELIMINATED_RED },
});
