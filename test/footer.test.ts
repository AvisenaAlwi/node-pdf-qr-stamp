import { describe, it, expect } from 'vitest';
import { stampPdf, FooterBuilder } from '../src/index.js';
import { createPdf, assertValidPdf, extractTextContent, PNG_BYTES, UNKNOWN_IMAGE_BYTES } from './helpers.js';

describe('simple footer', () => {
  it('draws left, center, and right text', async () => {
    const pdf = await createPdf({
      anchors: [{ text: 'ditandatangani secara elektronik', x: 100, y: 700 }],
    });
    const out = await stampPdf({
      pdf,
      qr: { text: 'x' },
      footer: {
        left: 'Left text',
        center: 'Center text',
        right: 'Right text',
      },
    });
    await assertValidPdf(out);
    const pages = await extractTextContent(out);
    expect(pages[0].text).toContain('Left text');
    expect(pages[0].text).toContain('Center text');
    expect(pages[0].text).toContain('Right text');
  });

  it('expands {page} and {total} tokens', async () => {
    const pdf = await createPdf({
      pages: [
        { anchors: [{ text: 'anchor', x: 100, y: 700 }] },
        { anchors: [{ text: 'anchor', x: 100, y: 700 }] },
      ],
    });
    const out = await stampPdf({
      pdf,
      qr: { text: 'x' },
      footer: { center: 'Page {page} of {total}' },
    });
    const pages = await extractTextContent(out);
    expect(pages[0].text).toContain('Page 1 of 2');
    expect(pages[1].text).toContain('Page 2 of 2');
  });

  it('appends page number when pageNumber is true', async () => {
    const pdf = await createPdf({
      anchors: [{ text: 'anchor', x: 100, y: 700 }],
    });
    const out = await stampPdf({
      pdf,
      qr: { text: 'x' },
      footer: { left: 'Doc', pageNumber: true },
    });
    const pages = await extractTextContent(out);
    expect(pages[0].text).toContain('Halaman 1 / 1');
  });

  it('wraps long footer text instead of overflowing', async () => {
    const longText =
      'This is a very long footer text that should definitely exceed the width of a single column and therefore must be wrapped into multiple lines.';
    const pdf = await createPdf({
      anchors: [{ text: 'anchor', x: 100, y: 700 }],
    });
    const out = await stampPdf({
      pdf,
      qr: { text: 'x' },
      footer: { left: longText, fontSize: 10 },
    });
    await assertValidPdf(out);
    const pages = await extractTextContent(out);
    expect(pages[0].text).toContain('This is a very long footer text');
  });
});

describe('FooterBuilder', () => {
  it('draws text and images in all three columns', async () => {
    const pdf = await createPdf({
      anchors: [{ text: 'anchor', x: 100, y: 700 }],
    });
    const footer = new FooterBuilder()
      .fontSize(8)
      .margin(4)
      .leftText('Left', { bold: true })
      .centerImage(PNG_BYTES, { height: 16 })
      .rightText('Right');

    const out = await stampPdf({ pdf, qr: { text: 'x' }, footerBuilder: footer });
    await assertValidPdf(out);
  });

  it('uses maxWidth: page for a single full-width text item', async () => {
    const pdf = await createPdf({
      anchors: [{ text: 'anchor', x: 100, y: 700 }],
    });
    const footer = new FooterBuilder()
      .fontSize(8)
      .centerText('This is a long centered footer text that should span most of the page width when maxWidth is set to page.', {
        maxWidth: 'page',
      });

    const out = await stampPdf({ pdf, qr: { text: 'x' }, footerBuilder: footer });
    await assertValidPdf(out);
  });

  it('uses maxWidth: remaining when an image shares the column', async () => {
    const pdf = await createPdf({
      anchors: [{ text: 'anchor', x: 100, y: 700 }],
    });
    const footer = new FooterBuilder()
      .fontSize(8)
      .margin(4)
      .leftImage(PNG_BYTES, { height: 16 })
      .leftText(
        'This long text should fill the remaining space in the left column after the logo without overflowing into other columns.',
        { maxWidth: 'remaining' },
      );

    const out = await stampPdf({ pdf, qr: { text: 'x' }, footerBuilder: footer });
    await assertValidPdf(out);
  });

  it('applies per-item colors and bold styling', async () => {
    const pdf = await createPdf({
      anchors: [{ text: 'anchor', x: 100, y: 700 }],
    });
    const footer = new FooterBuilder()
      .fontSize(8)
      .leftText('Bold text', { bold: true })
      .rightText('Colored text', { color: [0.8, 0.2, 0.2] });

    const out = await stampPdf({ pdf, qr: { text: 'x' }, footerBuilder: footer });
    await assertValidPdf(out);
  });

  it('throws for unsupported footer image format', async () => {
    const pdf = await createPdf({
      anchors: [{ text: 'anchor', x: 100, y: 700 }],
    });
    const footer = new FooterBuilder().centerImage(UNKNOWN_IMAGE_BYTES, { height: 16 });

    await expect(
      stampPdf({ pdf, qr: { text: 'x' }, footerBuilder: footer }),
    ).rejects.toThrow('Footer image must be a PNG or JPG');
  });
});
