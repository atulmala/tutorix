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
// Migration name (optional, defaults to 'migration')

const tsNodeCmd = 'ts-node --project apps/api/tsconfig.app.json';
const dataSourcePath = 'apps/api/src/data-source.ts';
const migrationsDir = 'apps/api/src/migrations';

/**
 * Get date in ddmmyyyy format
 */
function getDatePrefix() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}${month}${year}`;
}

/**
 * Get the next sequence number for migrations on the same date
 */
function getNextSequenceNumber(datePrefix) {
  if (!fs.existsSync(migrationsDir)) {
    return 1;
  }

  const files = fs.readdirSync(migrationsDir);
  const pattern = new RegExp(`^${datePrefix}-(\\d+)\\.migration\\.ts$`);
  
  let maxSequence = 0;
  files.forEach(file => {
    const match = file.match(pattern);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (seq > maxSequence) {
        maxSequence = seq;
      }
    }
  });

  return maxSequence + 1;
}

/**
 * Generate migration file name in format: ddmmyyyy-x.migration.ts
 */
function generateMigrationFileName() {
  const datePrefix = getDatePrefix();
  const sequence = getNextSequenceNumber(datePrefix);
  return `${datePrefix}-${sequence}.migration`;
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
 * Format: ddmmyyyy-x.migration -> MigrationDdmmyyyyX
 * Example: 25122025-1.migration -> Migration251220251
 */
function toMigrationClassName(fileName) {
  // Remove .migration extension
  const nameWithoutExt = fileName.replace('.migration', '');
  // Format: ddmmyyyy-x -> MigrationDdmmyyyyX
  // Replace dashes and ensure it starts with Migration prefix
  const parts = nameWithoutExt.split('-');
  if (parts.length === 2) {
    const datePart = parts[0]; // ddmmyyyy
    const seqPart = parts[1];   // x
    return `Migration${datePart}${seqPart}`;
  }
  // Fallback: just prefix with Migration
  return `Migration${nameWithoutExt.replace(/[-_\s]/g, '')}`;
}

if (command === 'generate') {
  const targetFileName = generateMigrationFileName();
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
  const targetFileName = generateMigrationFileName();
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
