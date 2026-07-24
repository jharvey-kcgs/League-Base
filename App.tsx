// Must be the first import in the entry file — react-native-gesture-handler
// (a Drawer dependency) sets up native event handling that other imports
// rely on being ready first.
import 'react-native-gesture-handler';

import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { useAppFonts } from './src/theme/fonts';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { RootDrawer } from './src/navigation/RootDrawer';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { ProfileSettingsScreen } from './src/screens/ProfileSettingsScreen';
import { ThemeSettingsScreen } from './src/screens/ThemeSettingsScreen';
import { AboutScreen } from './src/screens/AboutScreen';
import { FAQScreen } from './src/screens/FAQScreen';
import { DataSettingsScreen } from './src/screens/DataSettingsScreen';
import type { RootStackParamList } from './src/navigation/types';

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
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {!favoriteTeamId ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
        ) : (
          <Stack.Screen name="MainDrawer" component={RootDrawer} options={{ headerShown: false }} />
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
        <RootNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
