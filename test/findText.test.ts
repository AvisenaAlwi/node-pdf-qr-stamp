import { describe, it, expect } from 'vitest';
import { findTextBoxes } from '../src/index.js';
import { createPdf } from './helpers.js';

describe('findTextBoxes', () => {
  it('returns empty array when target is empty', async () => {
    const pdf = await createPdf({ anchors: [{ text: 'anchor here', x: 100, y: 700 }] });
    const boxes = await findTextBoxes(pdf, '  ');
    expect(boxes).toEqual([]);
  });

  it('finds a single anchor occurrence', async () => {
    const pdf = await createPdf({
      anchors: [{ text: 'ditandatangani secara elektronik', x: 100, y: 700 }],
    });
    const boxes = await findTextBoxes(pdf, 'ditandatangani secara elektronik');
    expect(boxes).toHaveLength(1);
    expect(boxes[0].pageIndex).toBe(0);
    expect(boxes[0].x).toBeCloseTo(100, 0);
    expect(boxes[0].y).toBeCloseTo(700, 0);
    expect(boxes[0].height).toBeCloseTo(12, 0);
    expect(boxes[0].width).toBeGreaterThan(0);
  });

  it('is case-insensitive', async () => {
    const pdf = await createPdf({
      anchors: [{ text: 'Ditandatangani Secara Elektronik', x: 120, y: 650 }],
    });
    const boxes = await findTextBoxes(pdf, 'ditandatangani secara elektronik');
    expect(boxes).toHaveLength(1);
    expect(boxes[0].x).toBeCloseTo(120, 0);
  });

  it('finds multiple occurrences on the same page', async () => {
    const pdf = await createPdf({
      anchors: [
        { text: 'ditandatangani secara elektronik', x: 100, y: 700 },
        { text: 'ditandatangani secara elektronik', x: 250, y: 300, size: 11 },
      ],
    });
    const boxes = await findTextBoxes(pdf, 'ditandatangani secara elektronik');
    expect(boxes).toHaveLength(2);
    expect(boxes[0].x).toBeCloseTo(100, 0);
    expect(boxes[1].x).toBeCloseTo(250, 0);
  });

  it('finds anchors across multiple pages', async () => {
    const pdf = await createPdf({
      pages: [
        { anchors: [{ text: 'ditandatangani secara elektronik', x: 100, y: 700 }] },
        { anchors: [{ text: 'ditandatangani secara elektronik', x: 150, y: 700 }] },
      ],
    });
    const boxes = await findTextBoxes(pdf, 'ditandatangani secara elektronik');
    expect(boxes).toHaveLength(2);
    expect(boxes[0].pageIndex).toBe(0);
    expect(boxes[1].pageIndex).toBe(1);
  });

  it('returns empty array when anchor is not present', async () => {
    const pdf = await createPdf({
      anchors: [{ text: 'something else', x: 100, y: 700 }],
    });
    const boxes = await findTextBoxes(pdf, 'ditandatangani secara elektronik');
    expect(boxes).toEqual([]);
  });

  it('matches a substring that spans multiple pdf text items', async () => {
    // pdfjs may split words into separate items; ensure re-assembly works.
    const pdf = await createPdf({
      anchors: [{ text: 'signed electronically today', x: 100, y: 700 }],
    });
    const boxes = await findTextBoxes(pdf, 'electronically today');
    expect(boxes).toHaveLength(1);
  });
});
