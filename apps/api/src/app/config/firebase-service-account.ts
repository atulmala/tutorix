/**
 * Secrets Manager / .env often mangle PKCS#8 PEMs:
 * - newlines collapse into one line
 * - JSON `\n` escapes lose their backslash, leaving the letter `n` between
 *   64-character lines. node-forge then throws
 *   "Only 8, 16, 24, or 32 bits supported: 528"
 */
const BASE64_CHARS = /^[A-Za-z0-9+/=]+$/;

export function normalizePemPrivateKey(pem: string): string {
  let s = pem.replace(/^\uFEFF/, '').trim();
  s = s.replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-');
  s = s.replace(/\\n/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const beginIdx = s.indexOf('-----BEGIN ');
  const endIdx = s.lastIndexOf('-----END ');
  if (beginIdx === -1 || endIdx === -1 || endIdx <= beginIdx) {
    return s;
  }
  const headerClose = s.indexOf('-----', beginIdx + 5);
  const footerClose = s.indexOf('-----', endIdx + 5);
  if (headerClose === -1 || footerClose === -1) {
    return s;
  }
  const header = s.slice(beginIdx, headerClose + 5);
  const footer = s.slice(endIdx, footerClose + 5);
  const rawBody = s.slice(headerClose + 5, endIdx);
  const compact = recoverBackslashStrippedNewlines(rawBody.replace(/\s+/g, ''));
  if (!compact) {
    return s.endsWith('\n') ? s : `${s}\n`;
  }
  const wrapped = compact.match(/.{1,64}/g)?.join('\n') ?? compact;
  return `${header}\n${wrapped}\n${footer}\n`;
}

export function normalizeFirebaseServiceAccountJson(raw: string): string {
  const parsed: unknown = JSON.parse(raw);
  if (
    parsed &&
    typeof parsed === 'object' &&
    !Array.isArray(parsed) &&
    typeof (parsed as { private_key?: unknown }).private_key === 'string'
  ) {
    (parsed as { private_key: string }).private_key = normalizePemPrivateKey(
      (parsed as { private_key: string }).private_key,
    );
  }
  return JSON.stringify(parsed);
}

/**
 * When `\n` in a PEM loses its backslash, each original line break becomes the
 * letter `n` after a 64-character base64 chunk. Rejoin those chunks.
 */
function recoverBackslashStrippedNewlines(body: string): string {
  const candidates = [body];
  if (body.startsWith('n')) {
    candidates.push(body.slice(1));
  }
  if (body.endsWith('n')) {
    candidates.push(body.slice(0, -1));
  }
  if (body.startsWith('n') && body.endsWith('n') && body.length > 1) {
    candidates.push(body.slice(1, -1));
  }

  for (const candidate of candidates) {
    const recovered = joinPemChunksSeparatedByN(candidate);
    if (recovered) {
      return recovered;
    }
  }
  return body;
}

function joinPemChunksSeparatedByN(input: string): string | null {
  if (input.length < 65) {
    return null;
  }
  const parts: string[] = [];
  let i = 0;
  while (i < input.length) {
    const rest = input.length - i;
    if (rest <= 64) {
      if (rest === 0) {
        break;
      }
      const last = input.slice(i);
      if (!BASE64_CHARS.test(last)) {
        return null;
      }
      parts.push(last);
      break;
    }
    if (input[i + 64] !== 'n') {
      return null;
    }
    const chunk = input.slice(i, i + 64);
    if (!BASE64_CHARS.test(chunk)) {
      return null;
    }
    parts.push(chunk);
    i += 65;
  }
  if (parts.length < 2) {
    return null;
  }
  const joined = parts.join('');
  if (joined.length % 4 !== 0 || joined.length >= input.length) {
    return null;
  }
  return joined;
}
