import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { PDFDocument } from 'pdf-lib';
import { stampPdf } from '../src/index.js';
import { createPdf, assertValidPdf, PNG_BYTES, JPG_BYTES, UNKNOWN_IMAGE_BYTES } from './helpers.js';

describe('stampPdf', () => {
  it('stamps a QR above the anchor text', async () => {
    const pdf = await createPdf({
      anchors: [{ text: 'ditandatangani secara elektronik', x: 100, y: 700 }],
    });
    const out = await stampPdf({
      pdf,
      qr: { text: 'https://verify.example.com/1' },
    });
    expect(out.length).toBeGreaterThan(pdf.length);
    await assertValidPdf(out);
  });

  it('uses default anchor text when not provided', async () => {
    const pdf = await createPdf({
      anchors: [{ text: 'ditandatangani secara elektronik', x: 100, y: 700 }],
    });
    const out = await stampPdf({
      pdf,
      qr: { text: 'https://verify.example.com/2' },
    });
    await assertValidPdf(out);
  });

  it('stamps fallback QR when anchor is missing', async () => {
    const pdf = await createPdf({
      anchors: [{ text: 'no anchor here', x: 100, y: 700 }],
    });
    const out = await stampPdf({
      pdf,
      qr: { text: 'https://verify.example.com/3' },
      anchorText: 'missing text',
      fallback: 'bottom-right',
    });
    await assertValidPdf(out);
  });

  it('does not stamp QR when fallback is none and anchor is missing', async () => {
    const pdf = await createPdf({
      anchors: [{ text: 'no anchor here', x: 100, y: 700 }],
    });
    const out = await stampPdf({
      pdf,
      qr: { text: 'https://verify.example.com/4' },
      anchorText: 'missing text',
      fallback: 'none',
    });
    await assertValidPdf(out);
    // Output should still be valid and roughly similar size (no QR image).
    expect(out.length).toBeGreaterThan(0);
  });

  it('stamps QR above every anchor occurrence', async () => {
    const pdf = await createPdf({
      anchors: [
        { text: 'ditandatangani secara elektronik', x: 100, y: 700 },
        { text: 'ditandatangani secara elektronik', x: 250, y: 300 },
      ],
    });
    const out = await stampPdf({
      pdf,
      qr: { text: 'https://verify.example.com/5' },
    });
    await assertValidPdf(out);
  });

  it('draws a black placeholder box when preview is enabled', async () => {
    const pdf = await createPdf({
      anchors: [{ text: 'ditandatangani secara elektronik', x: 100, y: 700 }],
    });
    const out = await stampPdf({
      pdf,
      qr: { size: 80 },
      preview: true,
    });
    await assertValidPdf(out);
    // Preview output should be smaller because no QR image is embedded.
    const normal = await stampPdf({
      pdf,
      qr: { text: 'https://verify.example.com/preview', size: 80 },
    });
    expect(out.length).toBeLessThan(normal.length);
  });

  it('draws a black placeholder box at fallback position in preview mode', async () => {
    const pdf = await createPdf({
      anchors: [{ text: 'no anchor here', x: 100, y: 700 }],
    });
    const out = await stampPdf({
      pdf,
      qr: { size: 80 },
      anchorText: 'missing text',
      fallback: 'bottom-right',
      preview: true,
    });
    await assertValidPdf(out);
  });

  it('handles multi-page PDFs', async () => {
    const pdf = await createPdf({
      pages: [
        { anchors: [{ text: 'ditandatangani secara elektronik', x: 100, y: 700 }] },
        { anchors: [{ text: 'no anchor here', x: 100, y: 700 }] },
      ],
    });
    const out = await stampPdf({
      pdf,
      qr: { text: 'https://verify.example.com/6' },
      fallback: 'bottom-right',
    });
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(2);
  });

  it('accepts a PNG center logo from bytes', async () => {
    const pdf = await createPdf({
      anchors: [{ text: 'ditandatangani secara elektronik', x: 100, y: 700 }],
    });
    const out = await stampPdf({
      pdf,
      qr: { text: 'https://verify.example.com/7', image: PNG_BYTES },
    });
    await assertValidPdf(out);
  });

  it('accepts a JPG center logo from bytes', async () => {
    const pdf = await createPdf({
      anchors: [{ text: 'ditandatangani secara elektronik', x: 100, y: 700 }],
    });
    const out = await stampPdf({
      pdf,
      qr: { text: 'https://verify.example.com/8', image: JPG_BYTES },
    });
    await assertValidPdf(out);
  });

  it('accepts PDF from a file path', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'pdf-qr-stamp-'));
    const path = join(tmp, 'input.pdf');
    const pdf = await createPdf({
      anchors: [{ text: 'ditandatangani secara elektronik', x: 100, y: 700 }],
    });
    writeFileSync(path, pdf);
    const out = await stampPdf({
      pdf: path,
      qr: { text: 'https://verify.example.com/9' },
    });
    await assertValidPdf(out);
    rmSync(tmp, { recursive: true });
  });

  it('accepts PDF from an ArrayBuffer', async () => {
    const pdf = await createPdf({
      anchors: [{ text: 'ditandatangani secara elektronik', x: 100, y: 700 }],
    });
    const ab = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength);
    const out = await stampPdf({
      pdf: ab,
      qr: { text: 'https://verify.example.com/10' },
    });
    await assertValidPdf(out);
  });

  it('accepts PDF from a Buffer', async () => {
    const pdf = await createPdf({
      anchors: [{ text: 'ditandatangani secara elektronik', x: 100, y: 700 }],
    });
    const out = await stampPdf({
      pdf: Buffer.from(pdf),
      qr: { text: 'https://verify.example.com/11' },
    });
    await assertValidPdf(out);
  });

  it('writes output to a file path when provided', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'pdf-qr-stamp-'));
    const outputPath = join(tmp, 'output.pdf');
    const pdf = await createPdf({
      anchors: [{ text: 'ditandatangani secara elektronik', x: 100, y: 700 }],
    });
    await stampPdf({
      pdf,
      qr: { text: 'https://verify.example.com/12' },
      output: outputPath,
    });
    const written = readFileSync(outputPath);
    expect(written.length).toBeGreaterThan(0);
    await assertValidPdf(written);
    rmSync(tmp, { recursive: true });
  });
});

describe('stampPdf error handling', () => {
  it('throws for unsupported center image format', async () => {
    const pdf = await createPdf({
      anchors: [{ text: 'ditandatangani secara elektronik', x: 100, y: 700 }],
    });
    await expect(
      stampPdf({
        pdf,
        qr: { text: 'x', image: UNKNOWN_IMAGE_BYTES },
      }),
    ).rejects.toThrow('Center image must be a PNG or JPG');
  });

  it('throws for invalid PDF bytes', async () => {
    await expect(
      stampPdf({
        pdf: new Uint8Array([1, 2, 3]),
        qr: { text: 'x' },
      }),
    ).rejects.toThrow();
  });

  it('throws when PDF file path does not exist', async () => {
    await expect(
      stampPdf({
        pdf: '/non/existent/file.pdf',
        qr: { text: 'x' },
      }),
    ).rejects.toThrow();
  });
});
