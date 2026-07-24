module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 (required for the New Architecture — see app.json's
    // newArchEnabled) moved its Babel plugin to the separate
    // react-native-worklets package. Must be listed last.
    plugins: ['react-native-worklets/plugin'],
  };
};
