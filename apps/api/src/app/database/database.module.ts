import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { InjectDataSource, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { createDatabaseOptions } from './database.config';
import { loadDatabaseCredentials } from './database-credentials.loader';
import { DocumentScreeningEntity } from '../modules/document/entities/document-screening.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        // Load credentials from .env (dev/staging) or AWS Secrets Manager (production)
        const credentials = await loadDatabaseCredentials();
        const options = createDatabaseOptions(credentials);
        const bootstrapLogger = new Logger('DatabaseBootstrap');

        // #region agent log
        const entityTargets = (options.entities ?? []).map((e) =>
          typeof e === 'function' ? e.name : String(e),
        );
        const bootstrapData = {
          dbSynchronizeEnv: process.env.DB_SYNCHRONIZE ?? null,
          synchronizeEnabled: options.synchronize === true,
          autoRunMigrations: process.env.AUTO_RUN_MIGRATIONS === 'true',
          entityCount: entityTargets.length,
          hasDocumentScreeningEntity: entityTargets.includes(
            'DocumentScreeningEntity',
          ),
          entityNames: entityTargets,
        };
        bootstrapLogger.log(
          `Schema bootstrap: ${JSON.stringify(bootstrapData)}`,
        );
        fetch(
          'http://127.0.0.1:7676/ingest/864fd570-d922-464e-bce0-8023d73126b8',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Debug-Session-Id': '5447a3',
            },
            body: JSON.stringify({
              sessionId: '5447a3',
              location: 'database.module.ts:useFactory',
              message: 'Schema bootstrap config',
              data: bootstrapData,
              timestamp: Date.now(),
              hypothesisId: 'A-B-C',
            }),
          },
        ).catch(() => {});
        // #endregion

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

        // #region agent log
        const screeningTable = await this.dataSource.query<{ exists: boolean }[]>(
          `SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'document_screening'
          ) AS exists`,
        );
        const workflowColumn = await this.dataSource.query<{ exists: boolean }[]>(
          `SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'document'
              AND column_name = 'document_verification_workflow_status'
          ) AS exists`,
        );
        const schemaData = {
          documentScreeningTableExists: screeningTable[0]?.exists === true,
          documentWorkflowColumnExists: workflowColumn[0]?.exists === true,
          documentScreeningEntityMetadata: this.dataSource.hasMetadata(
            DocumentScreeningEntity,
          ),
        };
        this.logger.log(`Schema check: ${JSON.stringify(schemaData)}`);
        fetch(
          'http://127.0.0.1:7676/ingest/864fd570-d922-464e-bce0-8023d73126b8',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Debug-Session-Id': '5447a3',
            },
            body: JSON.stringify({
              sessionId: '5447a3',
              location: 'database.module.ts:onModuleInit',
              message: 'Post-connect schema check',
              data: schemaData,
              timestamp: Date.now(),
              hypothesisId: 'D-E',
            }),
          },
        ).catch(() => {});
        // #endregion
      }
    } catch (error) {
      this.logger.error('❌ Database connection failed', error);
    }
  }
}

