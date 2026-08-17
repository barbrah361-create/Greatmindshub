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

export function sanitizeRichText(input: string, maxLength = 20000): string {
  if (!input || typeof input !== 'string') return '';
  const cleaned = sanitizeHtml(input.trim(), {
    allowedTags: [
      'b', 'i', 'em', 'strong', 'br', 'p', 'span', 'div', 
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'u', 'ol', 'ul', 'li', 'blockquote'
    ],
    allowedAttributes: {
      span: ['style', 'class'],
      p: ['style', 'class'],
      div: ['style', 'class'],
      h1: ['style', 'class'],
      h2: ['style', 'class'],
      h3: ['style', 'class'],
      h4: ['style', 'class'],
      h5: ['style', 'class'],
      h6: ['style', 'class'],
      u: ['style', 'class'],
      strong: ['style', 'class'],
      em: ['style', 'class'],
      ol: ['style', 'class'],
      ul: ['style', 'class'],
      li: ['style', 'class'],
      blockquote: ['style', 'class']
    },
    allowedStyles: {
      '*': {
        'color': [/.*/],
        'background-color': [/.*/],
        'font-size': [/.*/],
        'font-family': [/.*/],
        'text-align': [/.*/],
        'line-height': [/.*/],
        'letter-spacing': [/.*/],
        'text-indent': [/.*/],
        'margin-left': [/.*/],
        'margin-right': [/.*/],
        'padding-left': [/.*/],
        'padding-right': [/.*/]
      }
    },
    disallowedTagsMode: 'discard'
  });
  return cleaned.slice(0, maxLength);
}
