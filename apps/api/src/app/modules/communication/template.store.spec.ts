import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { TemplateStore } from './template.store';

describe('TemplateStore', () => {
  let dir: string;
  let store: TemplateStore;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'comm-templates-'));
    mkdirSync(join(dir, 'email'));
    writeFileSync(
      join(dir, 'email/EMAIL_VERIFICATION.ACTOR.html'),
      '---\nsubject: Hello\n---\nHi {{firstName}}\n',
    );
    store = new TemplateStore({
      get: (key: string) =>
        key === 'COMMUNICATION_TEMPLATES_DIR' ? dir : undefined,
    } as unknown as ConfigService);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('rejects path traversal', () => {
    expect(() => store.read('../secret.txt')).toThrow(BadRequestException);
    expect(() => store.read('email/../../etc/passwd')).toThrow(
      BadRequestException,
    );
  });

  it('reads a bundled/override file', () => {
    const file = store.read('email/EMAIL_VERIFICATION.ACTOR.html');
    expect(file.attributes.subject).toBe('Hello');
    expect(file.body).toContain('Hi {{firstName}}');
  });

  it('accepts on-screen template paths', () => {
    mkdirSync(join(dir, 'on-screen'));
    store.write(
      'on-screen/DOCUMENTS_ALL_UPLOADED.ACTOR.txt',
      '---\ntitle: Review\n---\nUnder review\n',
    );
    const file = store.read('on-screen/DOCUMENTS_ALL_UPLOADED.ACTOR.txt');
    expect(file.attributes.title).toBe('Review');
    expect(file.body).toContain('Under review');
  });

  it('writes to the override directory', () => {
    store.write(
      'email/WALLET_TOP_UP.ACTOR.html',
      '---\nsubject: Wallet\n---\ncredited\n',
    );
    const raw = readFileSync(
      join(dir, 'email/WALLET_TOP_UP.ACTOR.html'),
      'utf8',
    );
    expect(raw).toContain('credited');
  });
});
