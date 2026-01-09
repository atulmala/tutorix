/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  
  // Enable CORS for frontend applications
  app.enableCors({
    origin: [
      'http://localhost:4200', // Web app
      'http://localhost:4201', // Web admin
      process.env.FRONTEND_URL || 'http://localhost:4200',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  // Ensure JSON body parser is set up for Apollo Server
  app.use(json({ limit: '10mb' }));
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
  Logger.log(
    `📊 GraphQL Playground is available at: http://localhost:${port}/graphql`,
  );
}

bootstrap();
