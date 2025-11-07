const mongoose = require('mongoose');

const KeyLogSchema = new mongoose.Schema({
  license: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'License',
    required: true
  },
  action: {
    type: String,
    enum: [
      'validate', 'create', 'revoke', 'expire', 'failed_attempt',
      'freeze', 'unfreeze', 'reset_hwid', 'bulk_delete', 'bulk_generate',
      'redeem', 'assign', 'delete'
    ],
    required: true
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  hwid: {
    type: String
  },
  success: {
    type: Boolean,
    default: true
  },
  message: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('KeyLog', KeyLogSchema);
