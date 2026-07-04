const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Enable persistent disk cache — dramatically speeds up subsequent starts
// Metro will reuse previously compiled modules instead of recompiling from scratch
config.cacheStores = [
  new (require('metro-cache').FileStore)({
    root: path.join(__dirname, '.metro-cache'),
  }),
];

// Only watch necessary folders, ignore node_modules subfolders that never change
config.watchFolders = [__dirname];

// Block unnecessary file types from being watched/bundled
config.resolver.blockList = [
  /.*\/__tests__\/.*/,
  /.*\/android\/build\/.*/,
  /.*\/ios\/build\/.*/,
  /.*\/\.git\/.*/,
];

// Tell Metro to skip source maps in dev mode for faster bundling
config.transformer.minifierConfig = {
  keep_classnames: true,
  keep_fnames: true,
  mangle: { keep_classnames: true, keep_fnames: true },
};

module.exports = config;
