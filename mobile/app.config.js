// Expo removes android.config / ios.config from the config the app can read at runtime, so the
// Google Maps key used by the native map would be invisible to the JavaScript that calls the
// Places and Directions APIs. Copy that same key into `extra` at build time (no new key here).
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    mapsApiKey: config.android?.config?.googleMaps?.apiKey || config.ios?.config?.googleMapsApiKey || null,
  },
});
