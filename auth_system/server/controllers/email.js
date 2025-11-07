const { Resend } = require('resend');
const resend = require('../config/resend');
const User = require('../models/User');
const crypto = require('crypto');
const { getValidatedTime } = require('../utils/timeValidator');

/**
 * Send verification email to user
 * @route POST /api/auth/send-verification
 * @access Public
 */
exports.sendVerificationEmail = async (req, res) => {
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

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Set token expiry (24 hours)
    const now = await getValidatedTime();
    const tokenExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // Save token to user
    user.verificationToken = verificationToken;
    user.verificationTokenExpiry = tokenExpiry;
    await user.save();

    // Create verification URL
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    // Send email
    const { data, error } = await resend.emails.send({
      from: 'verification@yourdomain.com',
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification</h2>
          <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
          </div>
          <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
          <p>${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't request this verification, please ignore this email.</p>
        </div>
      `
    });

    if (error) {
      console.error('Error sending verification email:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    console.error('Error in sendVerificationEmail:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Verify email with token
 * @route POST /api/auth/verify-email
 * @access Public
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    // Find user with this token
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gt: await getValidatedTime() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Error in verifyEmail:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Send password reset email
 * @route POST /api/auth/forgot-password
 * @access Public
 */
exports.sendPasswordResetEmail = async (req, res) => {
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

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Set token expiry (1 hour)
    const now = await getValidatedTime();
    const tokenExpiry = new Date(now.getTime() + 60 * 60 * 1000);
    
    // Save token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = tokenExpiry;
    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Send email
    const { data, error } = await resend.emails.send({
      from: 'noreply@yourdomain.com',
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset</h2>
          <p>You requested a password reset. Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
          </div>
          <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
          <p>${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request a password reset, please ignore this email.</p>
        </div>
      `
    });

    if (error) {
      console.error('Error sending password reset email:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset email'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Password reset email sent successfully'
    });
  } catch (error) {
    console.error('Error in sendPasswordResetEmail:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};