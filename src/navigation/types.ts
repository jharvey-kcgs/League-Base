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
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
