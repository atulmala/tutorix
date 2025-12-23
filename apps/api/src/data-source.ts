import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from project root
// __dirname will be apps/api/src after compilation
const envPath = join(__dirname, '../../../.env');
config({ path: envPath });

/**
 * TypeORM DataSource configuration for CLI operations (migrations, etc.)
 * This file is used by TypeORM CLI commands and is separate from the NestJS module configuration.
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'tutorix',
  
  // Entities location - all entity files
  entities: [join(__dirname, '**', '*.entity.ts')],
  
  // Migrations location
  migrations: [join(__dirname, 'migrations', '*.ts')],
  
  // Migration table name (tracks which migrations have been run)
  migrationsTableName: 'migrations',
  
  // CLI settings
  synchronize: false, // NEVER use synchronize in production or with migrations
  logging: process.env.NODE_ENV === 'development',
};

// Create and export DataSource instance for CLI
const dataSource = new DataSource(dataSourceOptions);

export default dataSource;

