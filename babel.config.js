// babel.config.js
// TulipFleet - Babel Configuration with Environment Variables Support

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Environment variables support
      [
        "module:react-native-dotenv",
        {
          envName: "APP_ENV",
          moduleName: "@env",
          path: ".env",
          safe: false,
          allowUndefined: true,
          verbose: false,
        },
      ],
      // Reanimated plugin (if using animations)
      "react-native-reanimated/plugin",
    ],
  };
};
