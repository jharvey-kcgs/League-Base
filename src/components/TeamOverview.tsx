import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { safeColor, readableTextOn } from '../utils/colorContrast';
import { laneFromRole, isSubstitute, compareByLane, laneShortLabel, type Team } from '../types/team';
import { LaneIcon } from './LaneIcon';
import { AppText } from './AppText';
import { Section } from './Section';
import { PlaceholderCard } from './PlaceholderCard';
import { FollowButton } from './FollowButton';

/** The full "everything about one team" view — banner, record/matches/VOD
 * placeholders, sorted roster, coaching staff, socials. Shared by HomeScreen
 * (favorite team) and TeamScreen (any team, reached via region browsing) so
 * fixes and polish only need to happen in one place. */
export function TeamOverview({ team }: { team: Team }) {
  const { colors } = useTheme();
  const teamColor = safeColor(team.colors.primary, colors.accent);
  const players = team.roster.players.filter((p) => !isSubstitute(p.role)).sort(compareByLane);
  const substitutes = team.roster.players.filter((p) => isSubstitute(p.role));

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.banner, { backgroundColor: teamColor }]}>
        <TeamLogo url={team.logoUrl} name={team.name} ringColor={teamColor} />
        <AppText weight="bold" style={[styles.bannerRegion, { color: colors.accentText }]}>
          {team.region}
        </AppText>
        <AppText weight="heavy" style={[styles.bannerName, { color: colors.accentText }]}>
          {team.name}
        </AppText>
      </View>

      <Section title="Record">
        <PlaceholderCard label="Win/loss record" />
      </Section>

      <Section title="Recent & upcoming matches">
        <PlaceholderCard label="Match schedule and results" />
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
        <PlaceholderCard label="English VOD links, per match" />
      </Section>

      <Section title="Follow">
        <View style={styles.followRow}>
          {team.twitter ? (
            <FollowButton label="Twitter/X" url={team.twitter} accent={teamColor} />
          ) : null}
          {team.weibo ? (
            <FollowButton label="Weibo" url={team.weibo} accent={teamColor} />
          ) : null}
          {team.youtubeChannel ? (
            <FollowButton label="YouTube" url={team.youtubeChannel} accent={teamColor} />
          ) : null}
        </View>
      </Section>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const LOGO_CHIP_COLOR = '#0B0B0D';

function TeamLogo({
  url,
  name,
  ringColor,
}: {
  url: string;
  name: string;
  ringColor: string;
}) {
  const [failed, setFailed] = useState(false);
  const fallbackTint = readableTextOn(LOGO_CHIP_COLOR);
  return (
    <View style={[styles.logoChip, { borderColor: ringColor }]}>
      {!url || failed ? (
        <AppText weight="heavy" style={[styles.logoFallbackText, { color: fallbackTint }]}>
          {name.slice(0, 2).toUpperCase()}
        </AppText>
      ) : (
        <Image
          source={{ uri: url }}
          style={styles.logo}
          resizeMode="contain"
          onError={() => setFailed(true)}
        />
      )}
    </View>
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
  logoChip: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    // Fixed dark backdrop — deliberately not tied to team color or
    // light/dark mode. Team logos are Liquipedia's "darkmode" variants
    // (built to sit on a dark background), and several team colors are
    // close enough in hue/lightness to their own logo that the logo
    // nearly disappears when the banner itself is the backdrop. A
    // constant dark chip guarantees contrast regardless of team color.
    backgroundColor: LOGO_CHIP_COLOR,
  },
  logo: { width: 64, height: 64 },
  logoFallbackText: { fontSize: 22 },
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
