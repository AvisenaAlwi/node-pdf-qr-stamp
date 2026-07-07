/**
 * Shared types for the pdf-qr-stamp library.
 */

import type { FooterBuilder } from './footerBuilder.js';

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export type FallbackPosition = 'bottom-right' | 'bottom-left' | 'none';

/** Options for the QR code that is stamped onto the PDF. */
export interface QROptions {
  /** The text/URL encoded by the QR code. */
  text: string;
  /** Optional logo drawn in the center of the QR code (PNG/JPG path or bytes). */
  image?: string | Uint8Array | Buffer | ArrayBuffer;
  /** Rendered size of the QR code in PDF points (1pt ≈ 0.353mm). Default 90. */
  size?: number;
  /** Distance (in points) between the bottom of the QR and the top of the anchor text. Default 6. */
  offsetAbove?: number;
  /** QR error correction level. Default 'H' (required when a center image is used). */
  errorCorrectionLevel?: ErrorCorrectionLevel;
  /** Quiet-zone margin (in modules) used when rendering the QR. Default 1. */
  margin?: number;
  /** Size of the center image relative to the QR (0..1). Default 0.22. */
  imageRatio?: number;
  /** White padding around the center image (in points) for scannability. Default 3. */
  imagePadding?: number;
}

/** Options for the thin footer drawn on every page. */
export interface FooterOptions {
  /** Left-aligned text. Supports {page} and {total} tokens. */
  left?: string;
  /** Center-aligned text. Supports {page} and {total} tokens. */
  center?: string;
  /** Right-aligned text. Supports {page} and {total} tokens. */
  right?: string;
  /** Font size in points. Default 8. */
  fontSize?: number;
  /** Distance from the bottom paper edge in points (thin margin). Default 4. */
  margin?: number;
  /** Footer text color as RGB 0..1. Default dark grey [0.3, 0.3, 0.3]. */
  color?: [number, number, number];
  /** When true, append "Halaman {page} / {total}" on the right side. Default false. */
  pageNumber?: boolean;
}

/** Main options accepted by {@link stampPdf}. */
export interface StampOptions {
  /** PDF as a file path, Buffer, Uint8Array or ArrayBuffer. */
  pdf: string | Uint8Array | ArrayBuffer;
  /** QR code configuration. */
  qr: QROptions;
  /** Text used as the anchor. Default 'ditandatangani secara elektronik'. */
  anchorText?: string;
  /**
   * Where to stamp the QR when the anchor text is not found anywhere.
   * Default 'bottom-right'. Use 'none' to skip stamping entirely.
   */
  fallback?: FallbackPosition;
  /**
   * When the anchor is found on some pages, also stamp the fallback position
   * on the pages where it was not found. Default false.
   */
  fallbackUnmatchedPages?: boolean;
  /** Text footer configuration, or `false` to disable. Default false (disabled). */
  footer?: FooterOptions | false;
  /** Custom footer builder (composition of text + images, left/center/right). */
  footerBuilder?: FooterBuilder | false;
  /** If set, the result is also written to this file path. */
  output?: string;
}

/** A bounding box of found anchor text on a specific page. */
export interface TextBox {
  /** Zero-based page index. */
  pageIndex: number;
  /** Left x of the text (PDF coordinate space, origin bottom-left). */
  x: number;
  /** Baseline y of the text. */
  y: number;
  /** Width of the matched text run. */
  width: number;
  /** Height (font size) of the matched text run. */
  height: number;
}
