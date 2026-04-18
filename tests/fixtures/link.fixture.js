// test-generator.yaml → fixtures_needed: linkFixture
// REQ-001, REQ-005, REQ-008, REQ-009: fixture helpers for link integration tests
const mongoose = require('mongoose');
const faker = require('faker');
const moment = require('moment');
const { Link } = require('../../src/models');
const { userOne, userTwo } = require('./user.fixture');
const { computeUrlHash } = require('../../src/utils/urlNormalizer');

// Pre-defined link owned by userOne — auto-generated shortCode
const linkOne = {
  _id: mongoose.Types.ObjectId(),
  shortCode: 'abc12345',
  originalUrl: 'https://example.com/products/shoes?size=10&color=red',
  urlHash: computeUrlHash('https://example.com/products/shoes?color=red&size=10'), // normalised
  userId: userOne._id,
  title: 'Shoe Product Page',
  tags: ['shoes', 'ecommerce'],
  customDescription: 'Winter sale link',
  clickCount: 0,
  isDeleted: false,
};

// Pre-defined link owned by userTwo — for ownership/403 tests
const linkTwo = {
  _id: mongoose.Types.ObjectId(),
  shortCode: 'xyz99999',
  originalUrl: 'https://other-user.com/page',
  urlHash: computeUrlHash('https://other-user.com/page'),
  userId: userTwo._id,
  clickCount: 0,
  isDeleted: false,
};

// Pre-defined expired link owned by userOne
const expiredLink = {
  _id: mongoose.Types.ObjectId(),
  shortCode: 'expired1',
  originalUrl: 'https://example.com/old-page',
  urlHash: computeUrlHash('https://example.com/old-page'),
  userId: userOne._id,
  expiresAt: moment().subtract(1, 'day').toDate(), // REQ-008: past date → 410
  clickCount: 0,
  isDeleted: false,
};

// Factory: generate a valid link payload for POST /v1/links body
const newLink = (overrides = {}) => ({
  originalUrl: faker.internet.url(),
  ...overrides,
});

// Factory: generate a link payload with future expiration
const linkWithExpiry = (overrides = {}) => ({
  originalUrl: faker.internet.url(),
  expiresAt: moment().add(7, 'days').toISOString(), // REQ-008
  ...overrides,
});

// Insert pre-built link objects into DB
const insertLinks = async (links) => {
  await Link.insertMany(links);
};

module.exports = {
  linkOne,
  linkTwo,
  expiredLink,
  newLink,
  linkWithExpiry,
  insertLinks,
};
