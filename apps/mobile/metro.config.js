const { withNxMetro } = require('@nx/react-native');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

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
    // Ensure a single React and Apollo Client instance is resolved to avoid "Invalid hook call" errors
    // This is critical for Apollo Client which uses React hooks internally
    // Force resolution from root node_modules to ensure single instance
    extraNodeModules: {
      'react': path.resolve(__dirname, '../../node_modules/react'),
      'react-native': path.resolve(__dirname, '../../node_modules/react-native'),
      '@apollo/client': path.resolve(__dirname, '../../node_modules/@apollo/client'),
    },
    nodeModulesPaths: [
      path.resolve(__dirname, '../../node_modules'),
      // Don't include local node_modules to force using root
      // path.resolve(__dirname, './node_modules'),
    ],
  },
};

module.exports = withNxMetro(mergeConfig(defaultConfig, customConfig), {
  // Change this to true to see debugging info.
  // Useful if you have issues resolving modules
  debug: false,
  // all the file extensions used for imports other than 'ts', 'tsx', 'js', 'jsx', 'json'
  extensions: [],
  // Specify folders to watch, in addition to Nx defaults (workspace libraries and node_modules)
  watchFolders: [],
});
