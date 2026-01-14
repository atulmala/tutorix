import React from 'react';
import { ApolloProvider, ApolloClient, NormalizedCacheObject } from '@apollo/client';
import { apolloClient } from './apollo-client';

/**
 * ApolloProvider wrapper component for web
 * 
 * Usage in apps:
 * ```tsx
 * import { GraphQLProvider } from '@tutorix/shared-graphql';
 * 
 * function App() {
 *   return (
 *     <GraphQLProvider>
 *       <YourApp />
 *     </GraphQLProvider>
 *   );
 * }
 * ```
 * 
 * You can also pass a custom client:
 * ```tsx
 * <GraphQLProvider client={customClient}>
 *   <YourApp />
 * </GraphQLProvider>
 * ```
 */
export interface GraphQLProviderProps {
  children: React.ReactNode;
  client?: ApolloClient<NormalizedCacheObject>;
}

export function GraphQLProvider({ children, client = apolloClient }: GraphQLProviderProps) {
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
