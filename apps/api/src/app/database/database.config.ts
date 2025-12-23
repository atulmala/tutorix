import { DataSourceOptions } from 'typeorm';
import { join } from 'path';

export const databaseOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'tutorix',

  // Load all entity files from app modules (including common)
  entities: [join(__dirname, '..', '**', '*.entity.ts')],

  // Migrations configuration
  migrations: [join(__dirname, '..', '..', 'migrations', '*.ts')],
  migrationsTableName: 'migrations',

  // IMPORTANT: Disable synchronize when using migrations
  // Use migrations instead for production-safe schema changes
  synchronize: false,

  logging: process.env.NODE_ENV === 'development',
};


