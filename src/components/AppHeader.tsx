import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';

interface Props {
  title: string;
  onOpenSettings: () => void;
  onOpenSearch: () => void;
  onOpenRegions: () => void;
}

/** Cog (opens Settings) / title / search + hamburger (opens Search, opens
 * the region Drawer) — used by both HomeScreen and RegionHomeScreen so
 * every top-level screen's header is pixel-identical, rather than each
 * building its own and drifting out of sync. Deliberately NOT React
 * Navigation's native headerLeft/headerRight — those get wrapped in
 * OS-drawn chrome (a pill or circle background on current iOS) that isn't
 * reliably centered around custom content. Building the whole header
 * ourselves means we control every pixel instead of depending on
 * undocumented native behavior. */
export function AppHeader({ title, onOpenSettings, onOpenSearch, onOpenRegions }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <Pressable onPress={onOpenSettings} hitSlop={12} style={styles.headerButton}>
        <Ionicons name="settings-outline" size={24} color={colors.text} />
      </Pressable>
      <View style={styles.titleWrap} pointerEvents="none">
        <AppText weight="heavy" style={[styles.headerTitle, { color: colors.accentReadable }]} numberOfLines={1}>
          {title.toUpperCase()}
        </AppText>
      </View>
      <View style={styles.rightButtons}>
        <Pressable onPress={onOpenSearch} hitSlop={12} style={styles.headerButton}>
          <Ionicons name="search" size={22} color={colors.text} />
        </Pressable>
        <Pressable onPress={onOpenRegions} hitSlop={12} style={styles.headerButton}>
          <Ionicons name="menu" size={26} color={colors.text} />
        </Pressable>
      </View>
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
    position: 'relative',
  },
  headerButton: { width: 32, alignItems: 'center' },
  rightButtons: { flexDirection: 'row', gap: 8 },
  titleWrap: {
    // Insets clear the wider side (search + hamburger, ~72px) on both
    // sides equally — that symmetry is what actually centers this
    // relative to the whole header, regardless of the cog being alone
    // on the left. The two icon Pressables are separate siblings
    // rendered after this in the tree, so they stack visually on top of
    // this absolutely-positioned wrapper with no z-index needed; the
    // matching pointerEvents="none" means a tap in the overlap area
    // (unlikely given the insets, but not impossible with a very long
    // future title) always reaches the icon underneath, never this
    // label. alignItems/justifyContent (not textAlignVertical, which is
    // Android-only) is what actually centers the text vertically here —
    // reliable identically on both platforms.
    position: 'absolute',
    left: 80,
    right: 80,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, letterSpacing: 1.5 },
});
