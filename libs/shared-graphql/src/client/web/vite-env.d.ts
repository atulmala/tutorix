/// <reference types="vite/client" />

/**
 * Vite environment variable types for web Apollo Client
 * This file is only used by web builds and should not be imported by mobile
 */

interface ImportMetaEnv {
  readonly VITE_GRAPHQL_ENDPOINT?: string;
  readonly VITE_NX_GRAPHQL_ENDPOINT?: string;
  readonly NX_GRAPHQL_ENDPOINT?: string;
  readonly GRAPHQL_ENDPOINT?: string;
  // MODE and NODE_ENV are already defined in vite/client types
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
