import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { safeColor } from '../utils/colorContrast';
import { AppText } from './AppText';
import type { Team } from '../types/team';

interface Props {
  team: Team;
  onPress: () => void;
  /** Spinner instead of the logo — used while a pick is being saved. */
  isLoading?: boolean;
  /** Thicker border — used to mark the current favorite team. */
  isHighlighted?: boolean;
  disabled?: boolean;
}

export function TeamTile({ team, onPress, isLoading = false, isHighlighted = false, disabled = false }: Props) {
  const { colors } = useTheme();
  const [imageFailed, setImageFailed] = useState(false);
  const teamColor = safeColor(team.colors.primary, colors.accent);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: colors.surface,
          borderColor: teamColor,
          borderWidth: isHighlighted ? 3 : 2,
          opacity: disabled && !isLoading ? 0.4 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={styles.logoWrap}>
        {isLoading ? (
          <ActivityIndicator color={teamColor} />
        ) : imageFailed || !team.logoUrl ? (
          <AppText weight="heavy" style={[styles.logoFallback, { color: teamColor }]}>
            {team.name.slice(0, 2).toUpperCase()}
          </AppText>
        ) : (
          <Image
            source={{ uri: team.logoUrl }}
            style={styles.logo}
            resizeMode="contain"
            onError={() => setImageFailed(true)}
          />
        )}
      </View>
      <AppText weight="medium" style={[styles.tileName, { color: colors.text }]} numberOfLines={1}>
        {team.name}
      </AppText>
    </Pressable>
  );
}

const TILE_SIZE = 100;

const styles = StyleSheet.create({
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  logoWrap: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 48, height: 48 },
  logoFallback: { fontSize: 18 },
  tileName: { fontSize: 11, marginTop: 8, textAlign: 'center' },
});
