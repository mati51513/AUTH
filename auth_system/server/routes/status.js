const express = require('express');
const { getSystemStatus, updateSystemStatus, getIncidents } = require('../controllers/status');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', getSystemStatus);
router.get('/incidents', getIncidents);
router.put('/:id', protect, authorize('admin'), updateSystemStatus);

module.exports = router;