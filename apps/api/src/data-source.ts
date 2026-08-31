import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import { loadAppSecrets } from './app/config/app-secrets.loader';

const envPath = join(__dirname, '../../../.env');
config({ path: envPath });

/**
 * TypeORM DataSource for CLI operations (migrations, etc.).
 * Secrets Manager is loaded first so DB_USERNAME / DB_PASSWORD come from tutorix/app.
 */
async function createCliDataSource(): Promise<DataSource> {
  await loadAppSecrets();

  return new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tutorix',

    entities: [join(__dirname, 'app', '**', '*.entity.ts')],
    migrations: [join(__dirname, 'migrations', '*.ts')],
    migrationsTableName: 'migrations',
    // each: commit after every file so Postgres can use newly added enum values
    migrationsTransactionMode: 'each',
    synchronize: false,
    logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : false,
  });
}

export default createCliDataSource();
