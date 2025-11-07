const rateLimit = require('express-rate-limit');
const { ErrorResponse } = require('../utils/errorResponse');

// Create IP-based rate limiter for general API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Create stricter rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many authentication attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Create very strict rate limiter for license key validation
const keyValidationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many license key validation attempts, please try again after 1 hour',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    // Log failed attempts for security monitoring
    console.log(`Excessive key validation attempts from IP: ${req.ip}`);
    
    // Return error response
    next(new ErrorResponse(options.message, 429));
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  keyValidationLimiter
};