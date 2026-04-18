// REQ-001: validate originalUrl (URI, max 2048) and shortCode format
// REQ-003: reject malformed URLs at validation layer before service layer
// REQ-008: validate expiresAt must be a future date
// REQ-009: validate customCode format (3-20 chars, alphanumeric+hyphens)
// REQ-011: validate optional metadata (title, tags, customDescription)
// REQ-012: validate bulk import urls array (1-1000 items)
// REQ-014: validate QR code format query param
const Joi = require('joi');

const shortCodePattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/;

const urlBody = Joi.object({
  originalUrl: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .max(2048)
    .required(),
  customCode: Joi.string().min(3).max(20).pattern(shortCodePattern).optional(),
  expiresAt: Joi.date().iso().greater('now').optional().messages({
    'date.greater': 'expiresAt must be a future date',
  }),
  title: Joi.string().max(255).optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
  customDescription: Joi.string().max(500).optional(),
});

const createLink = {
  body: urlBody,
};

const updateLink = {
  params: Joi.object().keys({
    shortCode: Joi.string().min(3).max(20).required(),
  }),
  body: Joi.object({
    expiresAt: Joi.date().iso().greater('now').optional().messages({
      'date.greater': 'expiresAt must be a future date',
    }),
    title: Joi.string().max(255).optional(),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
    customDescription: Joi.string().max(500).optional(),
  }).min(1),
};

const shortCodeParam = {
  params: Joi.object().keys({
    shortCode: Joi.string().min(3).max(20).required(),
  }),
};

const listUserLinks = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().optional(),
    search: Joi.string().max(200).optional(),
  }),
};

const getLinkAnalytics = {
  params: Joi.object().keys({
    shortCode: Joi.string().min(3).max(20).required(),
  }),
  query: Joi.object().keys({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

const exportAnalytics = {
  params: Joi.object().keys({
    shortCode: Joi.string().min(3).max(20).required(),
  }),
  query: Joi.object().keys({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
  }),
};

// REQ-012: bulk import uses loose per-row schema — service handles per-row URL validation/failures
const bulkUrlItem = Joi.object({
  originalUrl: Joi.string().max(2048).required(),
  customCode: Joi.string().min(3).max(20).pattern(shortCodePattern).optional(),
  expiresAt: Joi.date().iso().optional(),
  title: Joi.string().max(255).optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
  customDescription: Joi.string().max(500).optional(),
});

const bulkImport = {
  body: Joi.object({
    urls: Joi.array().items(bulkUrlItem).min(1).max(1000).required(),
  }),
};

const getQRCode = {
  params: Joi.object().keys({
    shortCode: Joi.string().min(3).max(20).required(),
  }),
  query: Joi.object().keys({
    format: Joi.string().valid('png', 'svg').default('png'),
  }),
};

module.exports = {
  createLink,
  updateLink,
  shortCodeParam,
  listUserLinks,
  getLinkAnalytics,
  exportAnalytics,
  bulkImport,
  getQRCode,
};
