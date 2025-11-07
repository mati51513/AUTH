const express = require('express');
const router = express.Router();
const { 
  sendVerificationEmail, 
  verifyEmail, 
  sendPasswordResetEmail 
} = require('../controllers/email');

// Email verification routes
router.post('/send-verification', sendVerificationEmail);
router.post('/verify-email', verifyEmail);

// Password reset routes
router.post('/forgot-password', sendPasswordResetEmail);

module.exports = router;