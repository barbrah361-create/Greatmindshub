import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = ['b', 'i', 'em', 'strong', 'br', 'p'];
const ALLOWED_ATTR: Record<string, string[]> = {};

export function sanitizeText(input: string, maxLength = 5000): string {
  if (!input || typeof input !== 'string') return '';
  const cleaned = sanitizeHtml(input.trim(), {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTR,
    disallowedTagsMode: 'discard'
  });
  return cleaned.slice(0, maxLength);
}

export function sanitizePlainText(input: string, maxLength = 500): string {
  if (!input || typeof input !== 'string') return '';
  return sanitizeHtml(input.trim(), { allowedTags: [], allowedAttributes: {} }).slice(0, maxLength);
}

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
