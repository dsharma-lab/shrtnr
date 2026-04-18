// REQ-012: bulk import — process array of URLs, track per-row success/failure
const httpStatus = require('http-status');
const { BulkImportJob } = require('../models');
const ApiError = require('../utils/ApiError');
const linkService = require('./link.service');

/**
 * Process a bulk import request.
 * Creates a BulkImportJob, iterates rows calling createLink, records per-row results.
 * REQ-012
 */
const bulkImportLinks = async (userId, rows) => {
  const job = await BulkImportJob.create({
    userId,
    status: 'processing',
    totalRows: rows.length,
    startedAt: new Date(),
  });

  for (let i = 0; i < rows.length; i += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await linkService.createLink(userId, rows[i]);
      job.successCount += 1;
    } catch (err) {
      job.failureCount += 1;
      job.failedRows.push({
        rowIndex: i,
        originalUrl: rows[i].originalUrl || '',
        reason: err.message,
      });
    }
  }

  job.status = 'completed';
  job.completedAt = new Date();
  await job.save();
  return job;
};

/**
 * Fetch a bulk import job and enforce user ownership.
 * REQ-012
 */
const getBulkImportJob = async (jobId, userId) => {
  const job = await BulkImportJob.findById(jobId);
  if (!job) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Job not found');
  }
  if (String(job.userId) !== String(userId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  }
  return job;
};

module.exports = { bulkImportLinks, getBulkImportJob };
