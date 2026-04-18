// REQ-001, REQ-007: authenticated link CRUD routes
// REQ-009: custom short code support via createLink
// REQ-010: linkCreationLimiter on POST /v1/links
// REQ-012: bulk import routes
// REQ-013: analytics export route
// REQ-014: QR code route (public, no auth)
const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { linkCreationLimiter } = require('../../middlewares/rateLimiter');
const { linkValidation } = require('../../validations');
const { linkController } = require('../../controllers');

const router = express.Router();

// Bulk routes MUST be defined before /:shortCode to prevent 'bulk' being treated as a shortCode
router.post('/bulk', auth(), validate(linkValidation.bulkImport), linkController.bulkImport);
router.get('/bulk/:jobId', auth(), linkController.getBulkImportStatus);

// Core CRUD
router.post('/', auth(), linkCreationLimiter, validate(linkValidation.createLink), linkController.createLink);
router.get('/', auth(), validate(linkValidation.listUserLinks), linkController.listUserLinks);

// Analytics (export before :shortCode/analytics to avoid param conflict)
router.get('/:shortCode/analytics/export', auth(), validate(linkValidation.exportAnalytics), linkController.exportAnalytics);
router.get('/:shortCode/analytics', auth(), validate(linkValidation.getLinkAnalytics), linkController.getLinkAnalytics);

// QR code — public, no auth required
router.get('/:shortCode/qr', validate(linkValidation.getQRCode), linkController.getQRCode);

// Link detail CRUD
router.get('/:shortCode', auth(), validate(linkValidation.shortCodeParam), linkController.getLinkDetails);
router.patch('/:shortCode', auth(), validate(linkValidation.updateLink), linkController.updateLink);
router.delete('/:shortCode', auth(), validate(linkValidation.shortCodeParam), linkController.deleteLink);

module.exports = router;
