// Must be the first import in the entry file — react-native-gesture-handler
// (a Drawer dependency) sets up native event handling that other imports
// rely on being ready first.
import 'react-native-gesture-handler';

import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { useAppFonts, headerTitleStyle } from './src/theme/fonts';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { RootDrawer } from './src/navigation/RootDrawer';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { ProfileSettingsScreen } from './src/screens/ProfileSettingsScreen';
import { ThemeSettingsScreen } from './src/screens/ThemeSettingsScreen';
import { AboutScreen } from './src/screens/AboutScreen';
import { FAQScreen } from './src/screens/FAQScreen';
import { DataSettingsScreen } from './src/screens/DataSettingsScreen';
import type { RootStackParamList } from './src/navigation/types';

// Drawer route name -> human-readable label, for the back-button title on
// whatever gets pushed on top (Settings). Region tabs use their own name
// as-is (LCS/LEC/LCK/LPL/CBLOL/LCP); only MyTeam needs an actual translation.
const DRAWER_TAB_LABELS: Record<string, string> = {
  MyTeam: 'My Team',
  LCS: 'LCS',
  LEC: 'LEC',
  LCK: 'LCK',
  LPL: 'LPL',
  CBLOL: 'CBLOL',
  LCP: 'LCP',
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { favoriteTeamId, isLoading, colors } = useTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { ...headerTitleStyle, color: colors.accentReadable },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {!favoriteTeamId ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
        ) : (
          // title here isn't shown (headerShown: false), but it's what the
          // *next* screen's back button falls back to when nothing else is
          // set. Computed from whichever drawer tab is actually focused
          // (getFocusedRouteNameFromRoute is React Navigation's documented
          // pattern for this) — without it, Settings' back button always
          // read "My Team" even when opened from an LCS/LEC/LCK/LPL screen,
          // since MainDrawer itself doesn't know which of its tabs is active.
          <Stack.Screen
            name="MainDrawer"
            component={RootDrawer}
            options={({ route }) => ({
              headerShown: false,
              title: DRAWER_TAB_LABELS[getFocusedRouteNameFromRoute(route) ?? 'MyTeam'] ?? 'My Team',
            })}
          />
        )}
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
        <Stack.Screen
          name="SettingsProfile"
          component={ProfileSettingsScreen}
          options={{ title: 'Profile' }}
        />
        <Stack.Screen name="SettingsTheme" component={ThemeSettingsScreen} options={{ title: 'Theme' }} />
        <Stack.Screen name="SettingsAbout" component={AboutScreen} options={{ title: 'About' }} />
        <Stack.Screen name="SettingsFAQ" component={FAQScreen} options={{ title: 'FAQ' }} />
        <Stack.Screen name="SettingsData" component={DataSettingsScreen} options={{ title: 'Data' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useAppFonts();

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <RootNavigator />
        </ErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
