import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import { join } from 'path';
import { Request } from 'express';
import { AuthModule } from '../modules/auth/auth.module';
import { AuthService } from '../modules/auth/services/auth.service';
import { JwtService } from '../modules/auth/services/jwt.service';
import { SessionService } from '../modules/auth/services/session.service';
import { User } from '../modules/auth/entities/user.entity';
import { AddressEntity } from '../modules/address/entities/address.entity';

/**
 * Logs every GraphQL query and mutation to the console.
 */
const graphqlLoggingPlugin: ApolloServerPlugin = {
  async requestDidStart(): Promise<GraphQLRequestListener<Record<string, unknown>>> {
    return {
      async didResolveOperation({ operationName, operation }) {
        const opType = operation?.operation ?? 'unknown';
        const name = operationName ?? 'anonymous';
        console.log(`[GraphQL] ${opType.toUpperCase()}: ${name}`);
      },
    };
  },
};

// Extend Express Request to include our User type
// Using Omit to avoid conflict with Express's built-in user property
interface RequestWithUser extends Omit<Request, 'user'> {
  user?: User | null;
}

@Module({
  imports: [
    AuthModule, // Import AuthModule to get access to JwtService and AuthService
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      imports: [AuthModule], // Import AuthModule to make its exports available
      driver: ApolloDriver,
      useFactory: (
        jwtService: JwtService,
        authService: AuthService,
        sessionService: SessionService,
      ) => ({
        autoSchemaFile: join(__dirname, '../../schema.gql'),
        sortSchema: true,
        orphanedTypes: [AddressEntity],
        playground: process.env.NODE_ENV !== 'production',
        introspection: true,
        plugins: [graphqlLoggingPlugin],
        context: async ({ req }: { req: RequestWithUser }) => {
          const authHeader = req?.headers?.authorization;
          if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
              const token = authHeader.substring(7);
              const payload = jwtService.verifyAccessToken(token);
              const user = await authService.findById(payload.sub);
              req.user = user || null;
              if (payload.sid && req.user) {
                sessionService
                  .updateLastActivity(payload.sid)
                  .catch((err) =>
                    console.error('[Session] updateLastActivity failed:', err),
                  );
              }
            } catch {
              req.user = null;
            }
          }
          return { req };
        },
      }),
      inject: [JwtService, AuthService, SessionService],
    }),
  ],
})
export class GraphqlModule {}
