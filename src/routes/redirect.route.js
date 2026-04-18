// REQ-002: public redirect route — /r/:shortCode → 307 to originalUrl
// Registered at /r in app.js (not under /v1) to produce shrtnr.io/r/abc123 URLs
const express = require('express');
const { redirectController } = require('../controllers');

const router = express.Router();

router.get('/:shortCode', redirectController.redirectLink);

module.exports = router;
