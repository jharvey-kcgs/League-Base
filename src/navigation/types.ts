export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Settings: undefined;
  SettingsProfile: undefined;
  SettingsTheme: undefined;
  SettingsAbout: undefined;
  SettingsFAQ: undefined;
  SettingsData: undefined;
  RegionPlaceholder: undefined;
  /** Any team's overview — reached by tapping a team in a region's list.
   * Not registered in App.tsx's Stack yet; lands there once RegionStack
   * exists (step 3). Typed now so TeamScreen can be built and used ahead
   * of that wiring. */
  Team: { teamId: string };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
