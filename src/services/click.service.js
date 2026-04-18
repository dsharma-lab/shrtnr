// REQ-006: record click analytics with anonymized IP, parsed UA, device/browser detection
const ipaddr = require('ipaddr.js');
const { UAParser } = require('ua-parser-js');
const { Click, Link } = require('../models');

/**
 * Anonymize an IP address by zeroing the host portion.
 * IPv4: zero last octet (192.168.1.42 → 192.168.1.0)
 * IPv6: zero last 80 bits
 * REQ-006: privacy requirement
 */
const anonymizeIp = (ip) => {
  if (!ip) return null;
  try {
    const addr = ipaddr.parse(ip);
    if (addr.kind() === 'ipv4') {
      const octets = addr.octets;
      octets[3] = 0;
      return octets.join('.');
    }
    // IPv6: zero last 80 bits (parts 3-7)
    const parts = addr.parts;
    for (let i = 3; i < 8; i += 1) parts[i] = 0;
    return ipaddr.fromByteArray([].concat(...parts.map((p) => [(p >> 8) & 0xff, p & 0xff]))).toString();
  } catch {
    return null;
  }
};

/**
 * Map UA parser device type to our enum.
 */
const resolveDeviceType = (uaResult) => {
  const type = uaResult.device && uaResult.device.type;
  if (type === 'mobile') return 'Mobile';
  if (type === 'tablet') return 'Tablet';
  if (!type) return 'Desktop'; // no type = desktop
  return 'Unknown';
};

/**
 * Record a redirect click. Non-blocking from the caller's perspective (caller does not await).
 * REQ-006: create Click document, increment Link.clickCount, update lastAccessedAt.
 */
const recordClick = async (linkId, { referrer, userAgent, ip }) => {
  const parser = new UAParser(userAgent);
  const uaResult = parser.getResult();
  const deviceType = resolveDeviceType(uaResult);
  const browserName = (uaResult.browser && uaResult.browser.name) || 'Unknown';
  const ipAddressAnonymized = anonymizeIp(ip);

  // SEC-007 fix: no try/catch here — let errors propagate to the call site.
  // The redirect controller's .catch(() => {}) is the single swallow point.
  await Click.create({
    linkId,
    referrer: referrer || '',
    userAgent: userAgent || '',
    ipAddressAnonymized,
    deviceType,
    browserName,
  });

  await Link.findByIdAndUpdate(linkId, {
    $inc: { clickCount: 1 },
    $set: { lastAccessedAt: new Date() },
  });
};

module.exports = { recordClick, anonymizeIp };
