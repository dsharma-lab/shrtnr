// REQ-001: createLink → 201 with shortUrl
// REQ-006: getLinkAnalytics, exportAnalytics
// REQ-007: all handlers enforce ownership via service layer
// REQ-011: title, tags, customDescription in create/update/get
// REQ-012: bulkImport → 202 with jobId
// REQ-013: exportAnalytics → CSV download
// REQ-014: getQRCode → PNG/SVG binary response
const httpStatus = require('http-status');
const config = require('../config/config');
const catchAsync = require('../utils/catchAsync');
const pick = require('../utils/pick');
const { linkService, bulkImportService } = require('../services');
const { generateQRCode } = require('../utils/qrCode');

const buildShortUrl = (shortCode) => `${config.baseUrl}/r/${shortCode}`;

const formatLink = (link) => ({
  ...link.toJSON(),
  shortUrl: buildShortUrl(link.shortCode),
});

const createLink = catchAsync(async (req, res) => {
  const link = await linkService.createLink(req.user.id, req.body);
  res.status(httpStatus.CREATED).json(formatLink(link));
});

const listUserLinks = catchAsync(async (req, res) => {
  const options = pick(req.query, ['page', 'limit', 'sortBy', 'search']);
  const result = await linkService.listUserLinks(req.user.id, options);
  res.json({
    ...result,
    results: result.results.map(formatLink),
  });
});

const getLinkDetails = catchAsync(async (req, res) => {
  const link = await linkService.getLinkDetails(req.params.shortCode, req.user.id);
  res.json(formatLink(link));
});

const updateLink = catchAsync(async (req, res) => {
  const link = await linkService.updateLink(req.params.shortCode, req.user.id, req.body);
  res.json(formatLink(link));
});

const deleteLink = catchAsync(async (req, res) => {
  await linkService.deleteLink(req.params.shortCode, req.user.id);
  res.status(httpStatus.NO_CONTENT).send();
});

const getLinkAnalytics = catchAsync(async (req, res) => {
  const options = pick(req.query, ['startDate', 'endDate', 'page', 'limit']);
  const result = await linkService.getLinkAnalytics(req.params.shortCode, req.user.id, options);
  res.json(result);
});

// REQ-013: CSV export with Content-Disposition for download
const exportAnalytics = catchAsync(async (req, res) => {
  const options = pick(req.query, ['startDate', 'endDate']);
  const csv = await linkService.exportAnalyticsCSV(req.params.shortCode, req.user.id, options);
  const date = new Date().toISOString().split('T')[0];
  const filename = `analytics-${req.params.shortCode}-${date}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

// REQ-012: initiate bulk import, return 202 with jobId for polling
const bulkImport = catchAsync(async (req, res) => {
  const job = await bulkImportService.bulkImportLinks(req.user.id, req.body.urls);
  res.status(httpStatus.ACCEPTED).json({
    jobId: job.id,
    status: job.status,
    totalRows: job.totalRows,
    message: `Bulk import processed. Poll GET /v1/links/bulk/${job.id} for status.`,
  });
});

const getBulkImportStatus = catchAsync(async (req, res) => {
  const job = await bulkImportService.getBulkImportJob(req.params.jobId, req.user.id);
  res.json(job);
});

// REQ-014: return QR code as PNG buffer or SVG string
const getQRCode = catchAsync(async (req, res) => {
  const format = (req.query.format || 'png').toLowerCase();
  const link = await linkService.getLinkByShortCode(req.params.shortCode);
  const shortUrl = buildShortUrl(link.shortCode);
  const data = await generateQRCode(shortUrl, format);
  const contentType = format === 'svg' ? 'image/svg+xml' : 'image/png';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="qr-${link.shortCode}.${format}"`);
  res.send(data);
});

module.exports = {
  createLink,
  listUserLinks,
  getLinkDetails,
  updateLink,
  deleteLink,
  getLinkAnalytics,
  exportAnalytics,
  bulkImport,
  getBulkImportStatus,
  getQRCode,
};
