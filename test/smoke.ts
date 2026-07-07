import { writeFileSync } from 'fs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { stampPdf, findTextBoxes } from '../src/index.js';

// 1x1 black PNG used as a stand-in center logo in the smoke test.
const LOGO_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNgYGAAAAAEAAH2FzhVAAAAAElFTkSuQmCC';
const LOGO = Uint8Array.from(Buffer.from(LOGO_B64, 'base64'));

async function makeSamplePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  // Page 1: anchor text appears twice.
  const p1 = doc.addPage([595, 842]);
  p1.drawText('Ditandatangani secara elektronik', {
    x: 80,
    y: 720,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  });
  p1.drawText('Some other paragraph on the page.', {
    x: 80,
    y: 680,
    size: 12,
    font,
  });
  p1.drawText('ditandatangani secara elektronik', {
    x: 300,
    y: 300,
    size: 11,
    font,
  });

  // Page 2: no anchor text at all.
  const p2 = doc.addPage([595, 842]);
  p2.drawText('This page has no signature text.', {
    x: 80,
    y: 700,
    size: 12,
    font,
  });

  return doc.save();
}

async function main() {
  const sample = await makeSamplePdf();

  // --- Test A: anchor found -> QR stamped above each occurrence. ---
  const boxes = await findTextBoxes(
    sample,
    'ditandatangani secara elektronik',
  );
  console.log(`[A] anchor found ${boxes.length} time(s) across pages:`, boxes);
  if (boxes.length !== 2) throw new Error('Expected 2 anchor occurrences');

  const outA = await stampPdf({
    pdf: sample,
    qr: {
      text: 'https://example.com/verify/ABC123',
      image: LOGO,
      size: 90,
      offsetAbove: 6,
    },
    anchorText: 'ditandatangani secara elektronik',
    fallback: 'bottom-right',
    footer: {
      left: 'Dokumen sah',
      center: 'Telah ditandatangani secara elektronik',
      right: 'Confidential',
      pageNumber: true,
    },
    output: '/tmp/sample-stamped.pdf',
  });
  writeFileSync('/tmp/sample-stamped.pdf', outA);
  console.log(`[A] wrote /tmp/sample-stamped.pdf (${outA.length} bytes)`);

  // --- Test B: anchor missing -> fallback bottom-right on every page. ---
  const outB = await stampPdf({
    pdf: sample,
    qr: { text: 'https://example.com/verify/XYZ', size: 80 },
    anchorText: 'teks yang tidak ada',
    fallback: 'bottom-right',
    footer: { left: 'Fallback mode', pageNumber: true },
    output: '/tmp/sample-fallback.pdf',
  });
  writeFileSync('/tmp/sample-fallback.pdf', outB);
  console.log(`[B] wrote /tmp/sample-fallback.pdf (${outB.length} bytes)`);

  if (outA.length < 1000 || outB.length < 1000) {
    throw new Error('Output PDF is suspiciously small');
  }
  console.log('SMOKE TEST OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
