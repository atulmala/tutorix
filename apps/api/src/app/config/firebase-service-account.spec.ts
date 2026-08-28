import { generateKeyPairSync, createPrivateKey } from 'crypto';
import {
  normalizeFirebaseServiceAccountJson,
  normalizePemPrivateKey,
} from './firebase-service-account';

describe('normalizePemPrivateKey', () => {
  it('wraps a single-line PKCS#8 PEM at 64 characters', () => {
    const body = 'A'.repeat(70);
    const oneLine = `-----BEGIN PRIVATE KEY-----${body}-----END PRIVATE KEY-----`;
    const normalized = normalizePemPrivateKey(oneLine);
    expect(normalized.includes('\n')).toBe(true);
    expect(normalized.startsWith('-----BEGIN PRIVATE KEY-----\n')).toBe(true);
    expect(normalized).toContain('\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\n');
    expect(normalized.trim().endsWith('-----END PRIVATE KEY-----')).toBe(true);
  });

  it('turns literal \\n into real newlines', () => {
    const raw =
      '-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n';
    expect(normalizePemPrivateKey(raw)).toBe(
      '-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----\n',
    );
  });

  it('wraps a PKCS#8 PEM that has leading whitespace', () => {
    const body = 'A'.repeat(70);
    const oneLine = `  -----BEGIN PRIVATE KEY-----${body}-----END PRIVATE KEY-----  `;
    const normalized = normalizePemPrivateKey(oneLine);
    expect(normalized.includes('\n')).toBe(true);
    expect(normalized.startsWith('-----BEGIN PRIVATE KEY-----\n')).toBe(true);
  });

  it('leaves already-valid PEM unchanged', () => {
    const pem = '-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----\n';
    expect(normalizePemPrivateKey(pem)).toBe(pem);
  });

  it('restores PEM line breaks when JSON \\n lost its backslash', () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const stripped = pem.replace(/\n/g, 'n');
    expect(stripped.includes('\n')).toBe(false);

    const normalized = normalizePemPrivateKey(stripped);
    expect(() => createPrivateKey(normalized)).not.toThrow();
    expect(createPrivateKey(normalized).export({ type: 'pkcs8', format: 'pem' }).toString()).toBe(
      pem,
    );
  });

  it('still recovers after a 64-character wrap of the stripped PEM', () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const stripped = pem.replace(/\n/g, 'n');
    const begin = '-----BEGIN PRIVATE KEY-----';
    const end = '-----END PRIVATE KEY-----';
    const body = stripped.slice(begin.length, stripped.lastIndexOf(end));
    const wrapped = `${begin}\n${body.match(/.{1,64}/g)?.join('\n')}\n${end}\n`;
    const normalized = normalizePemPrivateKey(wrapped);
    expect(() => createPrivateKey(normalized)).not.toThrow();
  });

  it('wraps a valid PEM whose newlines were removed entirely', () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const collapsed = pem.replace(/\n/g, '');
    const normalized = normalizePemPrivateKey(collapsed);
    expect(() => createPrivateKey(normalized)).not.toThrow();
  });
});

describe('normalizeFirebaseServiceAccountJson', () => {
  it('normalizes private_key and round-trips as one-line JSON', () => {
    const json = JSON.stringify({
      type: 'service_account',
      private_key: `-----BEGIN PRIVATE KEY-----${'B'.repeat(70)}-----END PRIVATE KEY-----`,
    });
    const out = JSON.parse(normalizeFirebaseServiceAccountJson(json));
    expect(out.private_key.includes('\n')).toBe(true);
    expect(out.private_key.includes('BEGIN PRIVATE KEY')).toBe(true);
  });
});
