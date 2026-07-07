import { readFileSync, writeFileSync } from 'fs';
import {
  PDFDocument,
  PDFImage,
  rgb,
} from 'pdf-lib';
import { findTextBoxes } from './findText.js';
import { generateQrPng } from './qr.js';
import { drawFooter } from './footer.js';
import { FooterBuilder } from './footerBuilder.js';
import type { QROptions, StampOptions } from './types.js';

const DEFAULT_ANCHOR = 'ditandatangani secara elektronik';

function toBytes(pdf: StampOptions['pdf']): Uint8Array {
  if (typeof pdf === 'string') return new Uint8Array(readFileSync(pdf));
  if (ArrayBuffer.isView(pdf)) {
    return new Uint8Array(pdf.buffer, pdf.byteOffset, pdf.byteLength);
  }
  return new Uint8Array(pdf);
}

function loadImageBytes(
  image: string | Uint8Array | Buffer | ArrayBuffer,
): Uint8Array {
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

// Fraction of the font size (em) that the visible glyphs actually reach above
// the baseline. pdf.js reports the full em as height, so without this the QR
// would float ~20% of the font size above the text regardless of offsetAbove.
const ASCENT_RATIO = 0.8;

/**
 * Stamp a PDF with a QR code positioned above the anchor text.
 *
 * - If the anchor text is found, the QR is placed a few points above every
 *   occurrence, left-aligned with the start of the anchor text run.
 * - If the anchor text is not found anywhere, the QR is stamped in the
 *   bottom-right (or bottom-left) corner of every page.
 *
 * An optional footer is drawn on every page.
 *
 * @returns The stamped PDF bytes (and written to `options.output` if set).
 */
export async function stampPdf(options: StampOptions): Promise<Uint8Array> {
  const bytes = toBytes(options.pdf);
  const anchor = (options.anchorText ?? DEFAULT_ANCHOR).trim();
  const qrOpts: QROptions = options.qr;
  const qrSize = qrOpts.size ?? 90;
  const offsetAbove = qrOpts.offsetAbove ?? 0;

  const boxes = await findTextBoxes(bytes, anchor);
  const hasMatches = boxes.length > 0;

  const pdfDoc = await PDFDocument.load(bytes);
  const qrImage: PDFImage = await pdfDoc.embedPng(
    await generateQrPng(
      qrOpts.text,
      qrOpts.errorCorrectionLevel ?? 'H',
      qrOpts.margin ?? 1,
    ),
  );

  let centerImage: PDFImage | null = null;
  if (qrOpts.image) {
    const imgBytes = loadImageBytes(qrOpts.image);
    if (isPng(imgBytes)) centerImage = await pdfDoc.embedPng(imgBytes);
    else if (isJpg(imgBytes)) centerImage = await pdfDoc.embedJpg(imgBytes);
    else throw new Error('Center image must be a PNG or JPG.');
  }

  const pages = pdfDoc.getPages();

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();

    const drawAt = (x: number, y: number) => {
      page.drawImage(qrImage, { x, y, width: qrSize, height: qrSize });
      if (centerImage) {
        const ratio = qrOpts.imageRatio ?? 0.22;
        const cw = qrSize * ratio;
        const ch = qrSize * ratio;
        const cx = x + (qrSize - cw) / 2;
        const cy = y + (qrSize - ch) / 2;
        const pad = qrOpts.imagePadding ?? 3;
        // White backing keeps the logo from destroying QR modules.
        page.drawRectangle({
          x: cx - pad,
          y: cy - pad,
          width: cw + pad * 2,
          height: ch + pad * 2,
          color: rgb(1, 1, 1),
        });
        page.drawImage(centerImage!, { x: cx, y: cy, width: cw, height: ch });
      }
    };

    const pageBoxes = boxes.filter((b) => b.pageIndex === i);

    if (!hasMatches) {
      if (options.fallback && options.fallback !== 'none') {
        const margin = 8;
        const fx =
          options.fallback === 'bottom-left' ? margin : width - qrSize - margin;
        drawAt(fx, margin);
      }
    } else if (pageBoxes.length > 0) {
      for (const b of pageBoxes) {
        const textTop = b.y + b.height * ASCENT_RATIO;
        // Align the QR's left edge with the start (left) of the anchor text.
        drawAt(b.x, textTop + offsetAbove);
      }
    } else if (options.fallbackUnmatchedPages && options.fallback && options.fallback !== 'none') {
      const margin = 8;
      const fx =
        options.fallback === 'bottom-left' ? margin : width - qrSize - margin;
      drawAt(fx, margin);
    }
  }

  if (options.footerBuilder && options.footerBuilder instanceof FooterBuilder) {
    await options.footerBuilder.render(pdfDoc);
  } else if (options.footer) {
    await drawFooter(pdfDoc, options.footer);
  }

  const out = await pdfDoc.save();
  if (options.output) writeFileSync(options.output, out);
  return out;
}
