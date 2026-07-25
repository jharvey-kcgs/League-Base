import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { headerTitleStyle } from '../theme/fonts';
import { RegionHomeScreen } from '../screens/RegionHomeScreen';
import { TeamScreen } from '../screens/TeamScreen';
import type { Region } from '../types/team';
import type { RegionStackParamList } from './types';

const Stack = createNativeStackNavigator<RegionStackParamList>();

/** Returns a Stack navigator component for one region. Called once per
 * region in RootDrawer.tsx rather than taking the region as a route param —
 * keeps each Drawer entry a fully independent stack with its own history. */
export function createRegionStack(region: Region) {
  return function RegionStackNavigator() {
    const { colors } = useTheme();
    return (
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { ...headerTitleStyle, color: colors.accentReadable },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {/* RegionHomeScreen draws its own cog/title/hamburger header (via
         * the shared AppHeader component) instead of using this native
         * header — see AppHeader.tsx for why: native headerLeft/headerRight
         * get OS-drawn pill/circle chrome we can't reliably center custom
         * content inside. Team still uses the native header below, since a
         * plain back button + title has no such issue.
         *
         * title here isn't shown (headerShown: false) but is what Team's
         * back button falls back to — without it, the back button read the
         * raw route name "RegionHome" instead of "LCS"/"LEC"/"LCK"/"LPL". */}
        <Stack.Screen name="RegionHome" options={{ headerShown: false, title: region }}>
          {(props) => <RegionHomeScreen {...props} region={region} />}
        </Stack.Screen>
        <Stack.Screen name="Team" component={TeamScreen} options={{ title: '' }} />
      </Stack.Navigator>
    );
  };
}
