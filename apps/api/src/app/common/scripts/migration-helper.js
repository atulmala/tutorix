#!/usr/bin/env node

/**
 * Migration Helper Script
 * 
 * Generates date-based migration file names in format: ddmmyyyy-x.migration.ts
 * where ddmmyyyy is the date and x is the sequence number for that date.
 * 
 * Usage:
 *   node migration-helper.js generate [MigrationName]
 *   node migration-helper.js create [MigrationName]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const command = process.argv[2]; // 'generate' or 'create'
const migrationNameArg = process.argv[3] || 'migration';

const tsNodeCmd = 'ts-node --project apps/api/tsconfig.app.json';
const dataSourcePath = 'apps/api/src/data-source.ts';
const migrationsDir = 'apps/api/src/migrations';

const timestamp = () => Date.now();

const slugify = (str) =>
  str
    .toString()
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'migration';

const toCamel = (str) =>
  str
    .split(/[^a-zA-Z0-9]/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');

/**
 * Generate migration base name in format: <timestamp>-<slug>.migration
 */
function generateMigrationFileName(customName) {
  const ts = timestamp();
  const slug = slugify(customName);
  return `${ts}-${slug}.migration`;
}

/**
 * Update class name in migration file to match the file name
 */
function updateMigrationClassName(filePath, className) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Replace the class declaration
  const classRegex = /export class \w+ implements MigrationInterface/g;
  const updatedContent = content.replace(
    classRegex,
    `export class ${className} implements MigrationInterface`
  );
  
  // Replace the name property
  const nameRegex = /name = '[^']+'/g;
  const finalContent = updatedContent.replace(
    nameRegex,
    `name = '${className}'`
  );
  
  fs.writeFileSync(filePath, finalContent, 'utf8');
}

/**
 * Convert migration file name to class name
 * Format: 1735603200000-name.migration -> Migration1735603200000Name
 */
function toMigrationClassName(fileName) {
  // Remove .migration extension
  const nameWithoutExt = fileName.replace('.migration', '');
  const [ts, ...rest] = nameWithoutExt.split('-');
  const suffix = toCamel(rest.join('-'));
  return `Migration${ts}${suffix}`;
}

if (command === 'generate') {
  const targetFileName = generateMigrationFileName(migrationNameArg);
  const targetPath = path.join(migrationsDir, `${targetFileName}.ts`);
  const className = toMigrationClassName(targetFileName);
  
  // Generate migration with TypeORM (it will create a file with timestamp)
  // We'll rename it afterwards
  console.log(`🔄 Generating migration...`);
  const tempName = `temp-${Date.now()}`;
  const tempCommand = `${tsNodeCmd} ./node_modules/typeorm/cli.js migration:generate -d ${dataSourcePath} ${migrationsDir}/${tempName}`;
  
  try {
    execSync(tempCommand, { stdio: 'inherit' });
    
    // Find the generated file (TypeORM creates it with timestamp prefix)
    // It will be something like: 1234567890-temp-1234567890.ts
    // First try to find by temp name, then by most recent file
    const allFiles = fs.readdirSync(migrationsDir);
    let generatedFile = allFiles.find(f => f.includes(tempName) && f.endsWith('.ts'));
    
    // If not found by name, find most recently created .ts file (TypeORM pattern: timestamp-name.ts)
    if (!generatedFile) {
      const files = allFiles
        .filter(f => f.endsWith('.ts') && /^\d+-.*\.ts$/.test(f))
        .map(f => ({
          name: f,
          mtime: fs.statSync(path.join(migrationsDir, f)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime); // Most recent first
      
      if (files.length > 0) {
        generatedFile = files[0].name;
      }
    }
    
    if (generatedFile) {
      const generatedPath = path.join(migrationsDir, generatedFile);
      
      // Rename the file first
      fs.renameSync(generatedPath, targetPath);
      
      // Update class name in the file
      updateMigrationClassName(targetPath, className);
      
      console.log(`✅ Migration generated: ${targetPath}`);
      console.log(`   Class name: ${className}`);
    } else {
      console.error('❌ Could not find generated migration file');
      console.error(`   Looked for files containing: ${tempName}`);
      console.error(`   Available files: ${files.join(', ')}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error generating migration:', error.message);
    process.exit(1);
  }
} else if (command === 'create') {
  const targetFileName = generateMigrationFileName(migrationNameArg);
  const targetPath = path.join(migrationsDir, `${targetFileName}.ts`);
  const className = toMigrationClassName(targetFileName);
  
  // Create empty migration file
  const migrationTemplate = `import { MigrationInterface, QueryRunner } from "typeorm";

export class ${className} implements MigrationInterface {
    name = '${className}'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add migration logic here
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Add rollback logic here
    }
}
`;
  
  fs.writeFileSync(targetPath, migrationTemplate, 'utf8');
  console.log(`✅ Migration created: ${targetPath}`);
  console.log(`   Class name: ${className}`);
} else {
  console.error('❌ Invalid command. Use "generate" or "create"');
  process.exit(1);
}
