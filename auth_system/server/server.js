const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/config');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const licenseRoutes = require('./routes/licenses');
const userRoutes = require('./routes/users');
const timeRoutes = require('./routes/time');
const statusRoutes = require('./routes/status');
const requestGuard = require('./middleware/request-guard');

// Import Discord bot (optional)
let discordBot;
try {
  discordBot = require('./discord-bot/bot');
} catch (e) {
  console.warn('Discord bot not loaded:', e.message);
}

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add request logger for development
if (config.nodeEnv === 'development') {
  const morgan = require('morgan');
  app.use(morgan('dev'));
}

// Connect to MongoDB
connectDB();

// Serve static files from panel directory
app.use(express.static(path.join(__dirname, '../panel')));

// API Routes
app.use('/api', requestGuard({ allowlist: ['/api/status', '/api/status/incidents', '/api/admin'] }));
app.use('/api/auth', authRoutes);
// Mount Supabase auth routes only if configured
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  app.use('/api/auth/supabase', require('./routes/auth-supabase'));
} else {
  console.warn('Supabase auth disabled: missing SUPABASE_URL/SUPABASE_KEY');
}
// Mount verification routes only if email provider is available
try {
  require('./config/resend');
  app.use('/api/auth/verification', require('./routes/verification'));
} catch (e) {
  console.warn('Verification routes disabled:', e.message);
}
app.use('/api/licenses', licenseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/time', timeRoutes);
app.use('/api/status', statusRoutes);
try {
  app.use('/api/email', require('./routes/email'));
} catch (e) {
  console.warn('Email routes disabled:', e.message);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Server Error',
    message: config.nodeEnv === 'development' ? err.message : undefined
  });
});

// Serve the main panel for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../panel/index.html'));
});

// Connect to database and start server
connectDB().then(() => {
  const PORT = config.port;
  const HOST = config.host;

  app.listen(PORT, HOST, () => {
    console.log(`Server running in ${config.nodeEnv} mode on http://${HOST}:${PORT}`);
  });
});
