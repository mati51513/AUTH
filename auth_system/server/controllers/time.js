const { getValidatedTime } = require('../utils/timeValidator');

// @desc    Get validated server time
// @route   GET /api/time/validate
// @access  Public
exports.validateTime = async (req, res) => {
  try {
    // Get validated time from our utility
    const validatedTime = await getValidatedTime();
    
    // Return the validated time
    res.status(200).json({
      success: true,
      serverTime: validatedTime,
      timestamp: validatedTime.getTime()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server time validation failed'
    });
  }
};