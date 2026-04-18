// REQ-010: rate limiting — 100 link creations per user per hour; 429 with Retry-After on breach
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
});

// REQ-010: keyed by req.user.id (set by auth middleware) — per-user, not per-IP
const linkCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  keyGenerator: (req) => req.user && req.user.id,
  handler: (req, res) => {
    // express-rate-limit v5: resetTime is available via req.rateLimit
    const resetTime = req.rateLimit && req.rateLimit.resetTime ? req.rateLimit.resetTime : Date.now() + 3600 * 1000;
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({
      code: 429,
      message: `Rate limit exceeded. You can create 100 links per hour. Try again in ${retryAfter} seconds.`,
    });
  },
});

module.exports = {
  authLimiter,
  linkCreationLimiter,
};
