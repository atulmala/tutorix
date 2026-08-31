import { formatFailedDocuments } from './failed-documents-copy';

describe('formatFailedDocuments', () => {
  it('builds escaped HTML and plain-text lists', () => {
    const result = formatFailedDocuments([
      { label: 'PAN Card', reason: 'Photo is blurry' },
      { label: 'Aadhaar Card', reason: '<script>x</script>' },
    ]);
    expect(result.failedCount).toBe('2');
    expect(result.failedDocumentsText).toBe(
      'PAN Card: Photo is blurry\nAadhaar Card: <script>x</script>',
    );
    expect(result.failedDocumentsHtml).toBe(
      '<ul><li><strong>PAN Card</strong>: Photo is blurry</li><li><strong>Aadhaar Card</strong>: &lt;script&gt;x&lt;/script&gt;</li></ul>',
    );
  });

  it('falls back to generic copy', () => {
    const result = formatFailedDocuments([{ label: '', reason: '   ' }]);
    expect(result.failedDocumentsText).toBe('Document: Not accepted');
  });
});
