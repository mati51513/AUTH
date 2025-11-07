const License = require('../models/License');
const User = require('../models/User');
const KeyLog = require('../models/KeyLog');
const { ErrorResponse } = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const { getValidatedTime } = require('../utils/timeValidator');

// @desc    Generate a new license key
// @route   POST /api/licenses
// @access  Private/Admin
exports.generateLicense = asyncHandler(async (req, res, next) => {
  const { userId, expiresAt } = req.body;
  
  // Get validated server time
  const timeValidation = await getValidatedTime();
  if (!timeValidation.valid) {
    return next(new ErrorResponse('Server time validation failed', 500));
  }
  
  const serverTime = timeValidation.serverTime;

  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${userId}`, 404));
  }

  // Create license with server time
  const license = await License.create({
    user: userId,
    expiresAt: expiresAt || new Date(serverTime + 365 * 24 * 60 * 60 * 1000) // Default 1 year from server time
  });

  // Log license creation with server time
  await KeyLog.create({
    license: license._id,
    action: 'create',
    ipAddress: req.ip,
    createdAt: new Date(serverTime),
    success: true,
    message: 'License created successfully'
  });

  res.status(201).json({
    success: true,
    data: license,
    serverTime: new Date(serverTime)
  });
});

// @desc    Freeze license key
// @route   PUT /api/license/freeze/:id
// @access  Private/Admin
exports.freezeKey = async (req, res) => {
  try {
    const license = await License.findById(req.params.id);
    
    if (!license) {
      return res.status(404).json({
        success: false,
        error: 'License key not found'
      });
    }
    
    license.status = 'frozen';
    await license.save();
    
    res.status(200).json({
      success: true,
      data: license
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Unfreeze license key
// @route   PUT /api/license/unfreeze/:id
// @access  Private/Admin
exports.unfreezeKey = async (req, res) => {
  try {
    const license = await License.findById(req.params.id);
    
    if (!license) {
      return res.status(404).json({
        success: false,
        error: 'License key not found'
      });
    }
    
    license.status = 'active';
    await license.save();
    
    res.status(200).json({
      success: true,
      data: license
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Reset HWID for license key
// @route   PUT /api/license/reset-hwid/:id
// @access  Private/Admin
exports.resetHWID = async (req, res) => {
  try {
    const license = await License.findById(req.params.id);
    
    if (!license) {
      return res.status(404).json({
        success: false,
        error: 'License key not found'
      });
    }
    
    license.hwid = null;
    license.hwid_locked = false;
    await license.save();
    
    // Log the HWID reset with validated server time
    const timeValidation = await getValidatedTime();
    await KeyLog.create({
      license: license._id,
      action: 'reset_hwid',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
      message: 'HWID reset by admin',
      createdAt: new Date(timeValidation.serverTime)
    });
    
    res.status(200).json({
      success: true,
      data: license
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Validate license key
// @route   POST /api/license/validate
// @access  Public
exports.validateLicense = asyncHandler(async (req, res, next) => {
  const { key, hardwareId, clientTime } = req.body;

  if (!key) {
    return next(new ErrorResponse('Please provide a license key', 400));
  }

  // Get validated server time
  const timeValidation = await getValidatedTime();
  if (!timeValidation.valid) {
    // Log time manipulation attempt
    await KeyLog.create({
      action: 'validate',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      hwid: hardwareId || 'unknown',
      success: false,
      message: 'Time validation failed - possible manipulation attempt',
      createdAt: new Date(timeValidation.serverTime)
    });

    return res.status(400).json({
      success: false,
      message: 'System time validation failed. Please check your system clock.',
      timeError: true,
      serverTime: new Date(timeValidation.serverTime)
    });
  }
  
  // Check if client time is manipulated
  if (clientTime) {
    const clientTimeDate = new Date(clientTime);
    const timeDiff = Math.abs(timeValidation.serverTime - clientTimeDate.getTime());
    const maxDrift = 5 * 60 * 1000; // 5 minutes
    
    if (timeDiff > maxDrift) {
      // Log time manipulation attempt
      await KeyLog.create({
        action: 'validate',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        hwid: hardwareId || 'unknown',
        success: false,
        message: 'Client time manipulation detected',
        createdAt: new Date(timeValidation.serverTime)
      });
      
      return res.status(400).json({
        success: false,
        message: 'Time validation failed. Please check your system clock.',
        timeError: true,
        serverTime: new Date(timeValidation.serverTime)
      });
    }
  }

  // Find license by key
  const license = await License.findOne({ key });

  if (!license) {
    // Log failed attempt with server time
    await KeyLog.create({
      action: 'validate',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      hwid: hardwareId || 'unknown',
      success: false,
      message: 'Invalid license key',
      createdAt: new Date(timeValidation.serverTime)
    });

    return res.status(404).json({
      success: false,
      message: 'Invalid license key'
    });
  }

  // Validate the license key using server time
  const validationResult = await license.validateKey(key);

  // Log validation attempt with server time
  await KeyLog.create({
    license: license._id,
    action: 'validate',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    hwid: hardwareId || 'unknown',
    success: validationResult.valid,
    message: validationResult.message,
    createdAt: new Date(timeValidation.serverTime)
  });

  res.status(validationResult.valid ? 200 : 400).json({
    success: validationResult.valid,
    ...validationResult,
    serverTime: new Date(timeValidation.serverTime)
  });
});

// @desc    Get all licenses
// @route   GET /api/licenses
// @access  Private/Admin
exports.getLicenses = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get single license
// @route   GET /api/licenses/:id
// @access  Private/Admin
exports.getLicense = asyncHandler(async (req, res, next) => {
  const license = await License.findById(req.params.id).populate('user', 'username email');

  if (!license) {
    return next(new ErrorResponse(`License not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: license
  });
});

// @desc    Revoke a license
// @route   PUT /api/licenses/:id/revoke
// @access  Private/Admin
exports.revokeLicense = asyncHandler(async (req, res, next) => {
  let license = await License.findById(req.params.id);

  if (!license) {
    return next(new ErrorResponse(`License not found with id of ${req.params.id}`, 404));
  }

  license.status = 'revoked';
  await license.save();

  // Log license revocation
  await KeyLog.create({
    license: license._id,
    action: 'revoke',
    ipAddress: req.ip,
    success: true,
    message: 'License revoked successfully'
  });

  res.status(200).json({
    success: true,
    data: license
  });
});

// @desc    Delete license
// @route   DELETE /api/licenses/:id
// @access  Private/Admin
exports.deleteLicense = asyncHandler(async (req, res, next) => {
  const license = await License.findById(req.params.id);

  if (!license) {
    return next(new ErrorResponse(`License not found with id of ${req.params.id}`, 404));
  }

  await license.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Bulk generate license keys
// @route   POST /api/licenses/bulk-generate
// @access  Private/Owner
exports.bulkGenerateLicenses = asyncHandler(async (req, res, next) => {
  const { quantity, expiresAt, gameType } = req.body;
  
  if (!quantity || quantity < 1 || quantity > 100) {
    return next(new ErrorResponse('Please provide a valid quantity between 1 and 100', 400));
  }
  
  // Get validated server time
  const timeValidation = await getValidatedTime();
  if (!timeValidation.valid) {
    return next(new ErrorResponse('Server time validation failed', 500));
  }
  
  const serverTime = timeValidation.serverTime;
  const licenses = [];
  
  // Create licenses in bulk
  for (let i = 0; i < quantity; i++) {
    const license = await License.create({
      gameType: gameType || 'default',
      expiresAt: expiresAt || new Date(serverTime + 365 * 24 * 60 * 60 * 1000) // Default 1 year
    });
    
    licenses.push(license);
    
    // Log license creation
    await KeyLog.create({
      license: license._id,
      action: 'bulk_create',
      ipAddress: req.ip,
    createdAt: new Date(serverTime),
      success: true,
      message: `License created in bulk operation by ${req.user.username}`
    });
  }
  
  res.status(201).json({
    success: true,
    count: licenses.length,
    data: licenses,
    serverTime: new Date(serverTime)
  });
});

// @desc    Bulk delete license keys
// @route   DELETE /api/licenses/bulk-delete
// @access  Private/Owner
exports.bulkDeleteLicenses = asyncHandler(async (req, res, next) => {
  const { ids } = req.body;
  
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return next(new ErrorResponse('Please provide an array of license IDs', 400));
  }
  
  // Get validated server time
  const timeValidation = await getValidatedTime();
  if (!timeValidation.valid) {
    return next(new ErrorResponse('Server time validation failed', 500));
  }
  
  const serverTime = timeValidation.serverTime;
  let deletedCount = 0;
  
  // Delete licenses in bulk
  for (const id of ids) {
    const license = await License.findById(id);
    
    if (license) {
      await license.deleteOne();
      deletedCount++;
      
      // Log license deletion
      await KeyLog.create({
        action: 'bulk_delete',
        ipAddress: req.ip,
    createdAt: new Date(serverTime),
        success: true,
        message: `License ${license.key} deleted in bulk operation by ${req.user.username}`
      });
    }
  }
  
  res.status(200).json({
    success: true,
    count: deletedCount,
    message: `${deletedCount} licenses deleted successfully`,
    serverTime: new Date(serverTime)
  });
});

// @desc    Get licenses for current user
// @route   GET /api/licenses/mine
// @access  Private
exports.getMyLicenses = asyncHandler(async (req, res, next) => {
  const licenses = await License.find({ user: req.user.id })
    .select('key status expiresAt hwid hwid_locked createdAt');
  res.status(200).json({
    success: true,
    count: licenses.length,
    data: licenses
  });
});

// @desc    Redeem a license key to current account
// @route   POST /api/licenses/redeem
// @access  Private
exports.redeemLicense = asyncHandler(async (req, res, next) => {
  const { key } = req.body;
  if (!key) {
    return next(new ErrorResponse('Please provide a license key', 400));
  }

  // Find license by key
  const license = await License.findOne({ key });
  if (!license) {
    return next(new ErrorResponse('Invalid license key', 404));
  }

  // Validate license state
  const validation = await license.validateKey(key);
  if (!validation.valid) {
    return res.status(400).json({ success: false, ...validation });
  }

  // If already owned by another account, block
  if (license.user && license.user.toString() !== req.user.id) {
    return next(new ErrorResponse('License already redeemed by another account', 403));
  }

  // Assign to current user
  license.user = req.user.id;
  license.status = 'active';
  await license.save();

  // Log redemption
  await KeyLog.create({
    license: license._id,
    action: 'redeem',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    success: true,
    message: 'License redeemed',
    createdAt: new Date()
  });

  res.status(200).json({ success: true, data: license });
});

// @desc    Reset HWID for a license owned by current account
// @route   PUT /api/licenses/mine/:id/reset-hwid
// @access  Private
exports.resetHWIDSelf = asyncHandler(async (req, res, next) => {
  const license = await License.findById(req.params.id);
  if (!license) {
    return next(new ErrorResponse('License not found', 404));
  }
  if (!license.user || license.user.toString() !== req.user.id) {
    return next(new ErrorResponse('Not authorized to reset HWID for this license', 403));
  }

  license.hwid = null;
  license.hwid_locked = false;
  await license.save();

  await KeyLog.create({
    license: license._id,
    action: 'reset_hwid',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    success: true,
    message: 'HWID reset by owner account',
    createdAt: new Date()
  });

  res.status(200).json({ success: true, data: license });
});

// @desc    Get analytics stats for a user-owned license
// @route   GET /api/licenses/mine/:id/stats
// @access  Private
exports.getMyLicenseStats = asyncHandler(async (req, res, next) => {
  const license = await License.findById(req.params.id);
  if (!license) {
    return next(new ErrorResponse('License not found', 404));
  }
  if (!license.user || license.user.toString() !== req.user.id) {
    return next(new ErrorResponse('Not authorized to view stats for this license', 403));
  }

  const logs = await KeyLog.find({ license: license._id }).sort({ createdAt: -1 }).limit(50);
  const validateLogs = logs.filter(l => l.action === 'validate');
  const successCount = validateLogs.filter(l => l.success).length;
  const failCount = validateLogs.filter(l => !l.success).length;
  const last = logs[0] || null;

  res.status(200).json({
    success: true,
    data: {
      totalLogs: logs.length,
      validations: validateLogs.length,
      successCount,
      failCount,
      lastEvent: last ? {
        action: last.action,
        createdAt: last.createdAt,
        ipAddress: last.ipAddress,
        hwid: last.hwid || null,
        userAgent: last.userAgent || null,
        success: last.success,
        message: last.message || null
      } : null
    }
  });
});
