import { renderTemplate, extractPlaceholders, assertKnownPlaceholders } from './template.renderer';

describe('template.renderer', () => {
  it('replaces named placeholders', () => {
    expect(renderTemplate('Hi {{firstName}}', { firstName: 'Ada' })).toBe('Hi Ada');
  });

  it('HTML-escapes values when requested', () => {
    expect(
      renderTemplate('<p>{{firstName}}</p>', { firstName: '<script>x</script>' }, {
        htmlEscape: true,
      }),
    ).toBe('<p>&lt;script&gt;x&lt;/script&gt;</p>');
  });

  it('leaves triple-brace values unescaped', () => {
    expect(
      renderTemplate(
        '<p>Hi {{firstName}}</p>{{{failedDocumentsHtml}}}',
        {
          firstName: '<Ada>',
          failedDocumentsHtml: '<ul><li>PAN</li></ul>',
        },
        { htmlEscape: true },
      ),
    ).toBe('<p>Hi &lt;Ada&gt;</p><ul><li>PAN</li></ul>');
  });

  it('extracts triple-brace names as placeholders', () => {
    expect(extractPlaceholders('{{firstName}} {{{failedDocumentsHtml}}}')).toEqual(
      expect.arrayContaining(['firstName', 'failedDocumentsHtml']),
    );
  });

  it('extracts placeholders and flags unknown names', () => {
    expect(extractPlaceholders('{{tutorName}} {{otp}}')).toEqual(
      expect.arrayContaining(['tutorName', 'otp']),
    );
    expect(assertKnownPlaceholders('{{otp}} {{hack}}', ['otp'])).toEqual(['hack']);
  });
});
