const { withNxMetro } = require('@nx/react-native');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const { config } = require('dotenv');

// Load environment variables from .env file
// This makes them available to Metro bundler's process.env
try {
  config({ path: path.resolve(__dirname, '../../.env') });
} catch {
  // Silently fail if .env doesn't exist
}

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const customConfig = {
  cacheVersion: 'mobile',
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    assetExts: assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...sourceExts, 'cjs', 'mjs', 'svg'],
    // CRITICAL: Force resolution to root node_modules to ensure single React instance
    extraNodeModules: {
      'react': path.resolve(__dirname, '../../node_modules/react'),
      'react-native': path.resolve(__dirname, '../../node_modules/react-native'),
      '@apollo/client': path.resolve(__dirname, '../../node_modules/@apollo/client'),
      '@react-native-async-storage/async-storage': path.resolve(__dirname, '../../node_modules/@react-native-async-storage/async-storage'),
    },
    nodeModulesPaths: [
      path.resolve(__dirname, '../../node_modules'),
    ],
    blockList: [
      new RegExp(`${path.resolve(__dirname, '../../../node_modules').replace(/[/\\]/g, '[/\\\\]')}/.*`),
    ],
  },
};

module.exports = withNxMetro(mergeConfig(defaultConfig, customConfig), {
  debug: false,
  extensions: [],
  watchFolders: [path.resolve(__dirname, '../..')],
});
