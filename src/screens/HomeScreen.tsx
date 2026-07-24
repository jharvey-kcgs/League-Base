import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getTeam } from '../data/teamsStore';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from '../components/AppText';
import { AppHeader } from '../components/AppHeader';
import { TeamOverview } from '../components/TeamOverview';
import type { HomeScreenProps } from '../navigation/types';

export function HomeScreen({ navigation }: HomeScreenProps) {
  const { favoriteTeamId, colors } = useTheme();
  const team = favoriteTeamId ? getTeam(favoriteTeamId) : undefined;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeader
        title="League Base"
        onOpenSettings={() => navigation.navigate('Settings')}
        onOpenRegions={() => navigation.openDrawer()}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
