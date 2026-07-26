import React from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import { PlaceholderCard } from './PlaceholderCard';
import { useAsyncData } from '../hooks/useAsyncData';
import { fetchGameVods, vodUrl, type ScheduleEvent, type GameVod } from '../api/lolesportsClient';
import type { AsyncStatus } from '../hooks/useAsyncData';
import { formatMatchDate } from '../utils/formatMatchTime';
import type { Region } from '../types/team';

interface Props {
  status: AsyncStatus;
  events: ScheduleEvent[] | undefined;
  teamCode: string;
  region: Region;
}

interface MatchVods {
  event: ScheduleEvent;
  games: GameVod[];
}

interface VodButton {
  label: string;
  url: string;
}

export function TeamVods({ status, events, teamCode, region }: Props) {
  const { colors } = useTheme();

  // LPL has a real, structural VOD gap (Tencent's exclusive broadcast
  // rights mean lolesports.com never has them) — a Leaguepedia Cargo API
  // fallback was built and genuinely worked, but Leaguepedia's rate
  // limiting turned out aggressive enough that a handful of test requests
  // locked out an entire network for 8+ hours, confirmed with a plain
  // browser hitting the same endpoint directly (not a React Native/fetch
  // quirk — a real, external rate limit). A real user innocently browsing
  // a few LPL pages could trip the same wall with no way for the app to
  // warn them or recover in the moment. Turned off entirely rather than
  // risk that — see FAQScreen.tsx and README Section 8 for the reasoning,
  // and leaguepediaClient.ts (unused, not deleted) if this ever gets
  // revisited behind real request caching.
  if (region === 'LPL') {
    return <PlaceholderCard label="VODs aren't available for LPL - see the FAQ page for why" permanent />;
  }

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

  return (
    <View style={styles.list}>
      {(vodsQuery.data ?? []).map(({ event, games }) => (
        <MatchVodRow
          key={event.match?.id ?? event.startTime}
          opponentLabel={`vs ${event.match?.teams?.find((t) => !!t && t.code !== teamCode)?.code ?? '?'}`}
          dateLabel={formatMatchDate(event.startTime)}
          buttons={dedupeLolesportsVods(games)}
        />
      ))}
    </View>
  );
}

/** Confirmed to genuinely vary by region, not just a hypothesis: LEC
 * publishes one combined recording covering every game in a series (all
 * "Game N" buttons pointing at the identical video), while CBLOL uploads a
 * separate VOD per individual game (a 2-1 series gets 3 distinct videos).
 * LCS/LCK/LPL/LCP unconfirmed either way as of this writing. Deduplicating
 * by the actual video ID, rather than assuming a specific region's
 * behavior, means this is correct automatically for whichever way any
 * given region turns out to publish VODs, with nothing region-specific to
 * maintain — both confirmed cases above needed zero special-casing. */
function dedupeLolesportsVods(games: GameVod[]): VodButton[] {
  if (games.length === 0) return [];
  const uniqueParams = new Set(games.map((g) => g.parameter));
  if (games.length > 1 && uniqueParams.size === 1) {
    return [{ label: 'Series', url: vodUrl(games[0].parameter, games[0].provider) }];
  }
  return games.map((g) => ({ label: `Game ${g.gameNumber}`, url: vodUrl(g.parameter, g.provider) }));
}

function MatchVodRow({
  opponentLabel,
  dateLabel,
  buttons,
}: {
  opponentLabel: string;
  dateLabel: string;
  buttons: VodButton[];
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.matchBlock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.matchHeader}>
        <AppText weight="bold" style={{ color: colors.text }}>
          {opponentLabel}
        </AppText>
        <AppText style={{ color: colors.textMuted }}>{dateLabel}</AppText>
      </View>
      {buttons.length === 0 ? (
        <AppText style={[styles.noVod, { color: colors.textMuted }]}>No VOD available for this match</AppText>
      ) : (
        <View style={styles.gameRow}>
          {buttons.map((b) => (
            <Pressable
              key={b.label}
              onPress={() => Linking.openURL(b.url)}
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
