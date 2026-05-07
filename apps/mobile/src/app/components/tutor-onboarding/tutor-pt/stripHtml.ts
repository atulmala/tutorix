/**
 * Decode numeric HTML entities (e.g. &#039; or &#39; for apostrophe).
 */
function decodeNumericEntities(str: string): string {
  return str.replace(/&#(\d+);/g, (_, num) =>
    String.fromCharCode(parseInt(num, 10))
  ).replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}

/**
 * Strip HTML tags and decode HTML entities for React Native display.
 * React Native does not support dangerouslySetInnerHTML.
 */
export function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return decodeNumericEntities(
    html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
  ).trim();
}
