/**
 * Usage examples for pdf-qr-stamp covering various cases.
 * Run with: `npx tsx examples/cases.ts`
 */
import { writeFileSync, readFileSync } from 'fs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { stampPdf, FooterBuilder } from '../src/index.js';

// ---------- helper: create a sample PDF in memory ----------
async function makePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  // Page 1: two anchor texts (different sizes and positions)
  const p1 = doc.addPage([595, 842]); // A4
  p1.drawText('Ditandatangani secara elektronik', {
    x: 80, y: 720, size: 12, font,
  });
  p1.drawText('Another paragraph on this page.', { x: 80, y: 680, size: 12, font });
  p1.drawText('ditandatangani secara elektronik', {
    x: 300, y: 300, size: 11, font,
  });

  // Page 2: NO anchor text
  const p2 = doc.addPage([595, 842]);
  p2.drawText('This page has no signature text.', {
    x: 80, y: 700, size: 12, font,
  });

  return doc.save();
}

// 1x1 black PNG used as a sample center logo (replace with your own logo file)
const LOGO_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNgYGAAAAAEAAH2FzhVAAAAAElFTkSuQmCC';
const LOGO = Uint8Array.from(Buffer.from(LOGO_B64, 'base64'));

// ============================================================
// CASE 1: Basic — QR placed above the anchor text
// ============================================================
async function case1(pdf: Uint8Array) {
  const out = await stampPdf({
    pdf,
    qr: { text: 'https://verify.example.com/doc/ABC123' },
    anchorText: 'ditandatangani secara elektronik',
  });
  writeFileSync('examples/out/case1-basic.pdf', out);
  console.log('case1: QR above anchor text -> examples/out/case1-basic.pdf');
}

// ============================================================
// CASE 2: Anchor text not found -> fallback bottom-right on every page
// ============================================================
async function case2(pdf: Uint8Array) {
  const out = await stampPdf({
    pdf,
    qr: { text: 'https://verify.example.com/doc/XYZ' },
    anchorText: 'text that does not exist', // will never be found
    fallback: 'bottom-right',
  });
  writeFileSync('examples/out/case2-fallback.pdf', out);
  console.log('case2: fallback bottom-right every page -> examples/out/case2-fallback.pdf');
}

// ============================================================
// CASE 3: Multiple occurrences -> stamp above ALL of them
// (page 1 has 2 occurrences, both get a QR)
// ============================================================
async function case3(pdf: Uint8Array) {
  const out = await stampPdf({
    pdf,
    qr: { text: 'https://verify.example.com/doc/MULTI', size: 80 },
    anchorText: 'ditandatangani secara elektronik',
  });
  writeFileSync('examples/out/case3-multiple.pdf', out);
  console.log('case3: all occurrences get QR -> examples/out/case3-multiple.pdf');
}

// ============================================================
// CASE 4: QR with a center logo/image
// ============================================================
async function case4(pdf: Uint8Array) {
  const out = await stampPdf({
    pdf,
    qr: {
      text: 'https://verify.example.com/doc/LOGO',
      image: LOGO,          // accepts path, Uint8Array, Buffer, or ArrayBuffer
      imageRatio: 0.22,     // logo is 22% of the QR size
      imagePadding: 3,      // white padding to keep the QR scannable
    },
    anchorText: 'ditandatangani secara elektronik',
  });
  writeFileSync('examples/out/case4-logo.pdf', out);
  console.log('case4: QR + center logo -> examples/out/case4-logo.pdf');
}

// ============================================================
// CASE 4b: Center logo from Buffer and ArrayBuffer (not just path/Uint8Array)
// ============================================================
async function case4b(pdf: Uint8Array) {
  const fromBuffer = Buffer.from(LOGO);                 // Node Buffer
  const ab = LOGO.buffer.slice(LOGO.byteOffset, LOGO.byteOffset + LOGO.byteLength);
  const fromArrayBuffer = ab as ArrayBuffer;

  const out = await stampPdf({
    pdf,
    qr: {
      text: 'https://verify.example.com/doc/LOGO-BUF',
      image: fromBuffer,
      imageRatio: 0.22,
    },
    anchorText: 'ditandatangani secara elektronik',
  });
  writeFileSync('examples/out/case4b-logo-buffer.pdf', out);
  console.log('case4b: logo from Buffer -> examples/out/case4b-logo-buffer.pdf');

  // ArrayBuffer is also supported (just verify it does not throw)
  await stampPdf({
    pdf,
    qr: { text: 'x', image: fromArrayBuffer },
    anchorText: 'ditandatangani secara elektronik',
  });
  console.log('case4b: logo from ArrayBuffer -> OK (no throw)');
}

// ============================================================
// CASE 5: Footer only, no QR (fallback 'none')
// ============================================================
async function case5(pdf: Uint8Array) {
  const out = await stampPdf({
    pdf,
    qr: { text: 'https://verify.example.com/x' },
    anchorText: 'text that does not exist',
    fallback: 'none',
    footer: {
      left: 'PT Contoh Indonesia',
      center: 'Official Document',
      right: 'Confidential',
      pageNumber: true, // appends "Halaman X / Y" on the right
    },
  });
  writeFileSync('examples/out/case5-footer-only.pdf', out);
  console.log('case5: footer only -> examples/out/case5-footer-only.pdf');
}

// ============================================================
// CASE 6: QR + full footer + bottom-left fallback
// ============================================================
async function case6(pdf: Uint8Array) {
  const out = await stampPdf({
    pdf,
    qr: { text: 'https://verify.example.com/doc/FULL', size: 95, offsetAbove: 8 },
    anchorText: 'ditandatangani secara elektronik',
    fallback: 'bottom-left',
    footer: {
      left: 'Ditandatangani secara elektronik',
      center: '{page} / {total}',
      right: 'verify.example.com',
      fontSize: 8,
      margin: 4,
      color: [0.2, 0.2, 0.2],
      pageNumber: false,
    },
    output: 'examples/out/case6-full.pdf',
  });
  writeFileSync('examples/out/case6-full.pdf', out);
  console.log('case6: QR + footer + bottom-left fallback -> examples/out/case6-full.pdf');
}

// ============================================================
// CASE 7: Inputs from various sources (path / Buffer / ArrayBuffer)
// ============================================================
async function case7() {
  // from file path
  writeFileSync('examples/out/sample.pdf', await makePdf());
  await stampPdf({
    pdf: 'examples/out/sample.pdf',
    qr: { text: 'https://verify.example.com/from-path' },
  });

  // from Buffer
  const buf = readFileSync('examples/out/sample.pdf');
  await stampPdf({ pdf: buf, qr: { text: 'https://verify.example.com/from-buffer' } });

  // from ArrayBuffer
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const out = await stampPdf({
    pdf: ab,
    qr: { text: 'https://verify.example.com/from-arraybuffer' },
    anchorText: 'ditandatangani secara elektronik',
  });
  writeFileSync('examples/out/case7-inputs.pdf', out);
  console.log('case7: path/Buffer/ArrayBuffer -> examples/out/case7-inputs.pdf');
}

// ============================================================
// CASE 8: Footer builder — compose yourself (text + image)
// ============================================================
async function case8(pdf: Uint8Array) {
  const footer = new FooterBuilder()
    .fontSize(8)
    .margin(4)
    .leftImage(LOGO, { height: 16 })
    .leftText('Dokumen ini telah ditandatangani menggunakan sertifikat elektronik yang diterbitkan oleh Balai Besar Sertifikasi Elektronik (BSrE), BSSN. Untuk memastikan keaslian tanda tangan elektronik, silakan pindai QR Code pada laman https://satu.kemenkeu.go.id atau unggah dokumen pada laman https://tte.komdigi.go.id/verifyPDF', { maxWidth: 'remaining' })
    // .centerImage(LOGO, { height: 16 })
    // .rightText('Halaman {page} / {total}', { color: [0.2, 0.2, 0.2] });

  const out = await stampPdf({
    pdf,
    qr: { text: 'https://verify.example.com/doc/BUILDER' },
    anchorText: 'ditandatangani secara elektronik',
    footerBuilder: footer,
  });
  writeFileSync('examples/out/case8-builder.pdf', out);
  console.log('case8: footer builder (text + image) -> examples/out/case8-builder.pdf');
}

// ============================================================
// CASE 9: Long footer text — automatically wraps to new lines
// ============================================================
async function case9(pdf: Uint8Array) {
  const longText =
    'Dokumen ini telah ditandatangani secara elektronik menggunakan sertifikat elektronik yang diterbitkan oleh Balai Besar Sertifikasi Elektronik (BSrE), BSSN. Untuk memastikan keaslian, silakan pindai QR Code.';

  const out = await stampPdf({
    pdf,
    qr: { text: 'https://verify.example.com/doc/LONGFOOTER' },
    anchorText: 'ditandatangani secara elektronik',
    footer: {
      left: longText,
      fontSize: 8,
      margin: 4,
    },
  });
  writeFileSync('examples/out/case9-long-footer.pdf', out);
  console.log('case9: long footer auto-wrap -> examples/out/case9-long-footer.pdf');
}

// ============================================================
// CASE 10: Footer builder with long text (auto-wrap)
// ============================================================
async function case10(pdf: Uint8Array) {
  const longText =
    'Dokumen ini telah ditandatangani secara elektronik menggunakan sertifikat elektronik yang diterbitkan oleh Balai Besar Sertifikasi Elektronik (BSrE), BSSN. Untuk memastikan keaslian, silakan pindai QR Code.';

  const footer = new FooterBuilder()
    .fontSize(8)
    .margin(4)
    // .leftText('BSrE', { bold: true })
    .leftText(longText, { maxWidth: 500 }) // manual width limit (optional)
    .rightText('Halaman {page} / {total}');

  const out = await stampPdf({
    pdf,
    qr: { text: 'https://verify.example.com/doc/BUILDER-LONG' },
    anchorText: 'ditandatangani secara elektronik',
    footerBuilder: footer,
  });
  writeFileSync('examples/out/case10-builder-long.pdf', out);
  console.log('case10: footer builder long text -> examples/out/case10-builder-long.pdf');
}

// ============================================================
// CASE 10b: Footer builder full page width (maxWidth: 'page')
// ============================================================
async function case10b(pdf: Uint8Array) {
  const longText =
    'Dokumen  ini  telah  ditandatangani  menggunakan  sertifikat  elektronik  yang  diterbitkan  oleh  Balai  Besar  Sertifikasi  Elektronik  (BSrE),  BSSN.  Untuk  memastikan  keaslian  tandatangan elektronik, silakan pindai QR Code pada laman https://satu.kemenkeu.go.id atau unggah dokumen pada laman https://tte.komdigi.go.id/verifyPDF';

  // Only center, using the full page width.
  const footer = new FooterBuilder()
    .fontSize(8)
    .margin(4)
    .leftImage(LOGO, { height: 16 })
    .leftText(longText, { maxWidth: 'page' });

  const out = await stampPdf({
    pdf,
    qr: { text: 'https://verify.example.com/doc/BUILDER-FULL' },
    anchorText: 'ditandatangani secara elektronik',
    footerBuilder: footer,
  });
  writeFileSync('examples/out/case10b-builder-fullwidth.pdf', out);
  console.log('case10b: footer builder full-width -> examples/out/case10b-builder-fullwidth.pdf');
}

// ============================================================
// CASE 11: Preview placeholder — black box instead of QR code
// ============================================================
async function case11(pdf: Uint8Array) {
  const out = await stampPdf({
    pdf,
    qr: { size: 90, offsetAbove: 6 },
    anchorText: 'ditandatangani secara elektronik',
    preview: true,
  });
  writeFileSync('examples/out/case11-preview.pdf', out);
  console.log('case11: preview placeholder -> examples/out/case11-preview.pdf');
}

// ============================================================
// CASE 12: Footer aware of bottom-right fallback QR
// ============================================================
async function case12(pdf: Uint8Array) {
  const footer = new FooterBuilder()
    .fontSize(8)
    .margin(4)
    .leftImage(LOGO, { height: 16 })
    .leftText(
      'This long centered footer text automatically wraps before reaching the bottom-right fallback QR code area, so the QR code remains fully visible.',
      { maxWidth: 'page' },
    );

  const out = await stampPdf({
    pdf,
    qr: { text: 'https://verify.example.com/doc/BR-FALLBACK', size: 80 },
    anchorText: 'text that does not exist',
    fallback: 'bottom-right',
    footerBuilder: footer,
  });
  writeFileSync('examples/out/case12-footer-aware-br.pdf', out);
  console.log('case12: footer aware bottom-right fallback QR -> examples/out/case12-footer-aware-br.pdf');
}

// ============================================================
// CASE 13: Footer aware of bottom-left no fallback QR
// ============================================================
async function case13(pdf: Uint8Array) {
  const footer = new FooterBuilder()
    .fontSize(8)
    .margin(4)
    .leftImage(LOGO, { height: 16 })
    .leftText(
      'This long centered footer text automatically wraps before reaching the bottom-left fallback QR code area, so the QR code remains fully visible. This long centered footer text automatically wraps before reaching the bottom-left fallback QR code area, so the QR code remains fully visible',
      { maxWidth: 'page' },
    );

  const out = await stampPdf({
    pdf,
    qr: { text: 'https://verify.example.com/doc/BL-FALLBACK', size: 80 },
    anchorText: 'ditandatangani',
    fallback: 'bottom-left',
    footerBuilder: footer,
  });
  writeFileSync('examples/out/case13-footer-aware-bl.pdf', out);
  console.log('case13: footer aware bottom-left fallback QR -> examples/out/case13-footer-aware-bl.pdf');
}

// ============================================================
// CASE 14: Footer with clickable URL link
// ============================================================
async function case14(pdf: Uint8Array) {
  const footer = new FooterBuilder()
    .fontSize(8)
    .margin(4)
    .centerText(
      'For verification, please visit https://verify.example.com/doc/LINK — the URL is clickable.',
    );

  const out = await stampPdf({
    pdf,
    qr: { text: 'https://verify.example.com/doc/LINK', size: 80 },
    anchorText: 'ditandatangani secara elektronik',
    footerBuilder: footer,
  });
  writeFileSync('examples/out/case14-footer-link.pdf', out);
  console.log('case14: footer with clickable URL -> examples/out/case14-footer-link.pdf');
}

async function main() {
  const pdf = await makePdf();
  await case1(pdf);
  await case2(pdf);
  await case3(pdf);
  await case4(pdf);
  await case4b(pdf);
  await case5(pdf);
  await case6(pdf);
  await case7();
  await case8(pdf);
  await case9(pdf);
  await case10(pdf);
  await case10b(pdf);
  await case11(pdf);
  await case12(pdf);
  await case13(pdf);
  await case14(pdf);
  console.log('\nALL CASES COMPLETE. See folder examples/out/');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
