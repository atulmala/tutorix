import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, normalize, resolve, sep } from 'path';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const PATH_PATTERN =
  /^(email|sms|whatsapp|notification)\/[A-Z0-9_]+\.[A-Z]+\.(html|txt)$/;

export type ParsedTemplateFile = {
  attributes: Record<string, string>;
  body: string;
  raw: string;
};

@Injectable()
export class TemplateStore {
  constructor(private readonly configService: ConfigService) {}

  read(relativePath: string): ParsedTemplateFile {
    const absolute = this.resolveExisting(relativePath);
    const raw = readFileSync(absolute, 'utf8');
    return { ...parseFrontmatter(raw), raw };
  }

  write(relativePath: string, contents: string): void {
    this.assertSafeRelativePath(relativePath);
    const root = this.writeRoot();
    const absolute = this.joinUnderRoot(root, relativePath);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, contents, 'utf8');
  }

  bundledRoot(): string {
    const override = this.overrideRoot();
    if (override) {
      return override;
    }
    return this.defaultBundledRoot();
  }

  private resolveExisting(relativePath: string): string {
    this.assertSafeRelativePath(relativePath);
    const override = this.overrideRoot();
    if (override) {
      const overridePath = this.joinUnderRoot(override, relativePath);
      if (existsSync(overridePath)) {
        return overridePath;
      }
    }
    const bundled = this.joinUnderRoot(this.defaultBundledRoot(), relativePath);
    if (!existsSync(bundled)) {
      throw new BadRequestException(
        `Communication template not found: ${relativePath}`,
      );
    }
    return bundled;
  }

  private writeRoot(): string {
    return this.overrideRoot() ?? this.defaultBundledRoot();
  }

  private overrideRoot(): string | null {
    const value =
      this.configService.get<string>('COMMUNICATION_TEMPLATES_DIR')?.trim() ||
      process.env.COMMUNICATION_TEMPLATES_DIR?.trim();
    return value ? resolve(value) : null;
  }

  defaultBundledRoot(): string {
    const candidates = [
      join(__dirname, 'templates'),
      join(process.cwd(), 'apps/api/src/app/modules/communication/templates'),
      join(process.cwd(), 'communication/templates'),
      join(process.cwd(), 'dist/apps/api/communication/templates'),
    ];
    const existing = candidates.find((dir) => existsSync(dir));
    return existing ?? candidates[0];
  }

  assertSafeRelativePath(relativePath: string): void {
    const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!PATH_PATTERN.test(normalized) || normalized.includes('..')) {
      throw new BadRequestException('Invalid template path');
    }
  }

  private joinUnderRoot(root: string, relativePath: string): string {
    const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    const absolute = resolve(join(root, ...normalized.split('/')));
    const rootWithSep = normalize(root + sep);
    if (absolute !== resolve(root) && !absolute.startsWith(rootWithSep)) {
      throw new BadRequestException('Invalid template path');
    }
    return absolute;
  }
}

export function parseFrontmatter(raw: string): {
  attributes: Record<string, string>;
  body: string;
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { attributes: {}, body: raw };
  }
  const attributes: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx === -1) {
      continue;
    }
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) {
      attributes[key] = value;
    }
  }
  return { attributes, body: match[2] };
}

export function serializeTemplateFile(
  attributes: Record<string, string | undefined>,
  body: string,
): string {
  const lines = Object.entries(attributes)
    .filter(([, value]) => value != null && String(value).length > 0)
    .map(([key, value]) => `${key}: ${value}`);
  return `---\n${lines.join('\n')}\n---\n${body.endsWith('\n') ? body : `${body}\n`}`;
}
