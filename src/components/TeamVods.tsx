import React from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import { PlaceholderCard } from './PlaceholderCard';
import { useAsyncData } from '../hooks/useAsyncData';
import { fetchGameVods, vodUrl, type ScheduleEvent, type GameVod } from '../api/lolesportsClient';
import { fetchLeaguepediaVods, type LeaguepediaMatchVods } from '../api/leaguepediaClient';
import type { AsyncStatus } from '../hooks/useAsyncData';
import { formatMatchDate } from '../utils/formatMatchTime';
import type { Region } from '../types/team';

interface Props {
  status: AsyncStatus;
  events: ScheduleEvent[] | undefined;
  teamCode: string;
  /** Plain display name (teams.json's `name`) — needed for the Leaguepedia
   * fallback query, which matches on team name, not lolesportsSlug. */
  teamName: string;
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

export function TeamVods({ status, events, teamCode, teamName, region }: Props) {
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

  const hasAnyLolesportsVod = (vodsQuery.data ?? []).some((m) => m.games.length > 0);
  // LPL confirmed to have a real, structural gap in lolesports.com's VOD
  // coverage (Tencent's exclusive broadcast rights) — this fallback is
  // deliberately scoped to that one region, not attempted generally. Only
  // actually queries Leaguepedia once we know the primary source came back
  // completely empty, not preemptively.
  const shouldTryFallback = region === 'LPL' && vodsQuery.status === 'ready' && !hasAnyLolesportsVod;

  const fallbackQuery = useAsyncData<LeaguepediaMatchVods[]>(async () => {
    if (!shouldTryFallback) return [];
    return fetchLeaguepediaVods(teamName, 3);
  }, [shouldTryFallback, teamName]);

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

  // Primary source has real VOD data for at least one of the recent
  // matches — use it, unchanged from before. This is the path for every
  // region except LPL, and for LPL too if lolesports.com ever does have
  // something for it.
  if (hasAnyLolesportsVod) {
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

  // Primary source empty — for LPL, try the Leaguepedia fallback.
  if (shouldTryFallback) {
    if (fallbackQuery.status === 'loading') {
      return (
        <View style={[styles.loading, { borderColor: colors.border }]}>
          <ActivityIndicator color={colors.accent} />
        </View>
      );
    }
    const fallbackMatches = fallbackQuery.data ?? [];
    if (fallbackMatches.length > 0) {
      return (
        <View style={styles.list}>
          <AppText style={[styles.sourceNote, { color: colors.textMuted }]}>
            lolesports.com doesn't carry LPL VODs — showing community-sourced links from Leaguepedia instead.
          </AppText>
          {fallbackMatches.map((m) => (
            <MatchVodRow
              key={m.matchId}
              opponentLabel={`vs ${m.opponent}`}
              dateLabel={formatMatchDate(m.dateTime)}
              buttons={dedupeLeaguepediaVods(m.games)}
            />
          ))}
        </View>
      );
    }
    // Fallback also came up empty — fall through to the same "no VOD"
    // per-match display used everywhere else, rather than a special case.
  }

  return (
    <View style={styles.list}>
      {recentCompleted.map((event) => (
        <MatchVodRow
          key={event.match?.id ?? event.startTime}
          opponentLabel={`vs ${event.match?.teams?.find((t) => !!t && t.code !== teamCode)?.code ?? '?'}`}
          dateLabel={formatMatchDate(event.startTime)}
          buttons={[]}
        />
      ))}
    </View>
  );
}

/** LEC confirmed to publish one combined recording covering every game in
 * a series (all "Game N" buttons pointing at the identical video) rather
 * than separate per-game clips — LCS/LCK unconfirmed either way as of this
 * writing. Deduplicating by the actual video ID, rather than assuming a
 * specific region's behavior, means this is correct automatically for
 * whichever way any given region turns out to publish VODs, with nothing
 * region-specific to maintain. */
function dedupeLolesportsVods(games: GameVod[]): VodButton[] {
  if (games.length === 0) return [];
  const uniqueParams = new Set(games.map((g) => g.parameter));
  if (games.length > 1 && uniqueParams.size === 1) {
    return [{ label: 'Series', url: vodUrl(games[0].parameter, games[0].provider) }];
  }
  return games.map((g) => ({ label: `Game ${g.gameNumber}`, url: vodUrl(g.parameter, g.provider) }));
}

/** Same dedup reasoning as dedupeLolesportsVods, applied to Leaguepedia's
 * shape (already-full URLs, no separate provider field to build one from). */
function dedupeLeaguepediaVods(games: LeaguepediaMatchVods['games']): VodButton[] {
  if (games.length === 0) return [];
  const uniqueUrls = new Set(games.map((g) => g.url));
  if (games.length > 1 && uniqueUrls.size === 1) {
    return [{ label: 'Series', url: games[0].url }];
  }
  return games.map((g) => ({ label: `Game ${g.gameNumber}`, url: g.url }));
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
  sourceNote: { fontSize: 12, marginBottom: 2 },
  matchBlock: { borderWidth: 1, borderRadius: 10, padding: 14, gap: 8 },
  matchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  noVod: { fontSize: 12 },
  gameRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  gameButton: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
});
