/// <reference types='vitest' />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    root: import.meta.dirname,
    cacheDir: '../../node_modules/.vite/apps/web',
    server: {
      port: 4200,
      host: 'localhost',
    },
    preview: {
      port: 4200,
      host: 'localhost',
    },
    plugins: [react(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
    // Expose environment variables to the client
    // Note: Only VITE_ prefixed vars are exposed by default, but we can use define to expose others
    define: {
      // Expose GRAPHQL_ENDPOINT and NX_GRAPHQL_ENDPOINT from .env file
      'import.meta.env.GRAPHQL_ENDPOINT': JSON.stringify(
        env.GRAPHQL_ENDPOINT || env.VITE_GRAPHQL_ENDPOINT || ''
      ),
      'import.meta.env.NX_GRAPHQL_ENDPOINT': JSON.stringify(
        env.NX_GRAPHQL_ENDPOINT || env.VITE_NX_GRAPHQL_ENDPOINT || ''
      ),
    },
    // Uncomment this if you are using workers.
    // worker: {
    //   plugins: () => [ nxViteTsPaths() ],
    // },
    build: {
      outDir: '../../dist/apps/web',
      emptyOutDir: true,
      reportCompressedSize: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
    optimizeDeps: {
      exclude: [
        'react-native',
        '@react-native-firebase/analytics',
        '@react-native-firebase/app',
      ],
    },
    ssr: {
      noExternal: [],
      external: [
        'react-native',
        '@react-native-firebase/analytics',
        '@react-native-firebase/app',
      ],
    },
  };
});
