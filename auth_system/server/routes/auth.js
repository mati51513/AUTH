const express = require('express');
const { register, login, getMe, logout, verifyUser } = require('../controllers/auth');
const { protect } = require('../middleware/auth');
const { validate, registerRules, loginRules } = require('../middleware/validator');

const router = express.Router();

// Auth routes with validation
router.post('/register', validate(registerRules), register);
router.post('/login', validate(loginRules), login);
router.get('/me', protect, getMe);
router.get('/logout', protect, logout);
router.get('/verify/:token', verifyUser);

// Simple token verification endpoint used by panel
router.post('/verify', protect, (req, res) => {
  res.status(200).json({ success: true, user: { id: req.user.id, role: req.user.role } });
});

module.exports = router;
