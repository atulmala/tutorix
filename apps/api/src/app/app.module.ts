import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GraphqlModule } from './graphql/graphql.module';
import { AppResolver } from './graphql/resolvers/app.resolver';

@Module({
  imports: [GraphqlModule],
  controllers: [AppController],
  providers: [AppService, AppResolver],
})
export class AppModule {}
