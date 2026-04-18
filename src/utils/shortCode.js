// REQ-001: NanoID 8-char auto-generated short codes
// REQ-009: custom code validation (3-20 chars, alphanumeric+hyphens, no leading/trailing hyphens, no reserved words)
const { nanoid } = require('nanoid');

// REQ-009: reserved words that conflict with system routes or are guessable
const RESERVED_CODES = [
  'admin', 'api', 'www', 'help', 'about', 'contact', 'login', 'logout',
  'signup', 'register', 'dashboard', 'settings', 'profile', 'account',
  'static', 'assets', 'v1', 'v2', 'r', 'docs', 'swagger', 'auth', 'users', 'health',
];

// NanoID URL-safe alphabet, 8 chars — collision probability negligible at scale
const generateShortCode = () => nanoid(8);

/**
 * Validate that a short code meets format requirements.
 * Rules: 3-20 chars, alphanumeric + hyphens, no leading/trailing hyphens.
 * Codes of exactly 1-2 chars fail minimum length; single-char codes also fail the regex.
 */
const validateShortCode = (code) => {
  if (!code || code.length < 3 || code.length > 20) return false;
  // Must start and end with alphanumeric; hyphens allowed in middle only
  return /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/.test(code);
};

/**
 * Returns true if code is in the reserved list or is an all-same-character pattern (e.g., 'aaa').
 * REQ-009: security spec blocks sequential guessing via all-same-char codes.
 */
const isReservedCode = (code) => {
  if (!code) return true;
  const lower = code.toLowerCase();
  if (RESERVED_CODES.includes(lower)) return true;
  // Block all-same-character patterns: 'aaa', 'bbb', '111'
  if (/^(.)\1+$/.test(lower)) return true;
  return false;
};

module.exports = { generateShortCode, validateShortCode, isReservedCode, RESERVED_CODES };
