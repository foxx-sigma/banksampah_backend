import { Transform, TransformFnParams } from 'class-transformer';

/**
 * Sanitizes string input to prevent Stored XSS and malicious tag injections:
 * 1. Strips dangerous tags with executable contents (<script>, <style>, <iframe>, <object>, <embed>).
 * 2. Recursively strips all remaining HTML/XML tags.
 * 3. Strips dangerous pseudoprotocol schemes (javascript:, vbscript:, data:text/html).
 * 4. Trims leading and trailing whitespace.
 */
export function sanitizeText(value: unknown): string | unknown {
  if (typeof value !== 'string') {
    return value;
  }

  let str = value;

  // 1. Remove dangerous block tags and their content
  str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  str = str.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  str = str.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  str = str.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  str = str.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');

  // 2. Recursively strip all remaining HTML/XML tags
  let previous: string;
  do {
    previous = str;
    str = str.replace(/<[^>]*>?/gm, '');
  } while (str !== previous);

  // 3. Remove dangerous pseudoprotocols
  str = str.replace(/(?:javascript|vbscript|data\s*:\s*text\/html)\s*:/gi, '');

  return str.trim();
}

/**
 * Class-transformer decorator to automatically sanitize string fields in DTOs.
 */
export function SanitizeText() {
  return Transform(({ value }: TransformFnParams) => {
    if (Array.isArray(value)) {
      return value.map((v) => (typeof v === 'string' ? sanitizeText(v) : v));
    }
    return sanitizeText(value);
  });
}
