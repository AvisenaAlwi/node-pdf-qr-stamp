export { stampPdf } from './stamp.js';
export { findTextBoxes } from './findText.js';
export { generateQrPng } from './qr.js';
export { drawFooter } from './footer.js';
export {
  FooterBuilder,
  type FooterTextOptions,
  type FooterImageOptions,
  type FooterTextItem,
  type FooterImageItem,
  type FooterItem,
} from './footerBuilder.js';
export type {
  StampOptions,
  QROptions,
  FooterOptions,
  TextBox,
  FallbackPosition,
  ErrorCorrectionLevel,
} from './types.js';
