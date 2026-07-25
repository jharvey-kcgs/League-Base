import React from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ensureUIContrastOn, readableTextOn } from '../utils/colorContrast';
import { laneFromRole, isSubstitute, compareByLane, laneShortLabel, resolveTeamColor, type Team } from '../types/team';
import { LaneIcon } from './LaneIcon';
import { AppText } from './AppText';
import { Section } from './Section';
import { FollowButton } from './FollowButton';
import { LogoChip } from './LogoChip';
import { TeamRecord } from './TeamRecord';
import { TeamUpcomingMatches } from './TeamUpcomingMatches';
import { TeamRecentMatches } from './TeamRecentMatches';
import { TeamVods } from './TeamVods';
import { useAsyncData } from '../hooks/useAsyncData';
import { fetchScheduleForTeam } from '../api/lolesportsClient';

/** The full "everything about one team" view — banner, record/matches/VOD
 * placeholders, sorted roster, coaching staff, socials. Shared by HomeScreen
 * (favorite team) and TeamScreen (any team, reached via region browsing) so
 * fixes and polish only need to happen in one place. */
export function TeamOverview({ team }: { team: Team }) {
  const { colors } = useTheme();
  const rawColor = resolveTeamColor(team, colors.accent);
  // Several teams are white- or black-branded — filling the banner with
  // that raw color made it disappear into the page background entirely in
  // one mode or the other (a big "blank" banner, not just faint text).
  const teamColor = ensureUIContrastOn(rawColor, colors.background);
  // Computed fresh against the ACTUAL (possibly-adjusted) fill above, not
  // colors.accentText — that's derived from the app-wide FAVORITE team's
  // raw color, which doesn't match what's actually painted on this banner
  // when viewing a different team's page (reached via region browsing).
  const bannerTextColor = readableTextOn(teamColor);
  const players = team.roster.players.filter((p) => !isSubstitute(p.role)).sort(compareByLane);
  const substitutes = team.roster.players.filter((p) => isSubstitute(p.role));
  // Shared by the Record and Matches sections below — one fetch, not two,
  // since both need the same underlying schedule data.
  const schedule = useAsyncData(
    () => fetchScheduleForTeam(team.region.toLowerCase(), team.lolesportsSlug),
    [team.region, team.lolesportsSlug]
  );

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.banner, { backgroundColor: teamColor }]}>
        <LogoChip url={team.logoUrl} name={team.name} ringColor={rawColor} size={96} />
        <AppText weight="bold" style={[styles.bannerRegion, { color: bannerTextColor }]}>
          {team.region}
        </AppText>
        <AppText weight="heavy" style={[styles.bannerName, { color: bannerTextColor }]}>
          {team.name}
        </AppText>
      </View>

      <Section title="Record">
        <TeamRecord status={schedule.status} events={schedule.data} teamCode={team.lolesportsSlug} />
      </Section>

      <Section title="Upcoming games">
        <TeamUpcomingMatches status={schedule.status} events={schedule.data} teamCode={team.lolesportsSlug} />
      </Section>

      <Section title="Recent games">
        <TeamRecentMatches status={schedule.status} events={schedule.data} teamCode={team.lolesportsSlug} />
      </Section>

      <Section title="Roster">
        {players.map((p) => (
          <RosterRow key={p.username} name={p.username} role={p.role} colors={colors} />
        ))}
        {substitutes.length > 0 && (
          <>
            <AppText weight="bold" style={[styles.subheading, { color: colors.textMuted }]}>
              Substitutes
            </AppText>
            {substitutes.map((p) => (
              <RosterRow key={p.username} name={p.username} role={p.role} colors={colors} />
            ))}
          </>
        )}
      </Section>

      <Section title="Coaching staff">
        {team.roster.coaches.map((c) => (
          <View key={c.username} style={styles.coachRow}>
            <View style={styles.coachNameGroup}>
              <Image
                source={require('../../assets/images/coach.png')}
                style={[styles.coachIcon, { tintColor: colors.textMuted }]}
                resizeMode="contain"
              />
              <AppText weight="medium" style={[styles.coachName, { color: colors.text }]}>
                {c.username}
              </AppText>
            </View>
            <AppText style={[styles.coachRole, { color: colors.textMuted }]}>{c.role}</AppText>
          </View>
        ))}
      </Section>

      <Section title="VODs">
        <TeamVods
          status={schedule.status}
          events={schedule.data}
          teamCode={team.lolesportsSlug}
          teamName={team.name}
          region={team.region}
        />
      </Section>

      <Section title="Follow">
        <View style={styles.followRow}>
          {team.twitter ? (
            <FollowButton label="Twitter/X" url={team.twitter} accent={teamColor} />
          ) : null}
          {team.weibo ? (
            <FollowButton label="Weibo" url={team.weibo} accent={teamColor} />
          ) : null}
          {team.instagram ? (
            <FollowButton label="Instagram" url={team.instagram} accent={teamColor} />
          ) : null}
          {team.youtubeChannel ? (
            <FollowButton label="YouTube" url={team.youtubeChannel} accent={teamColor} />
          ) : null}
          {team.twitch ? (
            <FollowButton label="Twitch" url={team.twitch} accent={teamColor} />
          ) : null}
          {team.bilibili ? (
            <FollowButton label="Bilibili" url={team.bilibili} accent={teamColor} />
          ) : null}
        </View>
      </Section>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function RosterRow({
  name,
  role,
  colors,
}: {
  name: string;
  role: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const lane = laneFromRole(role);
  return (
    <View style={styles.rosterRow}>
      <LaneIcon role={role} size={26} />
      <View style={styles.rosterText}>
        <AppText weight="bold" style={[styles.rosterName, { color: colors.text }]}>
          {name}
        </AppText>
        <AppText style={[styles.rosterRole, { color: colors.textMuted }]}>
          {lane ? laneShortLabel(lane) : role}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: { paddingTop: 32, paddingBottom: 24, alignItems: 'center' },
  bannerRegion: { fontSize: 12, letterSpacing: 1.5, marginTop: 10, opacity: 0.85 },
  bannerName: { fontSize: 24, marginTop: 2 },
  subheading: { fontSize: 12, marginTop: 12, marginBottom: 4 },
  rosterRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 },
  rosterText: { flex: 1 },
  rosterName: { fontSize: 15 },
  rosterRole: { fontSize: 12, marginTop: 1 },
  coachRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  coachNameGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coachIcon: { width: 15, height: 15 },
  coachName: { fontSize: 14 },
  coachRole: { fontSize: 12 },
  followRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
});
