export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function wrapPlainTextAsHtml(body: string): string {
  const escaped = escapeHtml(body).replace(/\r\n|\r|\n/g, '<br />');
  return `<!DOCTYPE html>
<html>
  <body style="font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.5;">
    <p>${escaped}</p>
    <p style="margin-top: 24px; color: #6b7280; font-size: 12px;">— Tutorix</p>
  </body>
</html>`;
}

export function formatFromAddress(fromEmail: string, fromName: string): string {
  const name = fromName.trim();
  if (!name) {
    return fromEmail;
  }
  return `${name} <${fromEmail}>`;
}

export function formatRecipientName(
  firstName?: string | null,
  lastName?: string | null,
): string | null {
  const name = `${firstName || ''} ${lastName || ''}`.trim();
  return name.length > 0 ? name : null;
}

