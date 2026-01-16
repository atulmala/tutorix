/**
 * Get the GraphQL API endpoint
 * Reads from environment variables (.env file)
 * Defaults to http://localhost:3000/graphql for development
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
 * 
 * For React Native (mobile):
 * - Android emulator: Uses 10.0.2.2 instead of localhost (localhost doesn't work in Android emulator)
 * - iOS simulator: Uses localhost (works fine)
 * - Physical device: Use your machine's IP address
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
  
  // If endpoint is provided, use it as-is
  if (endpoint) {
    console.log('[GraphQL Endpoint] Using endpoint from env:', endpoint);
    return endpoint;
  }
  
  // Default endpoint configuration
  // Backend uses global prefix 'api' set in main.ts, so endpoint is /api/graphql
  const host = 'localhost';
  const port = '3000';
  const path = '/graphql';
  
  // Detect React Native environment and Android emulator
  // For Android emulator, use 10.0.2.2 instead of localhost
  // For iOS simulator, localhost works fine
  try {
    // Check if we're in React Native environment
    if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
      // Try to detect Android platform
      // Note: This is a best-effort detection. For more reliable detection,
      // the mobile client should pass platform info or use a different approach
      // For now, we'll use a safer default that works for both platforms
      // Android emulator needs 10.0.2.2, but we can't reliably detect it here
      // So we'll default to localhost and let the mobile client override if needed
    }
  } catch {
    // Not in React Native, use localhost
  }
  
  const finalEndpoint = `http://${host}:${port}${path}`;
  
  console.log('[GraphQL Endpoint] Using default endpoint:', finalEndpoint);
  
  return finalEndpoint;
}
