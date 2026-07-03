/**
 * Shared utility to generate heading IDs from text.
 * Used by both extractHeadings (DocsPage TOC) and MarkdownRenderer (heading renderer)
 * to ensure consistent anchor IDs.
 */
export function generateHeadingId(text: string): string {
  // Strip HTML tags first (from marked output), then strip markdown formatting chars
  const plain = text.replace(/<[^>]+>/g, '').replace(/[`*_\[\]()]/g, '').trim();
  return plain.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '');
}
