const supabase = require('../config/supabase');
const User = require('../models/User');
const asyncHandler = require('../middleware/async');
const { ErrorResponse } = require('../utils/errorResponse');

// @desc    Register user with Supabase
// @route   POST /api/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const { email, password, username } = req.body;

  // Register with Supabase
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username
      }
    }
  });

  if (error) {
    return next(new ErrorResponse(error.message, 400));
  }

  // Create user in MongoDB
  const user = await User.create({
    username,
    email,
    supabaseId: data.user.id,
    role: 'user'
  });

  res.status(201).json({
    success: true,
    message: 'Registration successful. Please check your email for verification.'
  });
});

// @desc    Login user with Supabase
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Login with Supabase
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Find user in MongoDB
  const user = await User.findOne({ email });
  if (!user) {
    return next(new ErrorResponse('User not found in system', 404));
  }

  // Send token response
  sendTokenResponse(user, data.session.access_token, 200, res);
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Logout user
// @route   GET /api/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
  // Sign out from Supabase
  await supabase.auth.signOut();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// Helper function to send token response
const sendTokenResponse = (user, token, statusCode, res) => {
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
};