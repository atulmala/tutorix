import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GraphqlModule } from './graphql/graphql.module';
import { AppResolver } from './graphql/resolvers/app.resolver';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [DatabaseModule, GraphqlModule],
  controllers: [AppController],
  providers: [AppService, AppResolver],
})
export class AppModule {}
