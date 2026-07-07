import {
  PDFPage,
  PDFFont,
  PDFDict,
  PDFName,
  PDFString,
  rgb,
  RGB,
} from 'pdf-lib';

const URL_REGEX = /https?:\/\/[^\s]+/g;

export interface DrawTextWithLinksOptions {
  font: PDFFont;
  size: number;
  color: RGB;
  /**
   * Optional color used for link text. Default blue to make links recognizable.
   */
  linkColor?: RGB;
}

/**
 * Draw text on a page and automatically add clickable link annotations for any
 * URLs found inside the text. The text is drawn as consecutive segments so that
 * each URL can be surrounded by its own annotation rectangle.
 */
export function drawTextWithLinks(
  page: PDFPage,
  text: string,
  startX: number,
  baselineY: number,
  options: DrawTextWithLinksOptions,
): void {
  const { font, size, color, linkColor = rgb(0, 0, 0.8) } = options;
  const tokens = text.split(URL_REGEX);
  const urls = text.match(URL_REGEX) ?? [];

  let x = startX;
  const pdfDoc = page.doc;
  const existingAnnots = page.node.Annots();
  const annots: PDFDict[] = existingAnnots
    ? existingAnnots.asArray().filter((a): a is PDFDict => a instanceof PDFDict)
    : [];

  for (let i = 0; i < tokens.length; i++) {
    const plain = tokens[i];
    if (plain) {
      page.drawText(plain, {
        x,
        y: baselineY,
        size,
        font,
        color,
      });
      x += font.widthOfTextAtSize(plain, size);
    }

    const url = urls[i];
    if (url) {
      const width = font.widthOfTextAtSize(url, size);
      page.drawText(url, {
        x,
        y: baselineY,
        size,
        font,
        color: linkColor,
      });

      // Underline the link to make it visually identifiable.
      const underlineY = baselineY - 1;
      page.drawLine({
        start: { x, y: underlineY },
        end: { x: x + width, y: underlineY },
        thickness: 0.5,
        color: linkColor,
      });

      const action = PDFDict.withContext(pdfDoc.context);
      action.set(PDFName.of('Type'), PDFName.of('Action'));
      action.set(PDFName.of('S'), PDFName.of('URI'));
      action.set(PDFName.of('URI'), PDFString.of(url));

      const linkAnnotation = PDFDict.withContext(pdfDoc.context);
      linkAnnotation.set(PDFName.of('Type'), PDFName.of('Annot'));
      linkAnnotation.set(PDFName.of('Subtype'), PDFName.of('Link'));
      linkAnnotation.set(
        PDFName.of('Rect'),
        pdfDoc.context.obj([
          x,
          baselineY - 2,
          x + width,
          baselineY + size,
        ]),
      );
      linkAnnotation.set(PDFName.of('Border'), pdfDoc.context.obj([0, 0, 0]));
      linkAnnotation.set(PDFName.of('A'), action);
      annots.push(linkAnnotation);
      x += width;
    }
  }

  if (annots.length) {
    page.node.set(PDFName.of('Annots'), pdfDoc.context.obj(annots));
  }
}
