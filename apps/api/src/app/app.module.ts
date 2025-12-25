import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GraphqlModule } from './graphql/graphql.module';
import { AppResolver } from './graphql/resolvers/app.resolver';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { TutorModule } from './modules/tutor/tutor.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule, // AuthModule must be imported before GraphqlModule
    GraphqlModule,
    TutorModule,
    // Add other modules here as they are created:
    // StudentModule,
    // ClassesModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppResolver],
})
export class AppModule {}
