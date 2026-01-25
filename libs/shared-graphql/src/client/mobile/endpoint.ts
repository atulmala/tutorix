/**
 * Get the GraphQL API endpoint for mobile (React Native)
 * Reads from process.env only (no Vite/import.meta dependencies)
 * Defaults to http://localhost:3000/graphql for development
 * 
 * Environment variable names (in order of priority):
 * - NX_GRAPHQL_ENDPOINT (for Nx projects)
 * - GRAPHQL_ENDPOINT (fallback)
 * 
 * For React Native (mobile):
 * - Android emulator: Uses 10.0.2.2 instead of localhost (handled in apollo-client.ts)
 * - iOS simulator: Uses localhost (works fine)
 * - Physical device: Use your machine's IP address
 */
export function getGraphQLEndpoint(): string {
  let endpoint: string | undefined;
  
  // Check for React Native environment variables (process.env only)
  // NO Vite checks - Metro bundler should not pull in Vite-specific code
  if (typeof process !== 'undefined' && process.env) {
    endpoint = 
      process.env['NX_GRAPHQL_ENDPOINT'] || 
      process.env['GRAPHQL_ENDPOINT'];
  }
  
  // If endpoint is provided, use it as-is
  if (endpoint) {
    console.log('[GraphQL Endpoint - Mobile] Using endpoint from env:', endpoint);
    return endpoint;
  }
  
  // Default endpoint configuration
  // Backend uses global prefix 'api' set in main.ts, so endpoint is /api/graphql
  const host = 'localhost';
  const port = '3000';
  const path = '/graphql';
  
  const finalEndpoint = `http://${host}:${port}${path}`;
  
  console.log('[GraphQL Endpoint - Mobile] Using default endpoint:', finalEndpoint);
  
  return finalEndpoint;
}
