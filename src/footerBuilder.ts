/**
 * Builder API for composing a custom single-row footer.
 * Developers can add text (with per-item styling) and images to the
 * left/center/right columns. Long text is automatically wrapped to new lines.
 *
 * Example:
 * ```ts
 * const footer = new FooterBuilder()
 *   .fontSize(8)
 *   .margin(4)
 *   .leftText('Company Name', { bold: true })
 *   .centerImage(logo, { height: 16 })
 *   .rightText('Page {page} / {total}');
 *
 * await stampPdf({ pdf, qr: { text: '...' }, footerBuilder: footer });
 * ```
 */
import { readFileSync } from 'fs';
import {
  PDFDocument,
  PDFPage,
  PDFImage,
  PDFFont,
  rgb,
  StandardFonts,
} from 'pdf-lib';
import { wrapText } from './text.js';

export interface FooterTextOptions {
  fontSize?: number;
  color?: [number, number, number];
  bold?: boolean;
  /**
   * Max line width for auto-wrap.
   * - number: explicit width in points.
   * - `'page'`: full page width minus margins.
   * - `'remaining'`: remaining width in the column after other items are placed.
   * Default = column width (~1/3 of the page).
   */
  maxWidth?: number | 'page' | 'remaining';
}

export interface FooterImageOptions {
  height?: number;
}

export interface FooterTextItem {
  kind: 'text';
  value: string;
  options?: FooterTextOptions;
}

export interface FooterImageItem {
  kind: 'image';
  image: string | Uint8Array | Buffer | ArrayBuffer;
  options?: FooterImageOptions;
}

export type FooterItem = FooterTextItem | FooterImageItem;

type Column = 'left' | 'center' | 'right';

function expandTokens(text: string, page: number, total: number): string {
  return text
    .replace(/\{page\}/g, String(page))
    .replace(/\{total\}/g, String(total));
}

function loadImageBytes(image: string | Uint8Array | Buffer | ArrayBuffer): Uint8Array {
  if (typeof image === 'string') return new Uint8Array(readFileSync(image));
  if (image instanceof ArrayBuffer) return new Uint8Array(image);
  return new Uint8Array(image as Uint8Array);
}

function isPng(b: Uint8Array): boolean {
  return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
}

function isJpg(b: Uint8Array): boolean {
  return b[0] === 0xff && b[1] === 0xd8;
}

interface MeasuredText {
  kind: 'text';
  lines: string[];
  blockWidth: number;
  blockHeight: number;
  fontSize: number;
  color: [number, number, number];
  bold: boolean;
  /** True when this item uses maxWidth: 'remaining' and is resolved in a second pass. */
  remaining?: boolean;
}

interface MeasuredImage {
  kind: 'image';
  image: PDFImage;
  blockWidth: number;
  blockHeight: number;
}

type MeasuredItem = MeasuredText | MeasuredImage;

export class FooterBuilder {
  private _fontSize = 8;
  private _margin = 4;
  private _color: [number, number, number] = [0.3, 0.3, 0.3];
  private _items: { column: Column; item: FooterItem }[] = [];

  /** Default font size for text items that do not override it. */
  fontSize(size: number): this {
    this._fontSize = size;
    return this;
  }

  /** Distance from the footer to the bottom paper edge (points). */
  margin(m: number): this {
    this._margin = m;
    return this;
  }

  /** Default text color as RGB 0..1. */
  color(c: [number, number, number]): this {
    this._color = c;
    return this;
  }

  leftText(text: string, options?: FooterTextOptions): this {
    this._items.push({ column: 'left', item: { kind: 'text', value: text, options } });
    return this;
  }

  centerText(text: string, options?: FooterTextOptions): this {
    this._items.push({ column: 'center', item: { kind: 'text', value: text, options } });
    return this;
  }

  rightText(text: string, options?: FooterTextOptions): this {
    this._items.push({ column: 'right', item: { kind: 'text', value: text, options } });
    return this;
  }

  leftImage(image: string | Uint8Array | Buffer | ArrayBuffer, options?: FooterImageOptions): this {
    this._items.push({ column: 'left', item: { kind: 'image', image, options } });
    return this;
  }

  centerImage(image: string | Uint8Array | Buffer | ArrayBuffer, options?: FooterImageOptions): this {
    this._items.push({ column: 'center', item: { kind: 'image', image, options } });
    return this;
  }

  rightImage(image: string | Uint8Array | Buffer | ArrayBuffer, options?: FooterImageOptions): this {
    this._items.push({ column: 'right', item: { kind: 'image', image, options } });
    return this;
  }

  /** Render the footer on every page of the document. */
  async render(pdfDoc: PDFDocument): Promise<void> {
    const pages = pdfDoc.getPages();
    const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Pre-embed all images once per document.
    const imageCache = new Map<string | Uint8Array | Buffer | ArrayBuffer, PDFImage>();
    for (const { item } of this._items) {
      if (item.kind !== 'image' || imageCache.has(item.image)) continue;
      const bytes = loadImageBytes(item.image);
      let img: PDFImage;
      if (isPng(bytes)) img = await pdfDoc.embedPng(bytes);
      else if (isJpg(bytes)) img = await pdfDoc.embedJpg(bytes);
      else throw new Error('Footer image must be a PNG or JPG.');
      imageCache.set(item.image, img);
    }

    for (let i = 0; i < pages.length; i++) {
      await this._drawOnPage(
        pages[i],
        i + 1,
        pages.length,
        regular,
        bold,
        imageCache,
      );
    }
  }

  private _measureTextItem(
    item: FooterTextItem,
    pageNo: number,
    total: number,
    regular: PDFFont,
    bold: PDFFont,
    maxW: number,
  ): MeasuredText {
    const size = item.options?.fontSize ?? this._fontSize;
    const font = item.options?.bold ? bold : regular;
    const c = item.options?.color ?? this._color;
    const lines = wrapText(
      expandTokens(item.value, pageNo, total),
      font,
      size,
      maxW,
    );
    const lineHeight = size * 1.2;
    const blockWidth = Math.max(
      ...lines.map((l) => font.widthOfTextAtSize(l, size)),
      0,
    );
    return {
      kind: 'text',
      lines,
      blockWidth,
      blockHeight: lines.length * lineHeight,
      fontSize: size,
      color: c,
      bold: !!item.options?.bold,
    };
  }

  private async _drawOnPage(
    page: PDFPage,
    pageNo: number,
    total: number,
    regular: PDFFont,
    bold: PDFFont,
    imageCache: Map<string | Uint8Array | Buffer | ArrayBuffer, PDFImage>,
  ): Promise<void> {
    const { width } = page.getSize();
    const gap = 4;
    const available = width - 2 * this._margin;
    const defaultColWidth = available / 3;

    // First pass: measure images and text with explicit widths.
    // Text items using maxWidth: 'remaining' are measured with a placeholder.
    const cols: Record<Column, MeasuredItem[]> = { left: [], center: [], right: [] };
    for (const { column, item } of this._items) {
      if (item.kind === 'text') {
        const requested = item.options?.maxWidth;
        if (requested === 'remaining') {
          cols[column].push({
            kind: 'text',
            lines: [],
            blockWidth: 0,
            blockHeight: 0,
            fontSize: item.options?.fontSize ?? this._fontSize,
            color: item.options?.color ?? this._color,
            bold: !!item.options?.bold,
            remaining: true,
          });
        } else {
          const maxW = requested === 'page' ? available : (requested ?? defaultColWidth);
          cols[column].push(
            this._measureTextItem(item, pageNo, total, regular, bold, maxW),
          );
        }
      } else {
        const img = imageCache.get(item.image)!;
        const h = item.options?.height ?? this._fontSize;
        const w = h * (img.width / img.height);
        cols[column].push({ kind: 'image', image: img, blockWidth: w, blockHeight: h });
      }
    }

    // Second pass: resolve 'remaining' widths per column.
    for (const col of ['left', 'center', 'right'] as Column[]) {
      const items = cols[col];
      const remainingItems = items.filter(
        (it): it is MeasuredText => it.kind === 'text' && !!it.remaining,
      );
      if (remainingItems.length === 0) continue;

      const fixedWidth = items
        .filter((it) => (it.kind === 'text' ? !it.remaining : true))
        .reduce((s, it) => s + it.blockWidth, 0);
      const gapsWidth = Math.max(0, items.length - 1) * gap;
      const remainingWidth = Math.max(10, defaultColWidth - fixedWidth - gapsWidth);
      const eachWidth = remainingWidth / remainingItems.length;

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.kind === 'text' && it.remaining) {
          const original = this._items.find(
            (entry) => entry.column === col && entry.item.kind === 'text',
          )?.item as FooterTextItem | undefined;
          if (!original) continue;
          const measured = this._measureTextItem(
            original,
            pageNo,
            total,
            regular,
            bold,
            eachWidth,
          );
          items[i] = measured;
        }
      }
    }

    // Compute column widths and starting x positions.
    const colWidths: Record<Column, number> = {
      left: cols.left.reduce((s, it) => s + it.blockWidth, 0) + Math.max(0, cols.left.length - 1) * gap,
      center: cols.center.reduce((s, it) => s + it.blockWidth, 0) + Math.max(0, cols.center.length - 1) * gap,
      right: cols.right.reduce((s, it) => s + it.blockWidth, 0) + Math.max(0, cols.right.length - 1) * gap,
    };

    const colStarts: Record<Column, number> = {
      left: this._margin,
      center: this._margin + colWidths.left + gap,
      right: this._margin + colWidths.left + gap + colWidths.center + gap,
    };

    // Draw items per column (bottom-aligned).
    for (const col of ['left', 'center', 'right'] as Column[]) {
      let x = colStarts[col];
      for (const it of cols[col]) {
        if (it.kind === 'text') {
          const font = it.bold ? bold : regular;
          const lineHeight = it.fontSize * 1.2;
          for (let i = 0; i < it.lines.length; i++) {
            // The bottom line sits at y = margin; lines above rise by lineHeight.
            const y = this._margin + (it.lines.length - 1 - i) * lineHeight;
            page.drawText(it.lines[i], {
              x,
              y,
              size: it.fontSize,
              font,
              color: rgb(it.color[0], it.color[1], it.color[2]),
            });
          }
          x += it.blockWidth + gap;
        } else {
          page.drawImage(it.image, {
            x,
            y: this._margin,
            width: it.blockWidth,
            height: it.blockHeight,
          });
          x += it.blockWidth + gap;
        }
      }
    }
  }
}
