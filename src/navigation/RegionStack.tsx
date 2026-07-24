import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
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
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="RegionHome" options={{ title: region }}>
          {(props) => <RegionHomeScreen {...props} region={region} />}
        </Stack.Screen>
        <Stack.Screen name="Team" component={TeamScreen} options={{ title: '' }} />
      </Stack.Navigator>
    );
  };
}
