const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getMe, 
  logout 
} = require('../controllers/auth-supabase');
const { protect } = require('../middleware/auth');

// Auth routes
router.post('/register', register);
router.post('/login', login);
router.get('/user', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
