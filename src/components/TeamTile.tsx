import React from 'react';
import { ActivityIndicator, Pressable, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ensureUIContrastOn } from '../utils/colorContrast';
import { resolveTeamColor } from '../types/team';
import { AppText } from './AppText';
import { LogoChip } from './LogoChip';
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
  const rawColor = resolveTeamColor(team, colors.accent);
  // The tile's own border sits directly on colors.surface — several teams
  // are white- or black-branded and need this checked against whichever
  // mode is currently active, not just handed the raw color. LogoChip gets
  // rawColor as-is and does its own equivalent check against its different
  // (fixed) backdrop internally.
  const borderColor = ensureUIContrastOn(rawColor, colors.surface);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: colors.surface,
          borderColor,
          borderWidth: isHighlighted ? 3 : 2,
          opacity: disabled && !isLoading ? 0.4 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={styles.logoWrap}>
        {isLoading ? (
          <ActivityIndicator color={borderColor} />
        ) : (
          <LogoChip url={team.logoUrl} name={team.name} ringColor={rawColor} size={52} />
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
  logoWrap: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  tileName: { fontSize: 11, marginTop: 8, textAlign: 'center' },
});
