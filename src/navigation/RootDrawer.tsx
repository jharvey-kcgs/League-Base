import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useTheme } from '../theme/ThemeContext';
import { HomeScreen } from '../screens/HomeScreen';
import { createRegionStack } from './RegionStack';
import type { DrawerParamList } from './types';

const Drawer = createDrawerNavigator<DrawerParamList>();

const LCSStack = createRegionStack('LCS');
const LECStack = createRegionStack('LEC');
const LCKStack = createRegionStack('LCK');
const LPLStack = createRegionStack('LPL');

export function RootDrawer() {
  const { colors } = useTheme();

  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false, // each tab's own screen/stack draws its own header
        drawerType: 'front',
        drawerStyle: { backgroundColor: colors.surface },
        drawerActiveTintColor: colors.accent,
        drawerInactiveTintColor: colors.textMuted,
        drawerActiveBackgroundColor: colors.background,
      }}
    >
      <Drawer.Screen name="MyTeam" component={HomeScreen} options={{ title: 'My Team' }} />
      <Drawer.Screen name="LCS" component={LCSStack} />
      <Drawer.Screen name="LEC" component={LECStack} />
      <Drawer.Screen name="LCK" component={LCKStack} />
      <Drawer.Screen name="LPL" component={LPLStack} />
    </Drawer.Navigator>
  );
}
