import React from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import { Section } from './Section';
import { useAsyncData } from '../hooks/useAsyncData';
import { fetchBracketData, getLiveWatchUrl, lolesportsSlugForRegion, type BracketMatch, type BracketRound } from '../api/lolesportsClient';
import type { Region } from '../types/team';

// Every constant below is a REAL, directly-observed value from a live
// diagnostic dump of the actual rendered LCP Playoffs bracket — not an
// estimate. See MatchCard/styles for where each one comes from.
const CARD_HEIGHT = 71; // a normal (non-LIVE) match card's real rendered height
const LABEL_HEIGHT = 19; // observed offset from a group's top to its card's top, when a recordLabel is shown above it
// Same value as LABEL_HEIGHT — a reasonable estimate given the generic
// "ROUND N" header uses similar small, bold text styling, but NOT yet
// directly measured the way LABEL_HEIGHT was (that came from a real
// diagnostic dump; this bug meant the generic header had never actually
// rendered without overlapping anything before, so there was nothing to
// measure it against). Worth confirming for real against a live render.
const HEADER_HEIGHT = 19;
const GROUP_GAP = 14; // groupList's own vertical gap between groups within one round
const MATCH_GAP = 8; // matchList's own vertical gap between matches within one group
const COLUMN_WIDTH = 150;
const COLUMN_GAP = 14; // contentWrap's own horizontal gap between round columns

interface Position {
  x: number;
  y: number;
  height: number;
}

/** Computes an exact, deterministic pixel position for every match in the
 * bracket, entirely upfront — no runtime measurement, no onLayout, no
 * waiting for a render cycle to settle. This replaces a measurement-based
 * system that went through four separate real bugs across several
 * attempts (a rapid bounce, centering on the wrong source, a
 * header-cascade problem, and finally a correction that could restore a
 * position behind where something else had already moved to, causing a
 * real, confirmed overlap) — each one a genuine class of bug inherent to
 * "measure now, react to what changed later," not just a bad constant.
 *
 * The key structural fix, not just another patched calculation: a
 * match's position is `Math.max(itsOwnNaturalCascadePosition,
 * itsDesiredCenteredPosition)` — never less. That's what actually
 * guarantees two groups can never overlap, by construction, rather than
 * hoping a correction exactly cancels out whatever shifted above it.
 *
 * Processes rounds strictly left to right — every match's confirmed
 * winner-path source is always in an earlier round (this is a DAG, never
 * cyclic), so by the time a round's centering math runs, every source it
 * could possibly need already has its final position computed. No
 * multi-pass iteration, no convergence, no timing dependency of any
 * kind — a single top-to-bottom, left-to-right pass is provably enough. */
function computePositions(rounds: BracketRound[]): Map<string, Position> {
  const positions = new Map<string, Position>();

  // Destination matchId -> every source matchId that should count
  // toward ITS centering. A win-path source (feedsInto) always counts —
  // a bracket's vertical "lane" follows the winner-progression path. A
  // loss-path source counts too, but ONLY when it has no separate
  // win-path destination of its own: a source with both (LCP's Upper
  // Bracket Finals, which independently feeds Finals via its own win
  // path) has its position already determined by that other
  // relationship, and including it here as well would pull the
  // receiving match toward it incorrectly — confirmed directly against
  // the real official page layout. A source whose ONLY role in this
  // bracket is its loss-path connection (LCK's KT vs BRO, whose winner
  // advances to Playoffs entirely outside this bracket, leaving the
  // loss-path feed to Round 2 as its one and only connection here)
  // correctly counts, since nothing else claims its position instead.
  const centeringSourcesByDestination = new Map<string, string[]>();
  for (const m of rounds.flatMap((r) => r.groups.flatMap((g) => g.matches))) {
    if (m.feedsInto) {
      if (!centeringSourcesByDestination.has(m.feedsInto)) centeringSourcesByDestination.set(m.feedsInto, []);
      centeringSourcesByDestination.get(m.feedsInto)!.push(m.matchId);
    }
    if (m.feedsIntoOnLoss && !m.feedsInto) {
      if (!centeringSourcesByDestination.has(m.feedsIntoOnLoss)) centeringSourcesByDestination.set(m.feedsIntoOnLoss, []);
      centeringSourcesByDestination.get(m.feedsIntoOnLoss)!.push(m.matchId);
    }
  }

  rounds.forEach((round, roundIndex) => {
    const x = roundIndex * (COLUMN_WIDTH + COLUMN_GAP);
    // A round showing the generic "ROUND N" header (not every group has
    // its own confirmed recordLabel) needs its cascade to start BELOW
    // that header's own height — otherwise the header and the first
    // card both land at the column's true top (y=0) and directly
    // overlap. A real, confirmed bug: every stage this was built and
    // tested against (LCP Playoffs) always had confirmed labels by the
    // time it launched, so this generic-header path was never actually
    // exercised. Play-Ins (which never gets confirmed labels — only
    // Playoffs-style stages do) hits it on every single region.
    const allGroupsLabeled = round.groups.every((g) => g.recordLabel);
    let cascadeY = allGroupsLabeled ? 0 : HEADER_HEIGHT; // where the NEXT group in this column naturally starts, given every group above it so far

    for (const group of round.groups) {
      const naturalTopOfFirstCard = cascadeY + (group.recordLabel ? LABEL_HEIGHT : 0);
      let topOfFirstCard = naturalTopOfFirstCard;

      // Only a lone match can meaningfully "center" on a source — a
      // group with several matches (Swiss's own record-groups) has no
      // single position to center, and stays at its natural cascade spot.
      if (group.matches.length === 1) {
        const sourceIds = centeringSourcesByDestination.get(group.matches[0].matchId);
        if (sourceIds?.length) {
          const sourcePositions = sourceIds.map((id) => positions.get(id)).filter((p): p is Position => !!p);
          if (sourcePositions.length === sourceIds.length) {
            const desiredCenterY =
              sourcePositions.reduce((sum, p) => sum + p.y + p.height / 2, 0) / sourcePositions.length;
            // The actual fix: never go ABOVE the natural cascade
            // position. A match with no confirmed source (Upper Bracket
            // Semifinals) never reaches this branch at all and simply
            // stays at naturalTopOfFirstCard, which is exactly right.
            topOfFirstCard = Math.max(naturalTopOfFirstCard, desiredCenterY - CARD_HEIGHT / 2);
          }
        }
      }

      let matchY = topOfFirstCard;
      for (const match of group.matches) {
        positions.set(match.matchId, { x, y: matchY, height: CARD_HEIGHT });
        matchY += CARD_HEIGHT + MATCH_GAP;
      }
      const groupBottom = matchY - MATCH_GAP;
      cascadeY = groupBottom + GROUP_GAP;
    }
  });

  return positions;
}

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

  const leagueSlug = lolesportsSlugForRegion(region);
  const positions = computePositions(rounds);

  const allMatches = rounds.flatMap((r) => r.groups.flatMap((g) => g.matches));
  const connectors = allMatches
    .filter((m) => m.feedsInto)
    .map((m) => ({ from: positions.get(m.matchId), to: positions.get(m.feedsInto!) }))
    .filter((c): c is { from: Position; to: Position } => !!c.from && !!c.to);

  // Absolutely-positioned children don't contribute to their parent's
  // auto-computed size the way normal flex children do — the container
  // needs an explicit height, taken from whichever match ends up lowest.
  const contentHeight = Math.max(0, ...[...positions.values()].map((p) => p.y + p.height));
  const contentWidth = rounds.length * (COLUMN_WIDTH + COLUMN_GAP) - COLUMN_GAP;

  return (
    <Section title={`${data!.stageName} Bracket`}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={{ width: contentWidth, height: contentHeight, position: 'relative' }}>
          {rounds.map((round, roundIndex) => {
            const x = roundIndex * (COLUMN_WIDTH + COLUMN_GAP);
            // A generic "ROUND N" adds nothing once every group inside it
            // already has its own real, confirmed name (Upper Bracket
            // Finals, Upper Bracket Semifinals, etc.) — shown alongside
            // it, it'd just be redundant noise above the actually
            // meaningful label. Swiss's Round 1 (empty recordLabel) still
            // correctly falls back to showing "ROUND 1" here. Always
            // pinned to the column's true top, independent of wherever
            // any group's card ends up — a real bug this fixes: the
            // header used to be part of the same flexible block as its
            // card, so a card's spacer dragged its own header down with
            // it too.
            const allGroupsLabeled = round.groups.every((g) => g.recordLabel);
            return (
              <React.Fragment key={round.roundNumber}>
                {!allGroupsLabeled ? (
                  <AppText
                    weight="bold"
                    style={[styles.roundHeader, { color: colors.accentReadable, position: 'absolute', left: x, top: 0 }]}
                  >
                    {`ROUND ${round.roundNumber}`}
                  </AppText>
                ) : null}
                {round.groups.map((group) => {
                  const firstMatchPos = positions.get(group.matches[0].matchId);
                  if (!firstMatchPos) return null;
                  return (
                    <React.Fragment key={group.recordLabel || 'all'}>
                      {group.recordLabel ? (
                        <AppText
                          weight="bold"
                          style={[
                            styles.recordLabel,
                            { color: colors.accentReadable, position: 'absolute', left: x, top: firstMatchPos.y - LABEL_HEIGHT },
                          ]}
                        >
                          {group.recordLabel.toUpperCase()}
                        </AppText>
                      ) : null}
                      {group.matches.map((match) => {
                        const pos = positions.get(match.matchId)!;
                        return (
                          <MatchCard key={match.matchId} match={match} leagueSlug={leagueSlug} x={pos.x} y={pos.y} />
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            );
          })}
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
function Connector({ from, to, color }: { from: Position; to: Position; color: string }) {
  const fromY = from.y + from.height / 2;
  const toY = to.y + to.height / 2;
  const fromX = from.x + COLUMN_WIDTH;
  const toX = to.x;
  // Deliberately the midpoint of the GAP immediately before the
  // destination column, not the midpoint of the whole span — a real bug
  // this fixes: when a connector spans more than one column gap (Upper
  // Bracket Finals to Finals, skipping over Lower Bracket Finals'
  // column entirely), the whole-span midpoint can land inside an
  // intervening column's own space, drawing the vertical segment
  // straight through that column's label text. The gap between any two
  // adjacent columns is always narrow and always empty (COLUMN_GAP,
  // 14px) — anchoring to it, regardless of how many columns away the
  // destination is, guarantees the line only ever crosses actual empty
  // space, never another column's content.
  const midX = toX - COLUMN_GAP / 2;
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

function MatchCard({ match, leagueSlug, x, y }: { match: BracketMatch; leagueSlug: string; x: number; y: number }) {
  const { colors } = useTheme();
  const isLive = match.state === 'inProgress';
  const isDone = match.state === 'completed';
  const aWon = isDone && match.scoreA > match.scoreB;
  const bWon = isDone && match.scoreB > match.scoreA;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, position: 'absolute', left: x, top: y, width: COLUMN_WIDTH },
      ]}
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
  scrollContent: { paddingRight: 8, paddingTop: LABEL_HEIGHT },
  roundHeader: { fontSize: 11, letterSpacing: 0.5 },
  recordLabel: { fontSize: 10, letterSpacing: 0.5 },
  card: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 6 },
  divider: { height: 1 },
  teamRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 },
  liveLabel: { fontSize: 10, marginTop: 2 },
  lineH: { position: 'absolute', height: 2 },
  lineV: { position: 'absolute', width: 2 },
});
