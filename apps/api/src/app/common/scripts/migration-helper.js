#!/usr/bin/env node

/**
 * Migration Helper Script
 * 
 * Generates timestamp-based migration file names automatically.
 * 
 * Usage:
 *   node migration-helper.js generate [MigrationName]
 *   node migration-helper.js create [MigrationName]
 */

const { execSync } = require('child_process');

const command = process.argv[2]; // 'generate' or 'create'
// Migration name (optional, defaults to 'Migration')
// Usage: npm run migration:generate -- CreateTutorTable
const migrationName = process.argv[3] || 'Migration';

// Generate timestamp (milliseconds since epoch)
const timestamp = Date.now();
const migrationPath = `apps/api/src/migrations/${timestamp}-${migrationName}`;

const tsNodeCmd = 'ts-node --project apps/api/tsconfig.app.json';
const dataSourcePath = 'apps/api/src/data-source.ts';

if (command === 'generate') {
  const fullCommand = `${tsNodeCmd} ./node_modules/typeorm/cli.js migration:generate -d ${dataSourcePath} ${migrationPath}`;
  console.log(`🔄 Generating migration: ${migrationPath}`);
  execSync(fullCommand, { stdio: 'inherit' });
} else if (command === 'create') {
  const fullCommand = `${tsNodeCmd} ./node_modules/typeorm/cli.js migration:create ${migrationPath}`;
  console.log(`📝 Creating migration: ${migrationPath}`);
  execSync(fullCommand, { stdio: 'inherit' });
} else {
  console.error('❌ Invalid command. Use "generate" or "create"');
  process.exit(1);
}

