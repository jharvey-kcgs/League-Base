import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DrawerScreenProps } from '@react-navigation/drawer';

// Root Stack: Onboarding, the Drawer (everything else lives inside it), and
// Settings + its sub-pages (kept at this level, not inside the Drawer, so
// they're reachable the same way regardless of which drawer tab is active).
export type RootStackParamList = {
  Onboarding: undefined;
  MainDrawer: NavigatorScreenParams<DrawerParamList>;
  Settings: undefined;
  SettingsProfile: undefined;
  SettingsTheme: undefined;
  SettingsAbout: undefined;
  SettingsFAQ: undefined;
  Search: undefined;
  /** A team's page, reached from Search rather than by browsing a
   * region — same content as RegionStackParamList's own 'Team', reusing
   * the same TeamScreen component. Named differently so it's clear at a
   * glance which navigator a given navigate('...') call is actually
   * targeting; there's no actual collision either way; each param list
   * is independently scoped. */
  TeamDetail: { teamId: string };
};

// Drawer: "My Team" (favorite team's Home), "Worlds", plus one entry per
// region, each its own nested Stack (RegionStackParamList below).
export type DrawerParamList = {
  MyTeam: undefined;
  Worlds: undefined;
  LCS: NavigatorScreenParams<RegionStackParamList>;
  LEC: NavigatorScreenParams<RegionStackParamList>;
  LCK: NavigatorScreenParams<RegionStackParamList>;
  LPL: NavigatorScreenParams<RegionStackParamList>;
  CBLOL: NavigatorScreenParams<RegionStackParamList>;
  LCP: NavigatorScreenParams<RegionStackParamList>;
};

// Nested inside each region's Drawer entry: the region home page, then any
// team in that region pushed on top. One RegionStackParamList shape is
// reused for all four regions — which region it is comes from a prop
// passed to the navigator (see RegionStack.tsx), not from route params.
export type RegionStackParamList = {
  RegionHome: undefined;
  Team: { teamId: string };
};

/** HomeScreen and WorldsScreen are the only screens that need a composite
 * type — both call methods belonging to an outer navigator
 * (navigation.openDrawer() is the Drawer's, navigation.navigate('Settings')
 * is the root Stack's) from inside a screen that sits directly in the
 * Drawer, not nested inside a region's own RegionStack. RegionHomeScreen
 * and TeamScreen only ever navigate within their own RegionStack, so a
 * plain NativeStackScreenProps<RegionStackParamList, ...> is enough for
 * them. */
export type HomeScreenProps = CompositeScreenProps<
  DrawerScreenProps<DrawerParamList, 'MyTeam'>,
  NativeStackScreenProps<RootStackParamList>
>;

/** Same reasoning as HomeScreenProps above — WorldsScreen sits directly in
 * the Drawer (not nested inside a RegionStack), so it needs the same
 * composite type to reach both openDrawer() and the root Stack's
 * navigate('Settings')/navigate('Search')/navigate('TeamDetail', ...). */
export type WorldsScreenProps = CompositeScreenProps<
  DrawerScreenProps<DrawerParamList, 'Worlds'>,
  NativeStackScreenProps<RootStackParamList>
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
