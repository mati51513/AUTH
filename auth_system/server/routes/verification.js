const express = require('express');
const router = express.Router();
const { 
  sendVerificationCode, 
  verifyCodeAndLogin 
} = require('../controllers/verification');

// Verification code routes
router.post('/send-code', sendVerificationCode);
router.post('/verify-code', verifyCodeAndLogin);

module.exports = router;