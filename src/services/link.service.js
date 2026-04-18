// REQ-001: createLink — normalise URL, generate unique shortCode, persist Link
// REQ-003: URL validation via normalizeUrl (throws 400 for malformed)
// REQ-004: threat check (fail-closed, 422 if malicious, 503 if API down)
// REQ-005: per-user duplicate detection via (urlHash + userId) compound index
// REQ-007: user ownership enforced in getLinkDetails, updateLink, deleteLink
// REQ-008: expiresAt optional; 410 returned for expired links
// REQ-009: custom short codes validated and checked against reserved list
// REQ-011: title, tags, customDescription stored and returned
// REQ-013: exportAnalyticsCSV returns CSV string of Click records
const httpStatus = require('http-status');
const { Link } = require('../models');
const { Click } = require('../models');
const ApiError = require('../utils/ApiError');
const { normalizeUrl, computeUrlHash } = require('../utils/urlNormalizer');
const { generateShortCode, validateShortCode, isReservedCode } = require('../utils/shortCode');
const { checkUrlThreat } = require('../utils/threatCheck');

const MAX_SHORTCODE_RETRIES = 5;

/**
 * Create a new shortened link.
 * REQ-001, REQ-003, REQ-004, REQ-005, REQ-009, REQ-011
 */
const createLink = async (userId, body) => {
  const { originalUrl, customCode, expiresAt, title, tags, customDescription } = body;

  // REQ-003: normalise and validate URL
  const normalizedUrl = normalizeUrl(originalUrl);
  const urlHash = computeUrlHash(normalizedUrl);

  // REQ-005: check per-user duplicate — include existingShortCode in error data for client
  const existing = await Link.findOne({ urlHash, userId, isDeleted: false });
  if (existing) {
    const err = new ApiError(httpStatus.CONFLICT, 'URL already shortened');
    err.data = { existingShortCode: existing.shortCode };
    throw err;
  }

  // REQ-004: threat check — fail closed; any API failure → 503 (never silent pass)
  let threat;
  try {
    threat = await checkUrlThreat(normalizedUrl);
  } catch (err) {
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Threat check service unavailable. Please try again later.');
  }
  if (threat.isMalicious) {
    throw new ApiError(
      httpStatus.UNPROCESSABLE_ENTITY,
      `URL flagged as malicious. Reason: ${threat.reason}. Contact support if this is incorrect.`
    );
  }

  // REQ-009: resolve short code
  let shortCode;
  if (customCode) {
    if (!validateShortCode(customCode)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid short code format');
    }
    if (isReservedCode(customCode)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Short code is reserved. Choose another.');
    }
    const taken = await Link.findOne({ shortCode: customCode });
    if (taken) {
      throw new ApiError(httpStatus.CONFLICT, 'Short code already taken');
    }
    shortCode = customCode;
  } else {
    // Auto-generate with collision retry
    for (let i = 0; i < MAX_SHORTCODE_RETRIES; i += 1) {
      const candidate = generateShortCode();
      // eslint-disable-next-line no-await-in-loop
      const collision = await Link.findOne({ shortCode: candidate });
      if (!collision) {
        shortCode = candidate;
        break;
      }
    }
    if (!shortCode) {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to generate unique short code. Please try again.');
    }
  }

  const link = await Link.create({
    shortCode,
    originalUrl,
    urlHash,
    userId,
    expiresAt,
    title,
    tags,
    customDescription,
  });

  return link;
};

/**
 * Fetch an active (non-deleted, non-expired) link by shortCode for redirect.
 * REQ-002, REQ-008
 */
const getLinkByShortCode = async (shortCode) => {
  const link = await Link.findOne({ shortCode });
  if (!link || link.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Short URL not found');
  }
  if (link.expiresAt && link.expiresAt < new Date()) {
    throw new ApiError(httpStatus.GONE, 'Link has expired');
  }
  return link;
};

/**
 * Fetch link details and enforce user ownership.
 * REQ-007
 */
const getLinkDetails = async (shortCode, userId) => {
  const link = await Link.findOne({ shortCode });
  if (!link || link.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Link not found');
  }
  if (String(link.userId) !== String(userId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to access this resource.');
  }
  return link;
};

/**
 * Return paginated list of links owned by userId (excludes deleted).
 * REQ-001, REQ-011
 */
const listUserLinks = async (userId, options) => {
  const filter = { userId, isDeleted: false };
  if (options.search) {
    // SEC-005 fix: escape regex metacharacters to prevent ReDoS
    const escaped = options.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    filter.$or = [{ originalUrl: regex }, { title: regex }];
  }
  const result = await Link.paginate(filter, {
    page: options.page,
    limit: options.limit,
    sortBy: options.sortBy || 'createdAt:desc',
  });
  return result;
};

/**
 * Update allowed metadata fields on an owned link.
 * REQ-007, REQ-008, REQ-011
 */
const updateLink = async (shortCode, userId, updates) => {
  await getLinkDetails(shortCode, userId); // ownership check
  if (updates.expiresAt && new Date(updates.expiresAt) <= new Date()) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'expiresAt must be a future date');
  }
  const link = await Link.findOneAndUpdate({ shortCode }, { $set: updates }, { new: true });
  return link;
};

/**
 * Soft-delete a link. Analytics history preserved.
 * REQ-007 (ownership), soft-delete spec
 */
const deleteLink = async (shortCode, userId) => {
  await getLinkDetails(shortCode, userId);
  await Link.findOneAndUpdate({ shortCode }, { $set: { isDeleted: true } });
};

/**
 * Return paginated Click records for a link with optional date range.
 * REQ-006, REQ-007
 */
const getLinkAnalytics = async (shortCode, userId, options) => {
  const link = await getLinkDetails(shortCode, userId);
  const filter = { linkId: link._id };
  if (options.startDate || options.endDate) {
    filter.timestamp = {};
    if (options.startDate) filter.timestamp.$gte = new Date(options.startDate);
    if (options.endDate) filter.timestamp.$lte = new Date(options.endDate);
  }
  const result = await Click.paginate(filter, {
    page: options.page || 1,
    limit: options.limit || 20,
    sortBy: 'timestamp:desc',
  });
  return {
    shortCode,
    totalClicks: link.clickCount,
    clicks: result.results,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
  };
};

/**
 * Export Click records as a CSV string.
 * REQ-013
 */
const exportAnalyticsCSV = async (shortCode, userId, options) => {
  const link = await getLinkDetails(shortCode, userId);
  const filter = { linkId: link._id };
  if (options.startDate || options.endDate) {
    filter.timestamp = {};
    if (options.startDate) filter.timestamp.$gte = new Date(options.startDate);
    if (options.endDate) filter.timestamp.$lte = new Date(options.endDate);
  }
  const clicks = await Click.find(filter).sort({ timestamp: 1 }).lean();

  const csvEscape = (val) => {
    const s = val == null ? '' : String(val);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const header = 'timestamp,referrer,userAgent,ipAddressAnonymized,countryCode,deviceType,browserName';
  const rows = clicks.map((c) =>
    [c.timestamp, c.referrer, c.userAgent, c.ipAddressAnonymized, c.countryCode, c.deviceType, c.browserName]
      .map(csvEscape)
      .join(',')
  );
  return [header, ...rows].join('\n');
};

module.exports = {
  createLink,
  getLinkByShortCode,
  getLinkDetails,
  listUserLinks,
  updateLink,
  deleteLink,
  getLinkAnalytics,
  exportAnalyticsCSV,
};
