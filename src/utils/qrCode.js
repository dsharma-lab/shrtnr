// REQ-014: QR code generation for shortened URLs — PNG (Buffer) or SVG (string)
const QRCode = require('qrcode');
const httpStatus = require('http-status');
const ApiError = require('./ApiError');

/**
 * Generate a QR code encoding the given URL.
 * @param {string} url - the short URL to encode
 * @param {'png'|'svg'} format
 * @returns {Promise<Buffer|string>} Buffer for png, SVG string for svg
 * @throws {ApiError} 400 for unsupported format
 */
const generateQRCode = async (url, format = 'png') => {
  if (format === 'png') {
    return QRCode.toBuffer(url);
  }
  if (format === 'svg') {
    return QRCode.toString(url, { type: 'svg' });
  }
  throw new ApiError(httpStatus.BAD_REQUEST, 'Unsupported format. Use png or svg.');
};

module.exports = { generateQRCode };
