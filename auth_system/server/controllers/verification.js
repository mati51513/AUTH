const User = require('../models/User');
const resend = require('../config/resend');
const crypto = require('crypto');
const { getValidatedTime } = require('../utils/timeValidator');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

// Generate a random 6-digit verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send verification code to email
 * @route POST /api/auth/send-code
 * @access Public
 */
exports.sendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address'
      });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate 6-digit verification code
    const verificationCode = generateVerificationCode();
    
    // Set code expiry (10 minutes)
    const now = await getValidatedTime();
    const codeExpiry = new Date(now.getTime() + 10 * 60 * 1000);
    
    // Save code to user
    user.verificationCode = verificationCode;
    user.verificationCodeExpiry = codeExpiry;
    await user.save();

    // Send email with verification code
    const { data, error } = await resend.emails.send({
      from: 'verification@yourdomain.com',
      to: email,
      subject: 'Your Login Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333;">Authentication Code</h2>
          <p>Your verification code is:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px;">
            ${verificationCode}
          </div>
          <p style="margin-top: 20px;">This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      `
    });

    if (error) {
      console.error('Error sending verification code:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification code'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Verification code sent to email'
    });
  } catch (error) {
    console.error('Error in sendVerificationCode:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Verify code and login
 * @route POST /api/auth/verify-code
 * @access Public
 */
exports.verifyCodeAndLogin = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and verification code'
      });
    }

    // Find user with this email
    const user = await User.findOne({
      email,
      verificationCode: code,
      verificationCodeExpiry: { $gt: await getValidatedTime() }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    // Clear verification code
    user.verificationCode = undefined;
    user.verificationCodeExpiry = undefined;
    await user.save();

    // Create JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpire }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error in verifyCodeAndLogin:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};