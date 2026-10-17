const { withNxMetro } = require('@nx/react-native');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const { config } = require('dotenv');
const { applyDevLanHost, applyGraphqlEndpointAlias } = require('./detect-lan-host.cjs');
const { applyStoreEnv, isStoreBuild } = require('./load-store-env.cjs');

// Load environment variables from .env file
// This makes them available to Metro bundler's process.env
try {
  config({ path: path.resolve(__dirname, '../../.env') });
} catch {
  // Silently fail if .env doesn't exist
}
const storeBuild = applyStoreEnv();
const lanHost = storeBuild || isStoreBuild() ? null : applyDevLanHost();
applyGraphqlEndpointAlias();
if (storeBuild) {
  console.log(
    `[metro] TUTORIX_STORE_BUILD=1 NX_GRAPHQL_ENDPOINT=${process.env.NX_GRAPHQL_ENDPOINT || ''}`,
  );
} else if (lanHost) {
  console.log(`[metro] DEV_LAN_HOST=${lanHost}`);
}

const workspaceNodeModules = path.resolve(__dirname, '../../node_modules');
const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

/** Hoisted packages that must share apps/mobile's react-native (whiteboard / WebView). */
const workspaceNativeDeps = {
  'react-native-agora': path.join(workspaceNodeModules, 'react-native-agora'),
  'agora-react-native-rtm': path.join(workspaceNodeModules, 'agora-react-native-rtm'),
  'react-native-webview': path.join(workspaceNodeModules, 'react-native-webview'),
  '@netless/react-native-bridge': path.join(
    workspaceNodeModules,
    '@netless/react-native-bridge',
  ),
  '@netless/react-native-whiteboard': path.join(
    workspaceNodeModules,
    '@netless/react-native-whiteboard',
  ),
  '@netless/react-native-fastboard': path.join(
    workspaceNodeModules,
    '@netless/react-native-fastboard',
  ),
  '@netless/webview-bridge': path.join(workspaceNodeModules, '@netless/webview-bridge'),
  'react-native-uuid': path.join(workspaceNodeModules, 'react-native-uuid'),
};

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const customConfig = {
  cacheVersion: 'mobile-agora-commonjs-native-check-v2',
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    assetExts: assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...sourceExts, 'cjs', 'mjs', 'svg'],
    // CRITICAL: react-native@0.79 requires react@^19 (                                        see its peerDependencies),
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
      ...workspaceNativeDeps,
    },
    nodeModulesPaths: [
      workspaceNodeModules,
    ],
    blockList: [
      new RegExp(`${path.resolve(__dirname, '../../../node_modules').replace(/[/\\]/g, '[/\\\\]')}/.*`),
    ],
  },
};

module.exports = (async () => {
  const metroConfig = await withNxMetro(mergeConfig(defaultConfig, customConfig), {
    debug: false,
    extensions: [],
    watchFolders: [path.resolve(__dirname, '../..')],
  });

  // The workspace root and apps/mobile each have react and react-native.
  // A second copy leaves the view registry and hook dispatcher empty.
  const previousResolveRequest = metroConfig.resolver.resolveRequest;
  const mobilePackageRoot = path.join(__dirname, 'node_modules/react-native/package.json');
  const sharedGraphqlNativeEntry = path.resolve(
    __dirname,
    '../../libs/shared-graphql/src/index.native.ts',
  );
  metroConfig.resolver.resolveRequest = (context, moduleName, platform) => {
    // tsconfig paths map the package root to index.ts (web client + import.meta).
    if (moduleName === '@tutorix/shared-graphql') {
      return { type: 'sourceFile', filePath: sharedGraphqlNativeEntry };
    }
    if (moduleName === 'react' || moduleName.startsWith('react/')) {
      return {
        type: 'sourceFile',
        filePath: require.resolve(moduleName, { paths: [__dirname] }),
      };
    }
    // Use prebuilt entries (not package "react-native" TS sources) so Android
    // resolves WebView.android and WebView.styles interop correctly.
    if (moduleName === 'react-native-agora') {
      return {
        type: 'sourceFile',
        filePath: path.join(
          workspaceNativeDeps['react-native-agora'],
          'lib/commonjs/index.js',
        ),
      };
    }
    if (moduleName === 'agora-react-native-rtm') {
      return {
        type: 'sourceFile',
        filePath: path.join(
          workspaceNativeDeps['agora-react-native-rtm'],
          'lib/commonjs/index.js',
        ),
      };
    }
    if (moduleName === 'react-native-webview') {
      return {
        type: 'sourceFile',
        filePath: path.join(workspaceNativeDeps['react-native-webview'], 'index.js'),
      };
    }
    if (moduleName === '@netless/react-native-whiteboard') {
      return {
        type: 'sourceFile',
        filePath: path.join(
          workspaceNativeDeps['@netless/react-native-whiteboard'],
          'lib/commonjs/index.js',
        ),
      };
    }
    if (moduleName === '@netless/react-native-fastboard') {
      return {
        type: 'sourceFile',
        filePath: path.join(
          workspaceNativeDeps['@netless/react-native-fastboard'],
          'lib/commonjs/index.js',
        ),
      };
    }
    if (moduleName === '@netless/react-native-bridge') {
      return {
        type: 'sourceFile',
        filePath: path.join(workspaceNativeDeps['@netless/react-native-bridge'], 'dist/index.js'),
      };
    }
    if (moduleName === '@netless/webview-bridge') {
      return {
        type: 'sourceFile',
        filePath: path.join(workspaceNativeDeps['@netless/webview-bridge'], 'dist/index.js'),
      };
    }
    const redirected =
      moduleName === 'react-native' || moduleName.startsWith('react-native/')
        ? { ...context, originModulePath: mobilePackageRoot }
        : context;
    if (typeof previousResolveRequest === 'function') {
      return previousResolveRequest(redirected, moduleName, platform);
    }
    return context.resolveRequest(redirected, moduleName, platform);
  };

  return metroConfig;
})();
