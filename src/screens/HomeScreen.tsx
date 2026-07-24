import React, { useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getTeam } from '../data/teamsStore';
import { useTheme } from '../theme/ThemeContext';
import { safeColor } from '../utils/colorContrast';
import { LaneIcon } from '../components/LaneIcon';
import { AppText } from '../components/AppText';
import { laneFromRole, isSubstitute } from '../types/team';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { favoriteTeamId, colors } = useTheme();
  const team = favoriteTeamId ? getTeam(favoriteTeamId) : undefined;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <HomeHeader
        colors={colors}
        onOpenSettings={() => navigation.navigate('Settings')}
        onOpenRegions={() => navigation.navigate('RegionPlaceholder')}
      />

      {!team ? (
        // Shouldn't happen once onboarding is wired up, but keep the screen safe.
        <View style={[styles.container, styles.center]}>
          <AppText style={{ color: colors.textMuted }}>No favorite team set yet.</AppText>
        </View>
      ) : (
        <TeamOverview team={team} colors={colors} />
      )}
    </SafeAreaView>
  );
}

function HomeHeader({
  colors,
  onOpenSettings,
  onOpenRegions,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  onOpenSettings: () => void;
  onOpenRegions: () => void;
}) {
  return (
    <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <Pressable onPress={onOpenSettings} hitSlop={12} style={styles.headerButton}>
        <Ionicons name="settings-outline" size={24} color={colors.text} />
      </Pressable>
      <AppText weight="heavy" style={[styles.headerTitle, { color: colors.accent }]}>
        LEAGUE BASE
      </AppText>
      <Pressable onPress={onOpenRegions} hitSlop={12} style={styles.headerButton}>
        <Ionicons name="menu" size={26} color={colors.text} />
      </Pressable>
    </View>
  );
}

function TeamOverview({
  team,
  colors,
}: {
  team: NonNullable<ReturnType<typeof getTeam>>;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const teamColor = safeColor(team.colors.primary, colors.accent);
  const players = team.roster.players.filter((p) => !isSubstitute(p.role));
  const substitutes = team.roster.players.filter((p) => isSubstitute(p.role));

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.banner, { backgroundColor: teamColor }]}>
        <TeamLogo url={team.logoUrl} name={team.name} tint={colors.accentText} />
        <AppText weight="bold" style={[styles.bannerRegion, { color: colors.accentText }]}>
          {team.region}
        </AppText>
        <AppText weight="heavy" style={[styles.bannerName, { color: colors.accentText }]}>
          {team.name}
        </AppText>
      </View>

      <Section title="Record" colors={colors}>
        <PlaceholderCard colors={colors} label="Win/loss record" />
      </Section>

      <Section title="Recent & upcoming matches" colors={colors}>
        <PlaceholderCard colors={colors} label="Match schedule and results" />
      </Section>

      <Section title="Roster" colors={colors}>
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

      <Section title="Coaching staff" colors={colors}>
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

      <Section title="VODs" colors={colors}>
        <PlaceholderCard colors={colors} label="English VOD links, per match" />
      </Section>

      <Section title="Follow" colors={colors}>
        <View style={styles.followRow}>
          {team.twitter ? (
            <FollowButton label="Twitter/X" url={team.twitter} colors={colors} accent={teamColor} />
          ) : null}
          {team.weibo ? (
            <FollowButton label="Weibo" url={team.weibo} colors={colors} accent={teamColor} />
          ) : null}
          {team.youtubeChannel ? (
            <FollowButton label="YouTube" url={team.youtubeChannel} colors={colors} accent={teamColor} />
          ) : null}
        </View>
      </Section>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function TeamLogo({ url, name, tint }: { url: string; name: string; tint: string }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return (
      <View style={styles.logoFallback}>
        <AppText weight="heavy" style={[styles.logoFallbackText, { color: tint }]}>
          {name.slice(0, 2).toUpperCase()}
        </AppText>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: url }}
      style={styles.logo}
      resizeMode="contain"
      onError={() => setFailed(true)}
    />
  );
}

function Section({
  title,
  colors,
  children,
}: {
  title: string;
  colors: ReturnType<typeof useTheme>['colors'];
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <AppText weight="bold" style={[styles.sectionTitle, { color: colors.accent }]}>
        {title.toUpperCase()}
      </AppText>
      <View style={[styles.sectionRule, { backgroundColor: colors.border }]} />
      {children}
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
        <AppText style={[styles.rosterRole, { color: colors.textMuted }]}>{lane ?? role}</AppText>
      </View>
    </View>
  );
}

function PlaceholderCard({
  colors,
  label,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  label: string;
}) {
  return (
    <View style={[styles.placeholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <AppText style={{ color: colors.textMuted, fontSize: 13 }}>
        {label} — coming once the live data layer is wired up.
      </AppText>
    </View>
  );
}

function FollowButton({
  label,
  url,
  colors,
  accent,
}: {
  label: string;
  url: string;
  colors: ReturnType<typeof useTheme>['colors'];
  accent: string;
}) {
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      style={({ pressed }) => [
        styles.followButton,
        { borderColor: accent, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <AppText weight="bold" style={[styles.followButtonText, { color: colors.text }]}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: { width: 32, alignItems: 'center' },
  headerTitle: { fontSize: 16, letterSpacing: 1.5 },
  banner: { paddingTop: 32, paddingBottom: 24, alignItems: 'center' },
  logo: { width: 72, height: 72 },
  logoFallback: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoFallbackText: { fontSize: 24 },
  bannerRegion: { fontSize: 12, letterSpacing: 1.5, marginTop: 10, opacity: 0.85 },
  bannerName: { fontSize: 24, marginTop: 2 },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 12, letterSpacing: 1 },
  sectionRule: { height: 1, marginTop: 6, marginBottom: 12 },
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
  placeholder: { borderWidth: 1, borderRadius: 10, padding: 14 },
  followRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  followButton: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  followButtonText: { fontSize: 13 },
});
