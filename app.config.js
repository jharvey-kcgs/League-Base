// Replaces the old static app.json. Two real, separate App Store Connect
// apps share this one codebase — UAT (TestFlight, all regular builds) and
// Store (App Store submission only) — distinguished purely by the
// APP_VARIANT env var eas.json's "store" build profile sets.
//
// Default (no env var — this is what a plain `eas build`, with no
// --profile flag, has always done and continues to do): UAT.
//   name: "League Base (UAT)"
//   bundleIdentifier / package: com.JHarvey.LeagueBase (unchanged — this
//     already has a real successful build and App Store Connect app
//     record behind it; nothing about it changes here)
//
// APP_VARIANT=production (only ever set by `eas build --profile store`):
// Store.
//   name: "League Base"
//   bundleIdentifier / package: com.JHarvey.LeagueBaseStore (new —
//     registered fresh, only ever used for real App Store submissions)
//
// This is Expo's own recommended pattern for multiple app variants from
// one codebase — one EAS project (one projectId below) can produce builds
// for either bundle identifier; it's not tied permanently to one.

const IS_STORE = process.env.APP_VARIANT === 'production';

module.exports = {
  expo: {
    name: IS_STORE ? 'League Base' : 'League Base (UAT)',
    slug: 'league-base',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    assetBundlePatterns: ['**/*'],
    icon: './assets/icon.png',
    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_STORE ? 'com.JHarvey.LeagueBaseStore' : 'com.JHarvey.LeagueBase',
    },
    android: {
      package: IS_STORE ? 'com.JHarvey.LeagueBaseStore' : 'com.JHarvey.LeagueBase',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0F1B2C',
      },
    },
    web: {
      bundler: 'metro',
    },
    plugins: [
      [
        'expo-splash-screen',
        {
          image: './assets/icon.png',
          resizeMode: 'contain',
          backgroundColor: '#0B0B0D',
        },
      ],
    ],
    extra: {
      eas: {
        projectId: '474e5dd1-7975-4e2e-86ef-c6547bdd07c8',
      },
    },
  },
};
