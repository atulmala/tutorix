import { InMemoryCache } from '@apollo/client';

/**
 * Create cache with recommended configuration
 * Mobile-specific Apollo Client cache configuration
 */
export function createCache() {
  return new InMemoryCache({
    typePolicies: {
      // Add type policies for better cache management
      Query: {
        fields: {
          // Add field policies here if needed
        },
      },
    },
  });
}
