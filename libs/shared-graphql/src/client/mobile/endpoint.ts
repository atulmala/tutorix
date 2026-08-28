/**
 * Get the GraphQL API endpoint for mobile (React Native)
 * Reads from process.env only (no Vite/import.meta dependencies)
 * Defaults to http://localhost:3000/graphql for development
 * 
 * Environment variable names (in order of priority):
 * - NX_GRAPHQL_ENDPOINT (for Nx projects)
 * - GRAPHQL_ENDPOINT (fallback)
 * - VITE_GRAPHQL_ENDPOINT (root .env; copied onto NX_GRAPHQL_ENDPOINT at Metro load)
 * 
 * For React Native (mobile):
 * - Android emulator: Uses 10.0.2.2 instead of localhost (handled in apollo-client.ts)
 * - iOS simulator: Uses localhost (works fine)
 * - Physical device: Use your machine's IP address
 */
export function getGraphQLEndpoint(): string {
  let endpoint: string | undefined;
  
  // Check for React Native environment variables (process.env only).
  // VITE_GRAPHQL_ENDPOINT is read from process.env after dotenv (not import.meta).
  if (typeof process !== 'undefined' && process.env) {
    endpoint =
      process.env['NX_GRAPHQL_ENDPOINT'] ||
      process.env['GRAPHQL_ENDPOINT'] ||
      process.env['VITE_GRAPHQL_ENDPOINT'];
  }

  // If endpoint is provided, use it as-is
  if (endpoint) {
    console.log('[GraphQL Endpoint - Mobile] Using endpoint from env:', endpoint);
    return endpoint;
  }
  
  // Local Nx API listens on :3000 (see apps/api main.ts). Docker/nginx on :80
  // should set VITE_GRAPHQL_ENDPOINT / NX_GRAPHQL_ENDPOINT explicitly.
  const host = 'localhost';
  const port = '3000';
  const path = '/api/graphql';

  const finalEndpoint = `http://${host}:${port}${path}`;
  
  console.log('[GraphQL Endpoint - Mobile] Using default endpoint:', finalEndpoint);
  
  return finalEndpoint;
}
