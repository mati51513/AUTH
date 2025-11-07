const dotenv = require('dotenv');

// Load environment variables
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 8000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/auth_system',
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production',
  jwtExpire: process.env.JWT_EXPIRE || '30d',
  host: process.env.HOST || '192.168.100.14',
  resendApiKey: process.env.RESEND_API_KEY,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
  verificationEmail: process.env.VERIFICATION_EMAIL || 'pieselek828@gmail.com'
};