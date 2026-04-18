// test-generator.yaml applied to specs/url-shortener.yaml
// Covers: SC-002 (redirect + analytics), SC-005 (expired link → 410)
// REQ-002, REQ-006, REQ-008
const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { Link, Click } = require('../../src/models');
const { insertLinks, linkOne, expiredLink } = require('../fixtures/link.fixture');
const { userOne, insertUsers } = require('../fixtures/user.fixture');

setupTestDB();

// ─────────────────────────────────────────────────────────────────────────────
// SC-002 — Happy Path: redirect + analytics tracking
// REQ-002, REQ-006
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /r/:shortCode — Redirect (SC-002)', () => {
  beforeEach(async () => {
    await insertUsers([userOne]);
    await insertLinks([linkOne]);
  });

  test('T-200 [happy_path] SC-002: should return 307 with Location header pointing to originalUrl', async () => {
    // SC-002: GET /r/:shortCode → 307 Temporary Redirect + Location=originalUrl
    // Using .redirects(0) to prevent supertest from following the redirect
    const res = await request(app)
      .get(`/r/${linkOne.shortCode}`)
      .redirects(0)
      .expect(307);

    expect(res.headers.location).toBe(linkOne.originalUrl);
  });

  test('T-201 [happy_path] SC-002: should increment clickCount after redirect', async () => {
    // REQ-006: analytics tracked on every redirect (307, not 301)
    await request(app).get(`/r/${linkOne.shortCode}`).redirects(0);

    // Give async recordClick a moment to persist
    await new Promise((r) => setTimeout(r, 100));

    const dbLink = await Link.findById(linkOne._id);
    expect(dbLink.clickCount).toBe(1);
    expect(dbLink.lastAccessedAt).toBeDefined();
  });

  test('T-202 [happy_path] should create a Click record with anonymized IP', async () => {
    // REQ-006: Click record stored with anonymized IP
    await request(app)
      .get(`/r/${linkOne.shortCode}`)
      .set('Referer', 'https://google.com')
      .set('User-Agent', 'Mozilla/5.0')
      .redirects(0);

    await new Promise((r) => setTimeout(r, 100));

    const click = await Click.findOne({ linkId: linkOne._id });
    expect(click).toBeDefined();
    expect(click.referrer).toBe('https://google.com');
    // IP anonymization: IPv4 ends in .0 (last octet zeroed); IPv6 has no dots (last 80 bits zeroed)
    if (click.ipAddressAnonymized && !click.ipAddressAnonymized.includes(':')) {
      expect(click.ipAddressAnonymized).toMatch(/\.0$/);
    }
  });

  test('T-203 [edge_case] should return 404 for unknown shortCode', async () => {
    // REQ-002: not found → 404 (not 500)
    const res = await request(app)
      .get('/r/unknowncode')
      .redirects(0)
      .expect(httpStatus.NOT_FOUND);

    expect(res.body.message).toMatch(/not found/i);
  });

  test('T-204 [security] second redirect to same link should increment count to 2', async () => {
    // REQ-002: HTTP 307 is used (not 301) so browsers don't cache — every visit tracked
    await request(app).get(`/r/${linkOne.shortCode}`).redirects(0);
    await request(app).get(`/r/${linkOne.shortCode}`).redirects(0);

    await new Promise((r) => setTimeout(r, 150));

    const dbLink = await Link.findById(linkOne._id);
    expect(dbLink.clickCount).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SC-005 — Error Case: expired link → 410 Gone
// REQ-008
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /r/:shortCode — Expired link (SC-005, REQ-008)', () => {
  beforeEach(async () => {
    await insertUsers([userOne]);
    await insertLinks([expiredLink]);
  });

  test('T-210 [error_handling] SC-005: should return 410 for expired link', async () => {
    // SC-005: expiresAt is in the past → 410 Gone
    const res = await request(app)
      .get(`/r/${expiredLink.shortCode}`)
      .redirects(0)
      .expect(httpStatus.GONE);

    expect(res.body.message).toMatch(/expired/i);
  });

  test('T-211 [error_handling] should NOT create Click record for expired link', async () => {
    // REQ-008: analytics not tracked after expiry
    await request(app).get(`/r/${expiredLink.shortCode}`).redirects(0);
    await new Promise((r) => setTimeout(r, 100));

    const clickCount = await Click.countDocuments({ linkId: expiredLink._id });
    expect(clickCount).toBe(0);
  });

  test('T-212 [edge_case] should NOT increment clickCount on expired link', async () => {
    await request(app).get(`/r/${expiredLink.shortCode}`).redirects(0);
    await new Promise((r) => setTimeout(r, 100));

    const dbLink = await Link.findById(expiredLink._id);
    expect(dbLink.clickCount).toBe(0);
  });
});
