import { escapeHtml } from './email/email.utils';

const UNESCAPED = /\{\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}\}/g;
const PLACEHOLDER = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;

function payloadString(
  payload: Record<string, unknown>,
  name: string,
): string {
  const raw = payload[name];
  return raw === null || raw === undefined ? '' : String(raw);
}

export function extractPlaceholders(template: string): string[] {
  const names = new Set<string>();
  template.replace(UNESCAPED, (_match, name: string) => {
    names.add(name);
    return '';
  });
  template.replace(UNESCAPED, '').replace(PLACEHOLDER, (_match, name: string) => {
    names.add(name);
    return '';
  });
  return [...names];
}

export function renderTemplate(
  template: string,
  payload: Record<string, unknown>,
  options?: { htmlEscape?: boolean },
): string {
  const withUnescaped = template.replace(UNESCAPED, (_match, name: string) =>
    payloadString(payload, name),
  );
  return withUnescaped.replace(PLACEHOLDER, (_match, name: string) => {
    const value = payloadString(payload, name);
    return options?.htmlEscape ? escapeHtml(value) : value;
  });
}

export function assertKnownPlaceholders(
  template: string,
  allowed: string[],
): string[] {
  const unknown = extractPlaceholders(template).filter(
    (name) => !allowed.includes(name),
  );
  return unknown;
}
