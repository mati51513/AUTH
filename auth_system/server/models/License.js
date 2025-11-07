const mongoose = require('mongoose');
const { generateLicenseKey, generateChecksum } = require('../utils/keyGenerator');
const { getValidatedTime } = require('../utils/timeValidator');

const LicenseSchema = new mongoose.Schema({
  key: {
    type: String,
    unique: true,
    required: true
  },
  checksum: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'revoked', 'frozen'],
    default: 'active'
  },
  failedAttempts: {
    type: Number,
    default: 0
  },
  lastFailedAttempt: {
    type: Date
  },
  expiresAt: {
    type: Date,
    required: true
  },
  // Optional game type/category for loader routing
  gameType: {
    type: String
  },
  // HWID fields used for locking and resets
  hwid: {
    type: String
  },
  hwid_locked: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to generate a secure license key
LicenseSchema.pre('save', function(next) {
  if (!this.key) {
    this.key = generateLicenseKey();
    this.checksum = generateChecksum(this.key);
  }
  next();
});

// Method to validate a license key
LicenseSchema.methods.validateKey = async function(inputKey) {
  // Get validated server time
  const timeValidation = await getValidatedTime();
  
  // If time validation fails, reject the license validation
  if (!timeValidation.valid) {
    return {
      valid: false,
      message: 'System time validation failed. Please check your system clock.',
      timeError: true,
      serverTime: new Date(timeValidation.serverTime)
    };
  }
  
  // Use validated server time for all time-based checks
  const serverTime = timeValidation.serverTime;
  
  // Check if key is locked due to too many failed attempts
  const lockoutPeriod = 30 * 60 * 1000; // 30 minutes
  if (this.failedAttempts >= 5 && 
      this.lastFailedAttempt && 
      (serverTime - this.lastFailedAttempt) < lockoutPeriod) {
    return {
      valid: false,
      message: 'License key is temporarily locked due to too many failed attempts',
      locked: true,
      remainingTime: Math.ceil((lockoutPeriod - (serverTime - this.lastFailedAttempt)) / 60000)
    };
  }

  // Check if key is expired using server time
  if (this.expiresAt < new Date(serverTime)) {
    return {
      valid: false,
      message: 'License key has expired',
      expired: true,
      serverTime: new Date(serverTime)
    };
  }

  // Check if key is revoked
  if (this.status === 'revoked') {
    return {
      valid: false,
      message: 'License key has been revoked',
      revoked: true
    };
  }

  // Check if key is inactive
  if (this.status === 'inactive') {
    return {
      valid: false,
      message: 'License key is inactive',
      inactive: true
    };
  }

  // Validate the key format and checksum
  const inputChecksum = generateChecksum(inputKey);
  const isValid = (inputKey === this.key && inputChecksum === this.checksum);

  // Update failed attempts if necessary
  if (!isValid) {
    this.failedAttempts += 1;
    this.lastFailedAttempt = new Date(serverTime);
    this.save();
    
    return {
      valid: false,
      message: 'Invalid license key',
      attempts: this.failedAttempts,
      maxAttempts: 5
    };
  }

  // Reset failed attempts on successful validation
  if (this.failedAttempts > 0) {
    this.failedAttempts = 0;
    this.lastFailedAttempt = null;
    this.save();
  }

  return {
    valid: true,
    message: 'License key is valid',
    serverTime: new Date(serverTime)
  };
};

module.exports = mongoose.model('License', LicenseSchema);
