import type { PDFFont } from 'pdf-lib';

/**
 * Wrap a text string into multiple lines so that no line exceeds `maxWidth`
 * when rendered with the given font and size.
 *
 * Splitting happens at word boundaries; if a single word is too long it is
 * broken character-by-character.
 */
export function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
): string[] {
  if (!text) return [''];
  if (maxWidth <= 0) return [text];

  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  const tooWide = (s: string) => font.widthOfTextAtSize(s, fontSize) > maxWidth;

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!tooWide(candidate)) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = '';
    }

    if (tooWide(word)) {
      // Break the long word character by character.
      let piece = '';
      for (const ch of word) {
        const next = piece + ch;
        if (!tooWide(next)) {
          piece = next;
        } else {
          if (piece) lines.push(piece);
          piece = ch;
        }
      }
      current = piece;
    } else {
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [''];
}
