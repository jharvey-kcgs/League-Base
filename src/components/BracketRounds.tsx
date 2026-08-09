import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import { Section } from './Section';
import { useAsyncData } from '../hooks/useAsyncData';
import { fetchBracketData, type BracketMatch } from '../api/lolesportsClient';
import type { Region } from '../types/team';

export function BracketRounds({ region }: { region: Region }) {
  const { colors } = useTheme();
  const { status, data } = useAsyncData(() => fetchBracketData(region), [region]);

  // Unlike Standings (always relevant), a bracket section only makes sense
  // while one is actually happening — so this owns its own Section wrapper
  // and can disappear (title included) rather than the parent screen always
  // showing an empty "Bracket" header for every region not currently in one.
  if (status === 'loading') {
    return (
      <Section title="Bracket">
        <View style={[styles.loading, { borderColor: colors.border }]}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Section>
    );
  }

  // A load failure here fails silently (no section at all) rather than a
  // visible error card — this is the one section on the screen that isn't
  // always expected to exist, so an error here shouldn't look like
  // something is broken when most regions simply don't have one active.
  if (status === 'error') {
    return null;
  }

  // rounds is empty either because there's no active bracket stage at all,
  // OR because the active stage is a real one (Play-Ins, Playoffs) that
  // isn't built out yet — see fetchBracketData's own comment. Either way,
  // nothing to show yet.
  const rounds = data?.rounds ?? [];
  if (rounds.length === 0) {
    return null;
  }

  return (
    <Section title={`${data!.stageName} Bracket`}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {rounds.map((round) => (
          <View key={round.roundNumber} style={styles.column}>
            <AppText weight="bold" style={[styles.roundHeader, { color: colors.textMuted }]}>
              ROUND {round.roundNumber}
            </AppText>
            <View style={styles.groupList}>
              {round.groups.map((group) => (
                <View key={group.recordLabel || 'all'} style={styles.groupBlock}>
                  {group.recordLabel ? (
                    <AppText weight="bold" style={[styles.recordLabel, { color: colors.accentReadable }]}>
                      {group.recordLabel}
                    </AppText>
                  ) : null}
                  <View style={styles.matchList}>
                    {group.matches.map((match) => (
                      <MatchCard key={match.matchId} match={match} />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </Section>
  );
}

function MatchCard({ match }: { match: BracketMatch }) {
  const { colors } = useTheme();
  const isLive = match.state === 'inProgress';
  const isDone = match.state === 'completed';
  const aWon = isDone && match.scoreA > match.scoreB;
  const bWon = isDone && match.scoreB > match.scoreA;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TeamRow code={match.teamA.code} score={match.scoreA} highlighted={aWon} showScore={isDone} />
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <TeamRow code={match.teamB.code} score={match.scoreB} highlighted={bWon} showScore={isDone} />
      {isLive ? (
        <AppText weight="bold" style={[styles.liveLabel, { color: colors.accentReadable }]}>
          LIVE
        </AppText>
      ) : null}
    </View>
  );
}

function TeamRow({
  code,
  score,
  highlighted,
  showScore,
}: {
  code: string;
  score: number;
  highlighted: boolean;
  showScore: boolean;
}) {
  const { colors } = useTheme();
  const isTBD = code === 'TBD';
  const textColor = isTBD ? colors.textMuted : highlighted ? colors.accentReadable : colors.text;

  return (
    <View style={styles.teamRow}>
      <AppText weight={highlighted ? 'bold' : 'regular'} style={{ color: textColor }} numberOfLines={1}>
        {code}
      </AppText>
      {showScore ? (
        <AppText weight={highlighted ? 'bold' : 'regular'} style={{ color: highlighted ? colors.accentReadable : colors.textMuted }}>
          {score}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { borderWidth: 1, borderRadius: 10, padding: 24, alignItems: 'center' },
  scrollContent: { gap: 14, paddingRight: 8 },
  column: { width: 150, gap: 8 },
  roundHeader: { fontSize: 11, letterSpacing: 0.5 },
  groupList: { gap: 14 },
  groupBlock: { gap: 6 },
  recordLabel: { fontSize: 10, letterSpacing: 0.5 },
  matchList: { gap: 8 },
  card: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 6 },
  divider: { height: 1 },
  teamRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 },
  liveLabel: { fontSize: 10, marginTop: 2 },
});
