// REQ-001: store originalUrl (max 2048) and unique shortCode (3-20 chars)
// REQ-005: urlHash + compound index for per-user duplicate detection
// REQ-006: clickCount and lastAccessedAt for analytics
// REQ-008: optional expiresAt for link expiration
// REQ-011: title, tags, customDescription metadata fields
const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const linkSchema = mongoose.Schema(
  {
    shortCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    originalUrl: {
      type: String,
      required: true,
      maxlength: 2048,
    },
    urlHash: {
      type: String,
      required: true,
      private: true, // hidden from API responses via toJSON plugin
    },
    userId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      maxlength: 255,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 10,
        message: 'tags cannot exceed 10 items',
      },
    },
    customDescription: {
      type: String,
      maxlength: 500,
      trim: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    clickCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastAccessedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// REQ-005: compound unique index (urlHash + userId) — per-user duplicate detection O(1)
linkSchema.index({ urlHash: 1, userId: 1 }, { unique: true });
// Performance indexes
linkSchema.index({ userId: 1 });
linkSchema.index({ expiresAt: 1 }, { sparse: true });
linkSchema.index({ isDeleted: 1 });

linkSchema.plugin(toJSON);
linkSchema.plugin(paginate);

const Link = mongoose.model('Link', linkSchema);

module.exports = Link;
