import { createRequire } from 'module';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { TextBox } from './types.js';

// In CJS builds `require` is available at runtime; in ESM builds we create a
// require from the current module URL so we can resolve the worker file.
declare const require: NodeRequire | undefined;

function resolveWorkerPath(): string {
  if (typeof require !== 'undefined' && typeof require.resolve === 'function') {
    return require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
  }
  // In ESM builds tsup's --shims injects __filename from import.meta.url.
  // @ts-ignore __filename is provided by the bundler shim
  return createRequire(__filename).resolve(
    'pdfjs-dist/legacy/build/pdf.worker.mjs',
  );
}

// pdf.js needs a worker; resolve it from the installed package.
pdfjs.GlobalWorkerOptions.workerSrc = 'file://' + resolveWorkerPath();

interface RawTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

/**
 * Find every occurrence of `target` in the PDF and return its bounding box
 * on the correct page. Text that is split across multiple PDF "items" on the
 * same line is re-assembled first, so the anchor can span word boundaries.
 */
export async function findTextBoxes(
  data: Uint8Array,
  target: string,
): Promise<TextBox[]> {
  const norm = target.trim().toLowerCase();
  if (!norm) return [];

  // pdf.js may transfer (detach) the buffer to its worker, so operate on a copy
  // to avoid detaching the caller's original bytes.
  const pdf = await pdfjs.getDocument({ data: data.slice(), verbosity: 0 }).promise;
  const results: TextBox[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const items = content.items as unknown as RawTextItem[];

    // Group items into visual lines by their baseline (y of the transform).
    const lines = new Map<number, RawTextItem[]>();
    for (const it of items) {
      if (!it.str) continue;
      const baseline = Math.round(it.transform[5]);
      const group = lines.get(baseline);
      if (group) group.push(it);
      else lines.set(baseline, [it]);
    }

    for (const [, lineItems] of lines) {
      // Items on a line are usually already ordered, but sort to be safe.
      lineItems.sort((a, b) => a.transform[4] - b.transform[4]);

      // Expand each item into per-character boxes so we can map a substring
      // to an exact x-range. Width is distributed evenly across the chars.
      const chars: { ch: string; x: number; w: number; y: number; h: number }[] =
        [];
      for (const it of lineItems) {
        const x0 = it.transform[4];
        const y0 = it.transform[5];
        const h = it.height || Math.abs(it.transform[3]);
        const len = it.str.length;
        const cw = len ? it.width / len : 0;
        for (let k = 0; k < len; k++) {
          chars.push({ ch: it.str[k], x: x0 + k * cw, w: cw, y: y0, h });
        }
      }

      const text = chars.map((c) => c.ch).join('');
      const lower = text.toLowerCase();

      let from = 0;
      let idx = lower.indexOf(norm, from);
      while (idx !== -1) {
        const start = chars[idx];
        const end = chars[idx + norm.length - 1];
        results.push({
          pageIndex: pageNum - 1,
          x: start.x,
          y: start.y,
          width: end.x + end.w - start.x,
          height: start.h,
        });
        from = idx + norm.length;
        idx = lower.indexOf(norm, from);
      }
    }
  }

  return results;
}
