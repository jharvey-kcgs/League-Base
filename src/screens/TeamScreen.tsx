import React, { useLayoutEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { getTeam } from '../data/teamsStore';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from '../components/AppText';
import { TeamOverview } from '../components/TeamOverview';

// Deliberately NOT NativeStackScreenProps<RegionStackParamList, 'Team'> —
// this same component is now also mounted at the root level as
// 'TeamDetail' (reached from Search), a completely different navigator.
// Both provide exactly this shape (a teamId param, a setOptions method),
// which is all this screen actually needs, so typing against that
// directly avoids a navigator-specific type that would only be correct
// in one of its two real mount points.
type Props = {
  route: { params: { teamId: string } };
  navigation: { setOptions: (options: { title: string }) => void };
};

export function TeamScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const team = getTeam(route.params.teamId);

  // Dynamic per-team title in the native header (back button + team name),
  // rather than a static "Team" — set once the lookup resolves.
  useLayoutEffect(() => {
    navigation.setOptions({ title: team?.name ?? 'Team' });
  }, [navigation, team?.name]);

  if (!team) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <AppText style={{ color: colors.textMuted }}>Team not found.</AppText>
      </View>
    );
  }

  return <TeamOverview team={team} />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
