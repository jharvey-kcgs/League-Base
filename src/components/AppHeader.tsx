import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';

interface Props {
  title: string;
  onOpenSettings: () => void;
  onOpenRegions: () => void;
}

/** Cog (opens Settings) / title / hamburger (opens the region Drawer) —
 * used by both HomeScreen and RegionHomeScreen so every top-level screen's
 * header is pixel-identical, rather than each building its own and
 * drifting out of sync. Deliberately NOT React Navigation's native
 * headerLeft/headerRight — those get wrapped in OS-drawn chrome (a pill or
 * circle background on current iOS) that isn't reliably centered around
 * custom content. Building the whole header ourselves means we control
 * every pixel instead of depending on undocumented native behavior. */
export function AppHeader({ title, onOpenSettings, onOpenRegions }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <Pressable onPress={onOpenSettings} hitSlop={12} style={styles.headerButton}>
        <Ionicons name="settings-outline" size={24} color={colors.text} />
      </Pressable>
      <AppText weight="heavy" style={[styles.headerTitle, { color: colors.accentReadable }]}>
        {title.toUpperCase()}
      </AppText>
      <Pressable onPress={onOpenRegions} hitSlop={12} style={styles.headerButton}>
        <Ionicons name="menu" size={26} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
  headerTitle: { fontSize: 20, letterSpacing: 1.5 },
});
