/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname, '../../../.env') });

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './app/app.module';

function buildCorsOrigins(): string[] {
  const defaults = [
    'http://localhost:4200',
    'http://localhost:4201',
    'http://10.0.2.2:3000',
  ];
  const fromEnvList = process.env.CORS_ORIGINS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const fromFrontend = process.env.FRONTEND_URL?.trim();
  const combined = [
    ...defaults,
    ...(fromEnvList ?? []),
    ...(fromFrontend ? [fromFrontend] : []),
  ];
  return [...new Set(combined)];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Ensure logger is enabled so GraphQL and other logs are visible
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn', 'log']
        : ['log', 'error', 'warn', 'debug', 'verbose'],
  });
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  
  app.enableCors({
    origin: buildCorsOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  // Ensure JSON body parser is set up for Apollo Server
  app.use(json({ limit: '10mb' }));
  
  const port = parseInt(process.env.PORT ?? '3000', 10);
  /** Bind all interfaces so nginx/other containers can reach the API on Docker networks. */
  const listenHost = process.env.LISTEN_HOST ?? '0.0.0.0';
  await app.listen(port, listenHost);
  Logger.log('Environment: ' + process.env.NODE_ENV);
  Logger.log(
    `🚀 Application is listening on http://${listenHost}:${port}/${globalPrefix}`,
  );
  Logger.log(
    `📊 GraphQL is mounted at: http://localhost:${port}/${globalPrefix}/graphql`,
  );
}

bootstrap();
