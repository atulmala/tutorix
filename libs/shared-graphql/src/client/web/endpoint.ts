/**
 * Get the GraphQL API endpoint for web (Vite)
 * Reads from Vite environment variables (import.meta.env)
 * Falls back to process.env if available
 * Defaults to http://localhost:3000/graphql for development
 * 
 * Environment variable names (in order of priority):
 * - VITE_GRAPHQL_ENDPOINT (for Vite/web apps)
 * - VITE_NX_GRAPHQL_ENDPOINT (for Nx projects with Vite)
 * - NX_GRAPHQL_ENDPOINT (for Nx projects)
 * - GRAPHQL_ENDPOINT (fallback)
 * 
 * Note: This is web-specific and uses Vite's import.meta.env.
 * For mobile, use the mobile-specific endpoint.ts file.
 */
export function getGraphQLEndpoint(): string {
  let endpoint: string | undefined;
  
  // Check for Vite environment variable (browser/web)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    endpoint = 
      import.meta.env['VITE_GRAPHQL_ENDPOINT'] || 
      import.meta.env['VITE_NX_GRAPHQL_ENDPOINT'] ||
      import.meta.env['NX_GRAPHQL_ENDPOINT'] ||
      import.meta.env['GRAPHQL_ENDPOINT'];
  }
  
  // Fallback to process.env if import.meta is not available (Node.js/SSR)
  if (!endpoint && typeof process !== 'undefined' && process.env) {
    endpoint = 
      process.env['VITE_GRAPHQL_ENDPOINT'] ||
      process.env['NX_GRAPHQL_ENDPOINT'] || 
      process.env['GRAPHQL_ENDPOINT'];
  }
  
  // If endpoint is provided, use it as-is
  if (endpoint) {
    console.log('[GraphQL Endpoint - Web] Using endpoint:', endpoint);
    return endpoint;
  }
  
  // Default endpoint configuration
  // Backend uses global prefix 'api' set in main.ts, so full path is /api/graphql
  const host = 'localhost';
  const port = '3000';
  const path = '/api/graphql';
  
  const finalEndpoint = `http://${host}:${port}${path}`;
  
  console.log('[GraphQL Endpoint - Web] Using default endpoint:', finalEndpoint);
  
  return finalEndpoint;
}
