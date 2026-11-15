import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import { LogoChip } from './LogoChip';
import { getTeam } from '../data/teamsStore';
import { WORLDS_CHAMPION } from '../data/worldsChampion';

const GOLD = '#F5C542';

/** Spotlight card for the reigning Worlds champion. Tapping it opens the
 * champion's team page. Renders nothing if the team isn't in teams.json. */
export function WorldsChampion({ onSelectTeam }: { onSelectTeam: (teamId: string) => void }) {
  const { colors } = useTheme();
  const info = WORLDS_CHAMPION;
  const team = getTeam(info.teamId);
  if (!team) return null;

  return (
    <Pressable
      onPress={() => onSelectTeam(info.teamId)}
      style={({ pressed }: { pressed: boolean }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: GOLD, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <AppText weight="bold" style={styles.kicker}>
        🏆 {info.year} WORLD CHAMPIONS
      </AppText>
      <View style={styles.logoWrap}>
        <LogoChip url={team.logoUrl} name={team.name} ringColor={GOLD} size={88} />
      </View>
      <AppText weight="bold" style={[styles.name, { color: colors.text }]}>
        {team.name}
      </AppText>
      <AppText style={[styles.sub, { color: colors.textMuted }]}>
        {info.region} · Finals {info.score.champion}–{info.score.runnerUp} over {info.runnerUpName}
      </AppText>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <View style={styles.roster}>
        {info.players.map((p) => (
          <View key={p.username} style={styles.player}>
            <AppText weight="bold" style={[styles.playerName, { color: colors.text }]} numberOfLines={1}>
              {p.username}
            </AppText>
            <AppText style={[styles.playerRole, { color: colors.textMuted }]}>{p.role}</AppText>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 2, borderRadius: 14, paddingVertical: 18, paddingHorizontal: 14, alignItems: 'center' },
  kicker: { fontSize: 12, letterSpacing: 1.2, color: GOLD },
  logoWrap: { marginTop: 14, marginBottom: 10 },
  name: { fontSize: 22, textAlign: 'center' },
  sub: { fontSize: 13, marginTop: 4, textAlign: 'center' },
  divider: { height: 1, alignSelf: 'stretch', marginVertical: 14 },
  roster: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14 },
  player: { alignItems: 'center', minWidth: 56 },
  playerName: { fontSize: 14 },
  playerRole: { fontSize: 11, marginTop: 2 },
});
