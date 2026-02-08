import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GraphqlModule } from './graphql/graphql.module';
import { AppResolver } from './graphql/resolvers/app.resolver';
import { DatabaseModule } from './database/database.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { TutorModule } from './modules/tutor/tutor.module';
import { AddressModule } from './modules/address/address.module';
import { DocumentModule } from './modules/document/document.module';

@Module({
  imports: [
    DatabaseModule,
    AnalyticsModule, // Analytics module (global) - should be imported early
    AuthModule, // AuthModule must be imported before GraphqlModule
    GraphqlModule,
    TutorModule,
    AddressModule,
    DocumentModule,
    // Add other modules here as they are created:
    // StudentModule,
    // ClassesModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppResolver],
})
export class AppModule {}
