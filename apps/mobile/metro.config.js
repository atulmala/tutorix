const { withNxMetro } = require('@nx/react-native');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const { config } = require('dotenv');
const { applyDevLanHost, applyGraphqlEndpointAlias } = require('./detect-lan-host.cjs');

// Load environment variables from .env file
// This makes them available to Metro bundler's process.env
try {
  config({ path: path.resolve(__dirname, '../../.env') });
} catch {
  // Silently fail if .env doesn't exist
}
const lanHost = applyDevLanHost();
applyGraphqlEndpointAlias();
if (lanHost) {
  console.log(`[metro] DEV_LAN_HOST=${lanHost}`);
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
    // CRITICAL: react-native@0.79 requires react@^19 (see its peerDependencies),
    // which is incompatible with the root workspace's react@18.2.0 (used by the
    // web app). apps/mobile therefore keeps its OWN copies of react/react-native
    // (and packages that must share their singletons, like @apollo/client and
    // react-native-razorpay) installed locally. Shared libs (libs/*) that get
    // bundled into the mobile app live outside apps/mobile's own node_modules
    // hierarchy, so without this mapping Metro would resolve these packages to
    // the root copies instead, creating two separate instances of React /
    // react-native (and, for react-native-razorpay, of its native event bridge)
    // inside the same bundle.
    extraNodeModules: {
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-native': path.resolve(__dirname, 'node_modules/react-native'),
      '@apollo/client': path.resolve(__dirname, 'node_modules/@apollo/client'),
      '@react-native-async-storage/async-storage': path.resolve(__dirname, 'node_modules/@react-native-async-storage/async-storage'),
      'react-native-razorpay': path.resolve(__dirname, 'node_modules/react-native-razorpay'),
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
