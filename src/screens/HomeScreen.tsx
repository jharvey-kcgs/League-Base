import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getTeam } from '../data/teamsStore';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from '../components/AppText';
import { TeamOverview } from '../components/TeamOverview';
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
        <TeamOverview team={team} />
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
});
