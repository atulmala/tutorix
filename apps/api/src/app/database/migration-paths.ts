import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * TypeORM migration globs for Docker bundle (.js next to main.js) vs local CLI (.ts under src/migrations).
 */
export function resolveMigrationGlobs(fromDirname: string): string[] {
  const candidates = [
    join(fromDirname, 'migrations'),
    join(fromDirname, '..', '..', 'migrations'),
  ];

  for (const dir of candidates) {
    if (!existsSync(dir)) {
      continue;
    }
    const files = readdirSync(dir);
    if (files.some((file) => file.endsWith('.js'))) {
      return [join(dir, '*.js')];
    }
    if (files.some((file) => file.endsWith('.ts'))) {
      return [join(dir, '*.ts')];
    }
  }

  return [join(fromDirname, 'migrations', '*.ts')];
}
