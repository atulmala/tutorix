/// <reference types='vitest' />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

function readEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) {
    return {};
  }
  const parsed: Record<string, string> = {};
  for (const raw of readFileSync(filePath, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const eq = line.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

export default defineConfig(({ mode }) => {
  const workspaceRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../..',
  );
  // File values win over a stale process.env left over from an earlier serve.
  const env = {
    ...loadEnv(mode, process.cwd(), ''),
    ...loadEnv(mode, workspaceRoot, ''),
    ...readEnvFile(path.join(workspaceRoot, '.env')),
  };

  return {
    root: import.meta.dirname,
    cacheDir: '../../node_modules/.vite/apps/web-admin',
    resolve: {
      alias: {
        '@tutorix/shared-utils': path.resolve(
          workspaceRoot,
          'libs/shared-utils/src/index.ts',
        ),
        '@tutorix/shared-graphql/queries': path.resolve(
          workspaceRoot,
          'libs/shared-graphql/src/queries/index.ts',
        ),
        '@tutorix/shared-graphql/mutations': path.resolve(
          workspaceRoot,
          'libs/shared-graphql/src/mutations/index.ts',
        ),
        '@tutorix/shared-graphql/fragments': path.resolve(
          workspaceRoot,
          'libs/shared-graphql/src/fragments/index.ts',
        ),
      },
    },
    server: {
      port: 4201,
      host: 'localhost',
    },
    preview: {
      port: 4201,
      host: 'localhost',
    },
    plugins: [react(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
    define: {
      'import.meta.env.VITE_GRAPHQL_ENDPOINT': JSON.stringify(
        env.VITE_GRAPHQL_ENDPOINT || env.GRAPHQL_ENDPOINT || '',
      ),
      'import.meta.env.VITE_NX_GRAPHQL_ENDPOINT': JSON.stringify(
        env.VITE_NX_GRAPHQL_ENDPOINT || env.NX_GRAPHQL_ENDPOINT || '',
      ),
      'import.meta.env.GRAPHQL_ENDPOINT': JSON.stringify(
        env.GRAPHQL_ENDPOINT || env.VITE_GRAPHQL_ENDPOINT || '',
      ),
      'import.meta.env.NX_GRAPHQL_ENDPOINT': JSON.stringify(
        env.NX_GRAPHQL_ENDPOINT || env.VITE_NX_GRAPHQL_ENDPOINT || '',
      ),
      'import.meta.env.NODE_ENV': JSON.stringify(
        env.NODE_ENV || env.VITE_NODE_ENV || mode || 'development',
      ),
      'import.meta.env.MODE': JSON.stringify(mode || 'development'),
    },
    build: {
      outDir: '../../dist/apps/web-admin',
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
