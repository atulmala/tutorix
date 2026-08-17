import { escapeHtml } from './email/email.utils';

const PLACEHOLDER = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;

export function extractPlaceholders(template: string): string[] {
  const names = new Set<string>();
  template.replace(PLACEHOLDER, (_match, name: string) => {
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
  return template.replace(PLACEHOLDER, (_match, name: string) => {
    const raw = payload[name];
    const value =
      raw === null || raw === undefined ? '' : String(raw);
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
