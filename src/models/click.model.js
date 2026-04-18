// REQ-006: track click analytics — referrer, userAgent, anonymized IP, device, browser
const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const clickSchema = mongoose.Schema({
  linkId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: 'Link',
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  referrer: {
    type: String,
    maxlength: 2048,
    trim: true,
  },
  userAgent: {
    type: String,
    maxlength: 512,
    trim: true,
  },
  // REQ-006: last octet zeroed (192.168.1.42 → 192.168.1.0) for privacy
  ipAddressAnonymized: {
    type: String,
    maxlength: 45,
  },
  countryCode: {
    type: String,
    maxlength: 2,
  },
  deviceType: {
    type: String,
    enum: ['Desktop', 'Mobile', 'Tablet', 'Unknown'],
    default: 'Unknown',
  },
  browserName: {
    type: String,
    maxlength: 64,
  },
});

// REQ-006: compound index for analytics range queries
clickSchema.index({ linkId: 1, timestamp: -1 });
clickSchema.index({ timestamp: -1 });

clickSchema.plugin(toJSON);
clickSchema.plugin(paginate);

const Click = mongoose.model('Click', clickSchema);

module.exports = Click;
