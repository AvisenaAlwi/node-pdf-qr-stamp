import { PDFDocument, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { wrapText } from './text.js';
import type { FooterOptions } from './types.js';

function expandTokens(text: string, page: number, total: number): string {
  return text
    .replace(/\{page\}/g, String(page))
    .replace(/\{total\}/g, String(total));
}

/**
 * Draw a thin footer on every page of the document. Text is positioned just
 * above the bottom paper edge using a small margin.
 *
 * Long text in left/center/right is automatically wrapped into multiple lines
 * within its column so it does not run off the page.
 */
export async function drawFooter(
  pdfDoc: PDFDocument,
  footer: FooterOptions,
): Promise<void> {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = footer.fontSize ?? 8;
  const margin = footer.margin ?? 4;
  const color = footer.color
    ? rgb(footer.color[0], footer.color[1], footer.color[2])
    : rgb(0.3, 0.3, 0.3);
  const total = pdfDoc.getPageCount();

  // Build left/center/right strings and optionally append the page number label.
  // Token expansion happens per-page below so {page}/{total} reflect each page.
  let left = footer.left || undefined;
  let center = footer.center || undefined;
  let right = footer.right || undefined;

  if (footer.pageNumber) {
    const label = `Halaman {page} / {total}`;
    right = right ? `${right}    ${label}` : label;
  }

  const pages = pdfDoc.getPages();
  pages.forEach((page: PDFPage, i: number) => {
    const { width } = page.getSize();
    const pageNo = i + 1;
    const available = width - 2 * margin;
    const colGap = 8;
    const colWidth = (available - 2 * colGap) / 3;
    const lineHeight = fontSize * 1.2;

    const colStarts = {
      left: margin,
      center: margin + colWidth + colGap,
      right: margin + 2 * (colWidth + colGap),
    };

    const prepare = (text: string | undefined): string[] => {
      if (!text) return [];
      return wrapText(expandTokens(text, pageNo, total), font, fontSize, colWidth);
    };

    const leftLines = prepare(left);
    const centerLines = prepare(center);
    const rightLines = prepare(right);
    const maxLines = Math.max(leftLines.length, centerLines.length, rightLines.length);

    for (let lineIdx = 0; lineIdx < maxLines; lineIdx++) {
      const y = margin + lineIdx * lineHeight;

      const drawLine = (
        lines: string[],
        align: 'left' | 'center' | 'right',
      ) => {
        const idx = lines.length - 1 - lineIdx;
        if (idx < 0) return;
        const t = lines[idx];
        const tw = font.widthOfTextAtSize(t, fontSize);
        let x = colStarts[align];
        if (align === 'center') x += (colWidth - tw) / 2;
        if (align === 'right') x += colWidth - tw;
        page.drawText(t, { x, y, size: fontSize, font, color });
      };

      drawLine(leftLines, 'left');
      drawLine(centerLines, 'center');
      drawLine(rightLines, 'right');
    }
  });
}
