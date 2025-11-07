const mongoose = require('mongoose');

const SystemStatusSchema = new mongoose.Schema({
  service: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['operational', 'degraded', 'outage'],
    default: 'operational'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  history: [{
    status: {
      type: String,
      enum: ['operational', 'degraded', 'outage']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    message: String
  }]
});

module.exports = mongoose.model('SystemStatus', SystemStatusSchema);