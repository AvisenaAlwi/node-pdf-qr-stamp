# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-07-07

### Added

- **Preview mode** (`preview: true`) for `stampPdf`. Instead of generating a real QR code, a solid black box is drawn with the exact same size and position as the QR code. This is useful for previewing where the signature QR code will be placed later.
- `case11-preview` example demonstrating the new preview placeholder.
- Unit tests covering preview mode above anchor text and at fallback position.

### Changed

- `qr.text` is now optional when `preview: true` is enabled.
- Added explicit CommonJS + ESM exports via `exports` field in `package.json` (CJS `dist/index.js`, ESM `dist/index.mjs`).

### Fixed

- Corrected the documented default value for `qr.offsetAbove` in the README.

## [1.0.0]

### Added

- Initial release of `@avisenaalwi/pdf-qr-stamp`.
- Stamp a QR code above an anchor text (`ditandatangani secara elektronik` by default).
- Fallback QR placement (`bottom-right`, `bottom-left`, or `none`) when anchor text is missing.
- Optional center logo/image inside the QR code.
- Simple text footer and custom `FooterBuilder` support.
- Support for PDF input as file path, `Buffer`, `Uint8Array`, or `ArrayBuffer`.

[Unreleased]: https://github.com/avisenaalwi/node-pdf-qr-stamp/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/avisenaalwi/node-pdf-qr-stamp/compare/v1.0.0...v1.1.0
