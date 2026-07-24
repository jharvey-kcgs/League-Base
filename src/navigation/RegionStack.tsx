import React from 'react';
import { Pressable } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
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
          headerTitleStyle: { ...headerTitleStyle, color: colors.text },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="RegionHome" options={({ navigation }) => ({
          title: region,
          // RegionHome is the root of this nested stack, so there's no
          // "back" target — without this, tapping into a region leaves no
          // way back to the drawer at all. DrawerActions.openDrawer()
          // bubbles up to the nearest Drawer navigator automatically, so
          // this works without needing a composite navigation prop type.
          headerLeft: () => (
            <Pressable
              onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
              hitSlop={12}
            >
              <Ionicons name="menu" size={24} color={colors.text} />
            </Pressable>
          ),
        })}>
          {(props) => <RegionHomeScreen {...props} region={region} />}
        </Stack.Screen>
        <Stack.Screen name="Team" component={TeamScreen} options={{ title: '' }} />
      </Stack.Navigator>
    );
  };
}
