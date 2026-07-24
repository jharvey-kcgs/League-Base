export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Settings: undefined;
  SettingsProfile: undefined;
  SettingsTheme: undefined;
  SettingsAbout: undefined;
  SettingsFAQ: undefined;
  RegionPlaceholder: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
