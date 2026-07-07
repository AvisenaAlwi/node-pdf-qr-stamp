import { PDFDocument, StandardFonts, PDFPage } from 'pdf-lib';

/**
 * Minimal 1x1 black PNG bytes (used as a stand-in logo in tests).
 */
export const PNG_BYTES = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNgYGAAAAAEAAH2FzhVAAAAAElFTkSuQmCC',
    'base64',
  ),
);

/**
 * Minimal valid JPEG bytes (1x1 pixel).
 */
export const JPG_BYTES = Uint8Array.from(
  Buffer.from(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAwEPwAB//9k=',
    'base64',
  ),
);

/**
 * Bytes that are neither PNG nor JPEG (used for negative image tests).
 */
export const UNKNOWN_IMAGE_BYTES = Uint8Array.from([0x00, 0x01, 0x02, 0x03]);

export interface AnchorSpec {
  text: string;
  x: number;
  y: number;
  size?: number;
}

export interface CreatePdfOptions {
  anchors?: AnchorSpec[];
  pages?: { anchors?: AnchorSpec[]; otherText?: string }[];
  pageSize?: [number, number];
}

/**
 * Create a simple in-memory PDF for testing.
 */
export async function createPdf(options: CreatePdfOptions = {}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pageSize = options.pageSize ?? [595, 842];

  const pageDefs = options.pages ?? [{ anchors: options.anchors ?? [] }];
  if (pageDefs.length === 0) {
    pageDefs.push({ anchors: [] });
  }

  for (const def of pageDefs) {
    const page = doc.addPage(pageSize);
    if (def.otherText) {
      page.drawText(def.otherText, { x: 50, y: 700, size: 12, font });
    }
    for (const anchor of def.anchors ?? []) {
      page.drawText(anchor.text, {
        x: anchor.x,
        y: anchor.y,
        size: anchor.size ?? 12,
        font,
      });
    }
  }

  return doc.save();
}

/**
 * Assert that a byte array is a valid PDF by loading it with pdf-lib.
 */
export async function assertValidPdf(bytes: Uint8Array): Promise<void> {
  const doc = await PDFDocument.load(bytes);
  expect(doc.getPageCount()).toBeGreaterThan(0);
}

/**
 * Helper to extract text from a PDF (used to verify footer content in tests).
 */
export async function extractTextContent(
  bytes: Uint8Array,
): Promise<{ pageIndex: number; text: string }[]> {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  const result: { pageIndex: number; text: string }[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it: any) => it.str).join('');
    result.push({ pageIndex: i - 1, text });
  }
  return result;
}
