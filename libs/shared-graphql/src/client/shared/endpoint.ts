/**
 * Get the GraphQL API endpoint
 * Reads from environment variables (.env file)
 * Defaults to http://localhost:3000/api for development
 * 
 * Environment variable names (in order of priority):
 * - VITE_GRAPHQL_ENDPOINT (for Vite/web apps)
 * - NX_GRAPHQL_ENDPOINT (for Nx projects)
 * - GRAPHQL_ENDPOINT (fallback)
 * 
 * This is a shared utility that works for both web and mobile.
 * It tries to read from process.env (works for mobile and Node.js)
 * Platform-specific clients can override this with import.meta.env for web
 * 
 * Note: For web apps, the web-specific client checks import.meta.env first,
 * which is populated by vite.config.mts from the .env file.
 */
export function getGraphQLEndpoint(): string {
  let endpoint: string | undefined;
  
  // Check for Node.js/React Native environment variable
  if (typeof process !== 'undefined' && process.env) {
    endpoint = 
      process.env['VITE_GRAPHQL_ENDPOINT'] ||
      process.env['NX_GRAPHQL_ENDPOINT'] || 
      process.env['GRAPHQL_ENDPOINT'];
  }
  
  // Default endpoint (matches backend: http://localhost:3000/api)
  // Backend uses global prefix 'api' set in main.ts
  const finalEndpoint = endpoint || 'http://localhost:3000/graphql';
  
  console.log('[GraphQL Endpoint] Using endpoint:', finalEndpoint);
  
  return finalEndpoint;
}
