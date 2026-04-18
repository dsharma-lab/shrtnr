// REQ-004: fail-closed threat intelligence check — any API failure rejects the request with 503
const axios = require('axios');
const httpStatus = require('http-status');
const config = require('../config/config');
const ApiError = require('./ApiError');
const logger = require('../config/logger');

const TIMEOUT_MS = 5000;

/**
 * Check whether a URL is flagged as malicious by the configured threat intelligence API.
 * Fail-closed: if the API is unavailable for any reason, throw ApiError(503).
 * @param {string} url - normalised URL to check
 * @returns {Promise<{ isMalicious: boolean, reason: string|null }>}
 * @throws {ApiError} 503 when threat API is unreachable or returns non-2xx
 */
const checkUrlThreat = async (url) => {
  // SEC-003 fix: in production, THREAT_API_URL must be set — enforced at startup via config.js
  // In dev/test: skip check if unconfigured (convenience only)
  if (!config.threatApiUrl) {
    if (config.env === 'production') {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Threat check service not configured.');
    }
    return { isMalicious: false, reason: null };
  }

  try {
    const response = await axios.post(
      config.threatApiUrl,
      { url },
      {
        headers: { Authorization: `Bearer ${config.threatApiKey}` },
        timeout: TIMEOUT_MS,
      }
    );
    return {
      isMalicious: Boolean(response.data.isMalicious),
      reason: response.data.reason || null,
    };
  } catch (err) {
    // REQ-004: fail closed — log domain only (not full URL) to avoid leaking credentials in query params
    let domain = url;
    try { domain = new URL(url).hostname; } catch { /* ignore */ }
    logger.warn(`Threat check failed for domain ${domain}: ${err.message}`);
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Threat check service unavailable. Please try again later.');
  }
};

module.exports = { checkUrlThreat };
