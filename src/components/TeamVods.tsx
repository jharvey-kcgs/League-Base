import React from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import { PlaceholderCard } from './PlaceholderCard';
import { useAsyncData } from '../hooks/useAsyncData';
import { fetchGameVods, vodUrl, type ScheduleEvent, type GameVod } from '../api/lolesportsClient';
import type { AsyncStatus } from '../hooks/useAsyncData';
import { formatMatchDate } from '../utils/formatMatchTime';

interface Props {
  status: AsyncStatus;
  events: ScheduleEvent[] | undefined;
  teamCode: string;
}

interface MatchVods {
  event: ScheduleEvent;
  games: GameVod[];
}

export function TeamVods({ status, events, teamCode }: Props) {
  const { colors } = useTheme();

  const recentCompleted = (events ?? [])
    .filter((e) => e.state === 'completed')
    .sort((a, b) => b.startTime.localeCompare(a.startTime))
    .slice(0, 3);

  const matchIds = recentCompleted.map((e) => e.match?.id).join(',');

  const vodsQuery = useAsyncData<MatchVods[]>(async () => {
    if (status !== 'ready') return [];
    return Promise.all(
      recentCompleted.map(async (event) => {
        if (!event.match?.id) return { event, games: [] };
        const games = await fetchGameVods(event.match.id);
        return { event, games };
      })
    );
  }, [status, matchIds]);

  if (status === 'loading') {
    return (
      <View style={[styles.loading, { borderColor: colors.border }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (status === 'error') {
    return <PlaceholderCard label="VOD links — couldn't load right now, pull to refresh in a bit" />;
  }

  if (recentCompleted.length === 0) {
    return <PlaceholderCard label="No completed matches yet this split" />;
  }

  if (vodsQuery.status === 'loading') {
    return (
      <View style={[styles.loading, { borderColor: colors.border }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (vodsQuery.status === 'error') {
    return <PlaceholderCard label="VOD links — couldn't load right now, pull to refresh in a bit" />;
  }

  const matchVods = vodsQuery.data ?? [];

  return (
    <View style={styles.list}>
      {matchVods.map(({ event, games }) => (
        <MatchVodRow key={event.match?.id ?? event.startTime} event={event} games={games} teamCode={teamCode} />
      ))}
    </View>
  );
}

interface VodButton {
  label: string;
  parameter: string;
  provider: string;
}

/** LEC confirmed to publish one combined recording covering every game in
 * a series (all "Game N" buttons pointing at the identical video) rather
 * than separate per-game clips — LCS/LCK unconfirmed either way as of this
 * writing. Deduplicating by the actual video ID, rather than assuming a
 * specific region's behavior, means this is correct automatically for
 * whichever way any given region turns out to publish VODs, with nothing
 * region-specific to maintain. */
function dedupeVods(games: GameVod[]): VodButton[] {
  if (games.length === 0) return [];
  const uniqueParams = new Set(games.map((g) => g.parameter));
  if (games.length > 1 && uniqueParams.size === 1) {
    return [{ label: 'Series', parameter: games[0].parameter, provider: games[0].provider }];
  }
  return games.map((g) => ({ label: `Game ${g.gameNumber}`, parameter: g.parameter, provider: g.provider }));
}

function MatchVodRow({ event, games, teamCode }: { event: ScheduleEvent; games: GameVod[]; teamCode: string }) {
  const { colors } = useTheme();
  const opponent = event.match?.teams?.find((t) => !!t && t.code !== teamCode);
  const buttons = dedupeVods(games);

  return (
    <View style={[styles.matchBlock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.matchHeader}>
        <AppText weight="bold" style={{ color: colors.text }}>
          vs {opponent?.code ?? '?'}
        </AppText>
        <AppText style={{ color: colors.textMuted }}>{formatMatchDate(event.startTime)}</AppText>
      </View>
      {buttons.length === 0 ? (
        <AppText style={[styles.noVod, { color: colors.textMuted }]}>No VOD available for this match</AppText>
      ) : (
        <View style={styles.gameRow}>
          {buttons.map((b) => (
            <Pressable
              key={b.label}
              onPress={() => Linking.openURL(vodUrl(b.parameter, b.provider))}
              style={({ pressed }) => [
                styles.gameButton,
                { borderColor: colors.accent, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <AppText weight="bold" style={{ color: colors.text, fontSize: 12 }}>
                {b.label}
              </AppText>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { borderWidth: 1, borderRadius: 10, padding: 24, alignItems: 'center' },
  list: { gap: 10 },
  matchBlock: { borderWidth: 1, borderRadius: 10, padding: 14, gap: 8 },
  matchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  noVod: { fontSize: 12 },
  gameRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  gameButton: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
});
