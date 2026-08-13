import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useTheme } from '../theme/ThemeContext';
import { headerTitleStyle } from '../theme/fonts';
import { HomeScreen } from '../screens/HomeScreen';
import { createRegionStack } from './RegionStack';
import type { DrawerParamList } from './types';

const Drawer = createDrawerNavigator<DrawerParamList>();

const LCSStack = createRegionStack('LCS');
const LECStack = createRegionStack('LEC');
const LCKStack = createRegionStack('LCK');
const LPLStack = createRegionStack('LPL');
const CBLOLStack = createRegionStack('CBLOL');
const LCPStack = createRegionStack('LCP');

/** Reported bug (no video, described over a call): the native back button
 * on Settings/SettingsProfile/etc. would intermittently fail to respond
 * to a tap — the button visually pressed but nothing navigated — while
 * swiping to close the screen worked every time. This drawer stays
 * mounted underneath those screens (they're siblings in the root Stack,
 * not nested inside the drawer), and its own edge-swipe-to-open gesture
 * listens right where the back button sits. A stationary tap can lose
 * that gesture-arena contest to the still-active drawer listener
 * underneath, while a full swipe reliably resolves to the Stack's own
 * swipe-back handler instead — matching every part of what was
 * described. `swipeEnabled` lets App.tsx turn the drawer's gesture off
 * while a non-drawer screen is focused, removing the conflict at the
 * source rather than fighting over which gesture wins. */
export function RootDrawer({ swipeEnabled = true }: { swipeEnabled?: boolean }) {
  const { colors } = useTheme();

  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false, // each tab's own screen/stack draws its own header
        drawerType: 'front',
        swipeEnabled,
        drawerStyle: { backgroundColor: colors.surface },
        drawerActiveTintColor: colors.accentReadable,
        drawerInactiveTintColor: colors.textMuted,
        drawerActiveBackgroundColor: colors.background,
        // Drawer item labels are rendered by the library itself (not
        // through AppText), so the header font needs the same explicit
        // opt-in here as it does in every navigator's headerTitleStyle.
        drawerLabelStyle: headerTitleStyle,
      }}
    >
      <Drawer.Screen name="MyTeam" component={HomeScreen} options={{ title: 'My Team' }} />
      <Drawer.Screen name="LCS" component={LCSStack} />
      <Drawer.Screen name="LEC" component={LECStack} />
      <Drawer.Screen name="LCK" component={LCKStack} />
      <Drawer.Screen name="LPL" component={LPLStack} />
      <Drawer.Screen name="CBLOL" component={CBLOLStack} />
      <Drawer.Screen name="LCP" component={LCPStack} />
    </Drawer.Navigator>
  );
}
