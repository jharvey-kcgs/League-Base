import React from 'react';
import { Linking, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';

interface Props {
  label: string;
  url: string;
  /** Border color — usually the team's or app's current accent. */
  accent: string;
}

export function FollowButton({ label, url, accent }: Props) {
  const { colors } = useTheme();
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
  followButton: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  followButtonText: { fontSize: 13 },
});
