import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { InjectDataSource, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { createDatabaseOptions } from './database.config';
import { loadDatabaseCredentials } from './database-credentials.loader';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        // Load credentials from .env (dev/staging) or AWS Secrets Manager (production)
        const credentials = await loadDatabaseCredentials();
        const options = createDatabaseOptions(credentials);

        return {
          ...options,
          // Run migrations automatically on application start (optional)
          migrationsRun: process.env.AUTO_RUN_MIGRATIONS === 'true',
        };
      },
    }),
  ],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async onModuleInit() {
    try {
      if (this.dataSource.isInitialized) {
        // Access connection properties safely
        const options = this.dataSource.options;
        const dbHost =
          (options as { host?: string }).host ||
          process.env.DB_HOST ||
          'localhost';
        const dbPort =
          (options as { port?: number }).port ||
          parseInt(process.env.DB_PORT || '5432', 10);
        const dbName =
          (options as { database?: string }).database ||
          process.env.DB_NAME ||
          'tutorix';
        this.logger.log(
          `✅ Database connected successfully: ${dbName}@${dbHost}:${dbPort}`,
        );
      }
    } catch (error) {
      this.logger.error('❌ Database connection failed', error);
    }
  }
}

