import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { Request } from 'express';
import { AuthModule } from '../modules/auth/auth.module';
import { AuthService } from '../modules/auth/services/auth.service';
import { JwtService } from '../modules/auth/services/jwt.service';
import { User } from '../modules/auth/entities/user.entity';
import { AddressEntity } from '../modules/address/entities/address.entity';

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
      useFactory: (jwtService: JwtService, authService: AuthService) => ({
        autoSchemaFile: join(__dirname, '../../schema.gql'),
        sortSchema: true,
        orphanedTypes: [AddressEntity],
        playground: process.env.NODE_ENV !== 'production',
        introspection: true,
        context: async ({ req }: { req: RequestWithUser }) => {
          // Extract user from JWT token if present
          const authHeader = req?.headers?.authorization;
          if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
              const token = authHeader.substring(7);
              const payload = jwtService.verifyAccessToken(token);
              // Load full user from database
              const user = await authService.findById(payload.sub);
              req.user = user || null;
            } catch {
              // Invalid or expired token, continue without user
              req.user = null;
            }
          }
          return { req };
        },
      }),
      inject: [JwtService, AuthService],
    }),
  ],
})
export class GraphqlModule {}
