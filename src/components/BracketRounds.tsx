import React, { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import { Section } from './Section';
import { useAsyncData } from '../hooks/useAsyncData';
import { fetchBracketData, getLiveWatchUrl, lolesportsSlugForRegion, type BracketMatch } from '../api/lolesportsClient';
import type { Region } from '../types/team';

interface CardRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function BracketRounds({ region }: { region: Region }) {
  const { colors } = useTheme();
  const { status, data } = useAsyncData(() => fetchBracketData(region), [region]);

  // Position of every rendered match card, relative to contentRef below —
  // populated as each MatchCard reports its own measured position. Used
  // to draw the connector lines, which should point at wherever a card
  // ACTUALLY is right now, including any spacer-driven shift.
  const [cardRects, setCardRects] = useState<Record<string, CardRect>>({});
  // Each card's FIRST-EVER measured position specifically, captured once
  // and never updated again — the stable baseline centering math reads
  // from, rather than the live cardRects (which already reflects
  // whatever shift is currently applied, and caused a real bounce bug
  // the one time this fed back into itself). Verified to converge to a
  // stable value across multiple render cycles before trusting it again.
  const [naturalRects, setNaturalRects] = useState<Record<string, CardRect>>({});
  const contentRef = useRef<View>(null);

  const reportCardRect = (matchId: string, nodeRef: React.RefObject<View | null>) => {
    const node = nodeRef.current;
    const container = contentRef.current;
    if (!node || !container) return;
    node.measure((_x, _y, width, height, pageX, pageY) => {
      container.measure((_cx, _cy, _cw, _ch, containerPageX, containerPageY) => {
        const next = { x: pageX - containerPageX, y: pageY - containerPageY, width, height };
        setCardRects((prev) => {
          const existing = prev[matchId];
          const unchanged =
            existing &&
            Math.abs(existing.x - next.x) < 0.5 &&
            Math.abs(existing.y - next.y) < 0.5 &&
            Math.abs(existing.width - next.width) < 0.5 &&
            Math.abs(existing.height - next.height) < 0.5;
          if (unchanged) return prev;
          return { ...prev, [matchId]: next };
        });
        setNaturalRects((prev) => (prev[matchId] ? prev : { ...prev, [matchId]: next }));
      });
    });
  };

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

  const leagueSlug = lolesportsSlugForRegion(region);

  // Every match that has a confirmed feedsInto target, paired with that
  // target's own rect once both are actually measured — connectors only
  // render once BOTH ends have a real position, never a guessed one.
  const connectors = rounds
    .flatMap((r) => r.groups.flatMap((g) => g.matches))
    .filter((m) => m.feedsInto)
    .map((m) => ({ from: cardRects[m.matchId], to: cardRects[m.feedsInto!] }))
    .filter((c): c is { from: CardRect; to: CardRect } => !!c.from && !!c.to);

  // Height of a real spacer element rendered directly above a lone
  // later-round match, pushing it down to align with the midpoint of the
  // entire previous round's span — the "boxed in the middle" look from
  // the official page. A REAL sibling element, not marginTop — a
  // previous attempt used marginTop and produced a card that rendered
  // off-screen, for a reason never fully confirmed; an actual spacer
  // reliably contributes to the column's real layout height regardless.
  // Deliberately reads from naturalRects (stable, set once), never
  // cardRects (live, already reflects any shift already applied) — using
  // the live value caused a separate, real bounce bug before. Clamped to
  // never go negative: shifting UP isn't a case this needs to support
  // for any bracket built so far, and a negative spacer height isn't
  // meaningful anyway — worst case with the clamp is no shift at all,
  // never a card pushed off the top of the screen. Scoped to only a
  // match that's alone in its group: repositioning one match among
  // several siblings would need to also reflow the others to avoid
  // overlapping them, a meaningfully harder problem this doesn't attempt
  // yet — every bracket built so far only ever needed this for a lone
  // match anyway (Play-Ins' Round 2 has exactly one).
  const spacerHeight: Record<string, number> = {};
  for (let i = 1; i < rounds.length; i++) {
    const round = rounds[i];
    const previousRoundMatchIds = rounds[i - 1].groups.flatMap((g) => g.matches.map((m) => m.matchId));
    const previousRects = previousRoundMatchIds.map((id) => naturalRects[id]).filter((r): r is CardRect => !!r);
    if (previousRects.length !== previousRoundMatchIds.length || previousRects.length === 0) continue; // wait for the whole previous round to be measured

    const spanTop = Math.min(...previousRects.map((r) => r.y));
    const spanBottom = Math.max(...previousRects.map((r) => r.y + r.height));
    const desiredCenterY = (spanTop + spanBottom) / 2;

    for (const group of round.groups) {
      if (group.matches.length !== 1) continue;
      const match = group.matches[0];
      const myNaturalRect = naturalRects[match.matchId];
      if (!myNaturalRect) continue;
      const myNaturalCenterY = myNaturalRect.y + myNaturalRect.height / 2;
      const offset = Math.max(0, desiredCenterY - myNaturalCenterY);
      if (offset >= 0.5) spacerHeight[match.matchId] = offset;
    }
  }

  return (
    <Section title={`${data!.stageName} Bracket`}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View ref={contentRef} style={styles.contentWrap}>
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
                        <React.Fragment key={match.matchId}>
                          {spacerHeight[match.matchId] ? <View style={{ height: spacerHeight[match.matchId] }} /> : null}
                          <MatchCard match={match} leagueSlug={leagueSlug} onMeasured={reportCardRect} />
                        </React.Fragment>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
          {connectors.map((c, i) => (
            <Connector key={i} from={c.from} to={c.to} color={colors.border} />
          ))}
        </View>
      </ScrollView>
    </Section>
  );
}

/** Draws an L-shaped connector from the right edge of one card's vertical
 * center to the left edge of another's — the same shape lolesports.com's
 * own bracket page uses. Built from three plain, absolutely-positioned
 * Views (a horizontal segment, a vertical segment, another horizontal
 * segment) rather than adding an SVG dependency for one simple line. */
function Connector({ from, to, color }: { from: CardRect; to: CardRect; color: string }) {
  const fromY = from.y + from.height / 2;
  const toY = to.y + to.height / 2;
  const fromX = from.x + from.width;
  const toX = to.x;
  const midX = fromX + (toX - fromX) / 2;
  const top = Math.min(fromY, toY);
  const height = Math.abs(toY - fromY);

  return (
    <>
      <View style={[styles.lineH, { left: fromX, top: fromY - 1, width: midX - fromX, backgroundColor: color }]} />
      <View style={[styles.lineV, { left: midX - 1, top, height, backgroundColor: color }]} />
      <View style={[styles.lineH, { left: midX, top: toY - 1, width: toX - midX, backgroundColor: color }]} />
    </>
  );
}

function MatchCard({
  match,
  leagueSlug,
  onMeasured,
}: {
  match: BracketMatch;
  leagueSlug: string;
  onMeasured: (matchId: string, ref: React.RefObject<View | null>) => void;
}) {
  const { colors } = useTheme();
  const isLive = match.state === 'inProgress';
  const isDone = match.state === 'completed';
  const aWon = isDone && match.scoreA > match.scoreB;
  const bWon = isDone && match.scoreB > match.scoreA;
  const cardRef = useRef<View>(null);

  // Re-measures on every layout pass, not just once — a card's height can
  // genuinely change (the LIVE label appearing/disappearing, a long team
  // code wrapping differently), and a connector drawn from a stale
  // measurement would visibly point at the wrong spot.
  const handleLayout = (_e: LayoutChangeEvent) => {
    if (match.feedsInto || cardRef.current) onMeasured(match.matchId, cardRef);
  };

  return (
    <View
      ref={cardRef}
      onLayout={handleLayout}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <TeamRow code={match.teamA.code} score={match.scoreA} highlighted={aWon} showScore={isDone} />
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <TeamRow code={match.teamB.code} score={match.scoreB} highlighted={bWon} showScore={isDone} />
      {isLive ? (
        <Pressable onPress={() => Linking.openURL(getLiveWatchUrl(leagueSlug))}>
          <AppText weight="bold" style={[styles.liveLabel, { color: colors.accentReadable, textDecorationLine: 'underline' }]}>
            LIVE
          </AppText>
        </Pressable>
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
  scrollContent: { paddingRight: 8 },
  contentWrap: { flexDirection: 'row', gap: 14, position: 'relative' },
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
  lineH: { position: 'absolute', height: 2 },
  lineV: { position: 'absolute', width: 2 },
});
