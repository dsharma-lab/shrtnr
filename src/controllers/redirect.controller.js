// REQ-002: HTTP 307 redirect (not 301) so every visit is tracked
// REQ-006: non-blocking click recording (referrer, UA, anonymized IP)
// REQ-008: 410 Gone for expired links
const catchAsync = require('../utils/catchAsync');
const { linkService, clickService } = require('../services');

const redirectLink = catchAsync(async (req, res) => {
  const link = await linkService.getLinkByShortCode(req.params.shortCode);

  // REQ-006: fire-and-forget — analytics failure must never block redirect
  clickService
    .recordClick(link.id, {
      referrer: req.headers.referer || req.headers.referrer || '',
      userAgent: req.headers['user-agent'] || '',
      ip: req.ip,
    })
    .catch(() => {});

  // REQ-002: 307 preserves method and prevents browser caching of redirect
  res.redirect(307, link.originalUrl);
});

module.exports = { redirectLink };
