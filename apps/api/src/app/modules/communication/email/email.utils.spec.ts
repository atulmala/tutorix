import { escapeHtml, formatFromAddress, formatRecipientName, wrapPlainTextAsHtml } from './email.utils';

describe('email.utils', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml(`<b>a&b "c"</b>`)).toBe(
      '&lt;b&gt;a&amp;b &quot;c&quot;&lt;/b&gt;',
    );
  });

  it('wraps plain text as HTML with line breaks', () => {
    const html = wrapPlainTextAsHtml('hello\nworld');
    expect(html).toContain('hello<br />world');
    expect(html).not.toContain('<script>');
  });

  it('formats from address with optional display name', () => {
    expect(formatFromAddress('info@tutorix.tech', 'Tutorix')).toBe(
      'Tutorix <info@tutorix.tech>',
    );
    expect(formatFromAddress('info@tutorix.tech', '  ')).toBe('info@tutorix.tech');
  });

  it('formats recipient display name', () => {
    expect(formatRecipientName('Ada', 'Lovelace')).toBe('Ada Lovelace');
    expect(formatRecipientName('Ada', null)).toBe('Ada');
    expect(formatRecipientName('', '')).toBeNull();
  });
});
