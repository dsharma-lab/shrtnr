// REQ-003: validate RFC 3986 format, reject non-http/https protocols
// REQ-005: compute SHA-256 hash of normalised URL for duplicate detection
const crypto = require('crypto');
const ApiError = require('./ApiError');
const httpStatus = require('http-status');

const ALLOWED_PROTOCOLS = ['http:', 'https:'];
const DEFAULT_PORTS = { 'http:': '80', 'https:': '443' };

/**
 * Normalise a URL for consistent hashing and storage.
 * Steps: validate → lowercase scheme+host → strip default port → sort query params → strip fragment.
 * @param {string} url
 * @returns {string} normalised URL
 * @throws {ApiError} 400 if URL is malformed or uses unsupported protocol
 */
const normalizeUrl = (url) => {
  // SEC-002 fix: pre-check protocol before parsing to prevent javascript:/data: bypass
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid URL format');
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid URL format');
  }

  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Unsupported URL protocol. Only http and https are allowed.');
  }

  parsed.protocol = parsed.protocol.toLowerCase();
  parsed.hostname = parsed.hostname.toLowerCase();

  // Remove default ports
  if (parsed.port === DEFAULT_PORTS[parsed.protocol]) {
    parsed.port = '';
  }

  // Sort query params alphabetically for consistent hashing
  parsed.searchParams.sort();

  // Strip fragment — fragments are client-side only, not part of server identity
  parsed.hash = '';

  return parsed.toString();
};

/**
 * Compute SHA-256 hex digest of a normalised URL.
 * @param {string} normalizedUrl
 * @returns {string} 64-char hex string
 */
const computeUrlHash = (normalizedUrl) => {
  return crypto.createHash('sha256').update(normalizedUrl, 'utf8').digest('hex');
};

module.exports = { normalizeUrl, computeUrlHash };
