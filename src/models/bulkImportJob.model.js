// REQ-012: bulk import job tracking with per-row success/failure status
const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const failedRowSchema = mongoose.Schema(
  {
    rowIndex: { type: Number, required: true },
    originalUrl: { type: String, required: true },
    reason: { type: String, required: true },
  },
  { _id: false }
);

const bulkImportJobSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed'],
      default: 'queued',
    },
    totalRows: {
      type: Number,
      required: true,
      min: 1,
    },
    successCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    failureCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    failedRows: {
      type: [failedRowSchema],
      default: [],
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

bulkImportJobSchema.index({ userId: 1, status: 1 });

bulkImportJobSchema.plugin(toJSON);

const BulkImportJob = mongoose.model('BulkImportJob', bulkImportJobSchema);

module.exports = BulkImportJob;
