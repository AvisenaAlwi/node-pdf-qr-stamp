import QRCode from 'qrcode';
import type { ErrorCorrectionLevel } from './types.js';

/**
 * Render a QR code to PNG bytes. A high error-correction level is used by
 * default so an optional center logo does not break scannability.
 */
export async function generateQrPng(
  text: string,
  errorCorrectionLevel: ErrorCorrectionLevel = 'H',
  margin = 1,
): Promise<Uint8Array> {
  const dataUrl = await QRCode.toDataURL(text, {
    errorCorrectionLevel,
    margin,
    width: 1024,
  });
  const base64 = dataUrl.split(',')[1];
  return Uint8Array.from(Buffer.from(base64, 'base64'));
}
