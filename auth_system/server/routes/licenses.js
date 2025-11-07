const express = require('express');
const router = express.Router();
const {
  generateLicense,
  validateLicense,
  getLicenses,
  getLicense,
  revokeLicense,
  deleteLicense,
  freezeKey,
  unfreezeKey,
  resetHWID,
  getMyLicenses,
  redeemLicense,
  resetHWIDSelf,
  getMyLicenseStats,
  bulkGenerateLicenses,
  bulkDeleteLicenses
} = require('../controllers/license');

const { protect, authorize } = require('../middleware/auth');
const { keyValidationLimiter } = require('../middleware/rateLimit');
const { generateLicenseKey } = require('../utils/keyGenerator');

// Public routes with rate limiting
router.post('/validate', keyValidationLimiter, validateLicense);

// Protected routes for all authenticated users
router.use(protect);
router.get('/mine', getMyLicenses);
router.post('/redeem', redeemLicense);
router.put('/mine/:id/reset-hwid', resetHWIDSelf);
router.get('/mine/:id/stats', getMyLicenseStats);

// Admin-only routes
router.use(authorize('admin'));

router.route('/')
  .get(getLicenses)
  .post(generateLicense);

router.route('/:id')
  .get(getLicense)
  .delete(deleteLicense);

router.put('/:id/revoke', revokeLicense);

// Add admin routes for key management
router.put('/freeze/:id', protect, authorize('admin', 'owner'), freezeKey);
router.put('/unfreeze/:id', protect, authorize('admin', 'owner'), unfreezeKey);
router.put('/reset-hwid/:id', protect, authorize('admin', 'owner'), resetHWID);

// Owner-only routes
router.post('/bulk-generate', protect, authorize('owner'), bulkGenerateLicenses);
router.delete('/bulk-delete', protect, authorize('owner'), bulkDeleteLicenses);


module.exports = router;
