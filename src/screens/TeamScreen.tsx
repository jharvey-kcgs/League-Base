import React, { useLayoutEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getTeam } from '../data/teamsStore';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from '../components/AppText';
import { TeamOverview } from '../components/TeamOverview';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Team'>;

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
