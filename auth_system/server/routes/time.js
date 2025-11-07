const express = require('express');
const { validateTime } = require('../controllers/time');

const router = express.Router();

// Time validation route
router.get('/validate', validateTime);

module.exports = router;