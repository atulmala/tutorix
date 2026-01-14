/// <reference types="vite/client" />

/**
 * Extend Vite's ImportMetaEnv with our custom environment variables
 * MODE and NODE_ENV are already defined by Vite, so we only add our custom vars
 */
interface ImportMetaEnv {
  readonly VITE_GRAPHQL_ENDPOINT?: string;
  readonly VITE_NX_GRAPHQL_ENDPOINT?: string;
  readonly NX_GRAPHQL_ENDPOINT?: string;
  readonly GRAPHQL_ENDPOINT?: string;
}
