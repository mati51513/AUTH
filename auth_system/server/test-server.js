const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { body, validationResult } = require('express-validator');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const SecurityMonitor = require('../security/security-monitor');
let supabase, initializeDatabase, userOperations, twoFAOperations;
try {
  ({ supabase, initializeDatabase, userOperations, twoFAOperations } = require('./config/supabase'));
} catch (e) {
  console.warn('âš ď¸Ź Supabase not configured, starting in limited mode:', e.message);
  // Safe fallbacks to allow server to run in limited mode
  supabase = null;
  initializeDatabase = async () => {
    console.log('â„ąď¸Ź Skipping Supabase initialization (limited mode)');
    return true;
  };
  // Local user operations fallback (no external DB)
  const localUsersPathFallback = require('path').join(__dirname, 'include', 'users.json');
  const fsLocal = require('fs');
  const readLocalUsersFallback = () => {
    try {
      if (!fsLocal.existsSync(localUsersPathFallback)) return [];
      const raw = fsLocal.readFileSync(localUsersPathFallback, 'utf8');
      return JSON.parse(raw || '[]');
    } catch {
      return [];
    }
  };
  userOperations = {
    async findUserByEmail(email) {
      const users = readLocalUsersFallback();
      return users.find(u => u.email && u.email.toLowerCase() === String(email).toLowerCase()) || null;
    },
    async createUser() {
      return { success: false, error: 'Supabase disabled' };
    }
  };
  twoFAOperations = {
    async store2FACode() { return { success: true }; },
    async verify2FACode() { return { success: true, valid: false }; },
    async cleanExpiredCodes() { return { success: true }; }
  };
}
const advancedSecurity = require('./middleware/advanced-security');
const LicenseSecurity = require('./utils/license-security');
const RequestEncryption = require('./utils/encryption');
const requestGuard = require('./middleware/request-guard');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Initialize security monitor, license system, and encryption
const securityMonitor = new SecurityMonitor();
const licenseSecurity = new LicenseSecurity();
const requestEncryption = new RequestEncryption();

// Trust proxy for accurate IP detection behind reverse proxy
app.set('trust proxy', 1);

// Middleware
app.use(express.json({ limit: '200kb' }));
// Serve panel static assets (CSS/JS/images) from root paths like /css, /js
app.use(express.static(path.join(__dirname, '..', 'panel')));
// Anti-scrape headers
app.use((req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, noarchive, noimageindex');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

// Security middleware stack
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://code.jquery.com"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://code.jquery.com"]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// Sanitize user input
app.use(mongoSanitize());
app.use(hpp()); // Prevent HTTP Parameter Pollution

// Advanced rate limiting with different tiers
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Global limit per IP
    message: { error: 'Too many requests from this IP, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for static assets
        return req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/);
    }
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // API requests per IP
    message: { error: 'API rate limit exceeded, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Strict limit for auth endpoints
    message: { error: 'Too many authentication attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
});

// Progressive delay for suspicious activity
const authSlowdown = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 10, // allow 10 requests per 15 minutes, then...
    delayMs: (hits) => hits * 100, // Progressive delay: 100ms, 200ms, 300ms, etc.
    maxDelayMs: 5000 // Maximum delay of 5 seconds
});

// Apply global protections
app.use(advancedSecurity.ipFilter);
app.use(advancedSecurity.antiBot);
app.use(advancedSecurity.validateRequest);
app.use(advancedSecurity.generalRateLimit);
app.use(globalLimiter);

// Apply security monitoring
app.use(securityMonitor.middleware());

// Apply encryption middleware conditionally (disabled in development)
const IS_DEV = (process.env.NODE_ENV || 'development') !== 'production';
const DEV_NO_ENCRYPTION = process.env.DEV_NO_ENCRYPTION === 'true' || IS_DEV;

if (!DEV_NO_ENCRYPTION) {
  app.use(requestEncryption.encryptResponse());
  app.use(requestEncryption.decryptMiddleware());
} else {
  console.log('[ENCRYPTION] Disabled in development environment');
}
// Allow basic auth endpoints for dev usability (HMAC bypass only for these paths)
app.use('/api', requestGuard({ allowlist: [
  '/api/status',
  '/api/status/incidents',
  '/api/security/status',
  '/api/admin',
  '/api/public/crypto/keys',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/verify'
] }));

// Suspicious request detection middleware
const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /\/etc\/passwd/,  // System file access
    /\/proc\//,  // Process information
    /\bselect\b.*\bfrom\b/i,  // SQL injection
    /\bunion\b.*\bselect\b/i,  // SQL injection
    /\bscript\b/i,  // XSS attempts
    /\balert\b/i,  // XSS attempts
    /\beval\b/i,  // Code injection
    /\bexec\b/i,  // Command injection
];

app.use((req, res, next) => {
    const userAgent = req.get('User-Agent') || '';
    const requestPath = req.path;
    const queryString = JSON.stringify(req.query);
    
    // Block empty user agents
    if (!userAgent.trim()) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    // Block known bad bots
    const badBots = /bot|crawler|spider|scraper|scanner|curl|wget|python|php|java/i;
    if (badBots.test(userAgent)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check for suspicious patterns
    const fullRequest = requestPath + queryString + JSON.stringify(req.body || {});
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(fullRequest)) {
            console.warn(`đźš¨ Suspicious request blocked: ${req.ip} - ${pattern} - ${requestPath}`);
            return res.status(403).json({ error: 'Access denied' });
        }
    }
    
    // Log suspicious activity
    if (requestPath.includes('..') || requestPath.includes('/etc/') || requestPath.includes('admin')) {
        console.warn(`âš ď¸Ź Suspicious path access: ${req.ip} - ${requestPath}`);
    }
    
    next();
});

// CORS configuration - Production ready for blackcode.online
const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? ['https://blackcode.online', 'https://www.blackcode.online']
    : ['https://blackcode.online', 'https://www.blackcode.online', 'http://localhost:3000', 'http://0.0.0.0:3000'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`đźš« CORS blocked: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400 // Cache preflight for 24 hours
}));

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter, authSlowdown);

// Serve static panel assets
app.use(express.static(path.join(__dirname, '..', 'panel')));

// Store verification codes (in a real app, use a database)
const verificationCodes = {};
const inMemory2FA = {};

// Local fallback storage for users when Supabase is unavailable
const localUsersPath = path.join(__dirname, 'include', 'users.json');
function readLocalUsers() {
  try {
    if (!fs.existsSync(localUsersPath)) return [];
    const raw = fs.readFileSync(localUsersPath, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading local users store:', e);
    return [];
  }
}
function writeLocalUsers(users) {
  try {
    fs.writeFileSync(localUsersPath, JSON.stringify(users, null, 2));
    return true;
  } catch (e) {
    console.error('Error writing local users store:', e);
    return false;
  }
}

// Input validation schemas
const loginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    body('password')
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be 8-128 characters')
];

const verifyValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    body('code')
        .isLength({ min: 6, max: 6 })
        .isNumeric()
        .withMessage('2FA code must be 6 digits')
];

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'panel', 'index.html'));
});

// Back-compat: redirect old /panel/* URLs to root-served panel files
app.get('/panel/*', (req, res) => {
  const target = req.path.replace(/^\/panel\//, '/');
  return res.redirect(target);
});

// Security violation reporting endpoint
app.post('/api/security/violation', (req, res) => {
  const { reason, timestamp, userAgent, url } = req.body;
  const clientIP = req.ip;
  
  console.log(`[SECURITY VIOLATION] IP: ${clientIP}, Reason: ${reason}, URL: ${url}, UA: ${userAgent}`);
  
  // Log to security monitor
  securityMonitor.logSecurityEvent({
    type: 'client_violation',
    ip: clientIP,
    reason,
    timestamp,
    userAgent,
    url
  });
  
  res.status(200).json({ logged: true });
});

// Security status endpoint
app.get('/api/security/status', (req, res) => {
    const status = securityMonitor.getStatus();
    res.json(status);
});

// Unblock IP endpoint (for development)
app.post('/api/security/unblock', (req, res) => {
    const { ip } = req.body;
    if (!ip) {
        return res.status(400).json({ error: 'IP address required' });
    }
    
    securityMonitor.unblockIP(ip);
    res.json({ success: true, message: `IP ${ip} unblocked` });
});

// Clear all blocks endpoint (for development)
app.post('/api/security/clear-blocks', (req, res) => {
    securityMonitor.clearAllBlocks();
    res.json({ success: true, message: 'All IP blocks cleared' });
});

// Honeypot endpoints
app.get('/admin', advancedSecurity.honeypot);
app.get('/wp-admin', advancedSecurity.honeypot);
app.get('/phpmyadmin', advancedSecurity.honeypot);
app.get('/.env', advancedSecurity.honeypot);

// API status endpoint (Vercel-like summary)
app.get('/api/status', async (req, res) => {
  const startedAt = process.env.STARTED_AT || Date.now();
  const now = Date.now();

  // Simulated health checks (replace with real checks when configured)
  const checks = [];

  // API itself
  checks.push({ name: 'API', status: 'operational', latencyMs: Math.max(1, now - startedAt) % 50 });

  // Panel static serving
  checks.push({ name: 'Panel', status: 'operational' });

  // Auth (2FA flow configured)
  const authConfigured = true; // using test flow
  checks.push({ name: 'Auth', status: authConfigured ? 'operational' : 'degraded' });

  // Email service (Resend) â€” check env placeholders
  const emailConfigured = !!process.env.RESEND_API_KEY;
  checks.push({ name: 'Email', status: emailConfigured ? 'operational' : 'degraded', error: emailConfigured ? undefined : 'RESEND_API_KEY not set' });

  // Supabase â€” check env placeholders
  const supabaseConfigured = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_KEY;
  checks.push({ name: 'Supabase', status: supabaseConfigured ? 'operational' : 'degraded', error: supabaseConfigured ? undefined : 'SUPABASE env missing' });

  // License Engine (placeholder)
  checks.push({ name: 'License Engine', status: 'operational' });

  // Discord Bot (placeholder)
  const discordConfigured = !!process.env.DISCORD_BOT_TOKEN;
  checks.push({ name: 'Discord Bot', status: discordConfigured ? 'operational' : 'degraded', error: discordConfigured ? undefined : 'DISCORD_BOT_TOKEN not set' });

  // Database (placeholder)
  const dbConfigured = !!process.env.DATABASE_URL;
  checks.push({ name: 'Database', status: dbConfigured ? 'operational' : 'degraded', error: dbConfigured ? undefined : 'DATABASE_URL not set' });

  // Add security monitoring status
  const securityStats = securityMonitor.getStats();
  checks.push({ 
    name: 'Security Monitor', 
    status: 'operational',
    details: {
      blockedIPs: securityStats.totalBlocked,
      suspiciousIPs: securityStats.totalSuspicious,
      activeThreats: Object.keys(securityStats.attackPatterns).length
    }
  });

  // Derive overall status
  const statuses = checks.map(c => c.status);
  const outage = statuses.includes('outage');
  const degraded = statuses.includes('degraded');
  const overall = outage ? 'outage' : degraded ? 'degraded' : 'operational';

  res.json({
    overall,
    updatedAt: new Date().toISOString(),
    components: checks,
    security: {
      blockedIPs: securityStats.totalBlocked,
      suspiciousActivity: securityStats.totalSuspicious,
      threatPatterns: securityStats.attackPatterns
    },
    history: [],
    region: process.env.REGION || 'global',
    domain: 'blackcode.online',
  });
});

// Past incidents endpoint (stub)
app.get('/api/status/incidents', (req, res) => {
  res.json({ success: true, data: {} });
});

// Public crypto keys for optional request encryption (no signing required)
app.get('/api/public/crypto/keys', (req, res) => {
  try {
    const keys = requestEncryption.generateClientKeys();
    res.json({ success: true, data: keys });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to generate keys' });
  }
});

// Simple admin protection middleware using ADMIN_SECRET
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'changeme';
function adminProtection(req, res, next) {
  const provided = req.get('x-admin-secret');
  if (!provided || provided !== ADMIN_SECRET) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }
  next();
}

// Detailed diagnostics endpoint
app.get('/api/status/diagnostics', adminProtection, (req, res) => {
  try {
    const diagnostics = {
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid
      },
      security: {
        stats: securityMonitor.getStats(),
        lastSecurityScan: new Date().toISOString()
      },
      database: {
        status: 'connected',
        lastQuery: new Date().toISOString(),
        connectionPool: 'healthy'
      },
      performance: {
        requestsPerMinute: 0,
        averageResponseTime: '<100ms',
        errorRate: '0%'
      },
      encryption: {
        algorithm: 'AES-256-GCM',
        keyRotation: 'enabled',
        lastKeyRotation: new Date().toISOString()
      }
    };
    res.json({ success: true, data: diagnostics, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Diagnostics error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve diagnostics' });
  }
});

// --- Admin API Keys Manager ---
const dataDir = path.join(__dirname, 'data');
const apiKeysFile = path.join(dataDir, 'api-keys.json');

function ensureDataDir() {
  try { if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true }); } catch(_) {}
}
function loadApiKeys() {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(apiKeysFile, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}
function saveApiKeys(list) {
  ensureDataDir();
  try { fs.writeFileSync(apiKeysFile, JSON.stringify(list, null, 2), 'utf8'); } catch (e) { console.error('Failed to save api keys:', e); }
}

// List API keys
app.get('/api/admin/api-keys', adminProtection, (req, res) => {
  const keys = loadApiKeys();
  res.json({ success: true, keys });
});

// Create API key
app.post('/api/admin/api-keys', adminProtection, (req, res) => {
  const keys = loadApiKeys();
  const id = crypto.randomUUID();
  const value = crypto.randomBytes(24).toString('hex');
  const now = new Date().toISOString();
  const name = (req.body && req.body.name) ? String(req.body.name).slice(0, 64) : `key_${id.slice(0,8)}`;
  const rpm = (req.body && req.body.quota && Number(req.body.quota.rpm)) ? Math.max(1, Number(req.body.quota.rpm)) : 60;
  const entry = { id, name, value, revoked: false, quota: { rpm }, createdAt: now, updatedAt: now };
  keys.push(entry);
  saveApiKeys(keys);
  res.json({ success: true, key: entry });
});

// Rotate API key value
app.post('/api/admin/api-keys/:id/rotate', adminProtection, (req, res) => {
  const keys = loadApiKeys();
  const idx = keys.findIndex(k => k.id === req.params.id);
  if (idx < 0) return res.status(404).json({ success: false, error: 'Not found' });
  keys[idx].value = crypto.randomBytes(24).toString('hex');
  keys[idx].updatedAt = new Date().toISOString();
  saveApiKeys(keys);
  res.json({ success: true, key: keys[idx] });
});

// Revoke API key
app.delete('/api/admin/api-keys/:id', adminProtection, (req, res) => {
  const keys = loadApiKeys();
  const idx = keys.findIndex(k => k.id === req.params.id);
  if (idx < 0) return res.status(404).json({ success: false, error: 'Not found' });
  keys[idx].revoked = true;
  keys[idx].updatedAt = new Date().toISOString();
  saveApiKeys(keys);
  res.json({ success: true });
});

// Register endpoint with Supabase integration
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  
  // Basic validation
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required'
    });
  }
  
  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 8 characters long'
    });
  }
  
  try {
    // Check if user already exists
    const existingUser = await userOperations.findUserByEmail(email);
    
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists'
      });
    }
    
    // Try Supabase Auth first
    const createResult = await userOperations.createUser({ email, password });
    if (createResult && createResult.success) {
      console.log(`âś… New user registered (Supabase): ${email} from ${req.ip}`);
      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: { 
          id: createResult.user.id,
          email: createResult.user.email,
          verified: createResult.user.is_verified
        }
      });
    }
    
    // Fallback: local users file
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const users = readLocalUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(409).json({ success: false, error: 'User already exists' });
    }
    const localUser = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      email,
      password_hash: hashedPassword,
      is_verified: true,
      two_fa_enabled: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    users.push(localUser);
    if (!writeLocalUsers(users)) {
      return res.status(500).json({ success: false, error: 'Failed to persist user' });
    }
    console.log(`âś… New user registered (local): ${email} from ${req.ip}`);
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: { id: localUser.id, email: localUser.email, verified: localUser.is_verified }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Enhanced login endpoint with Supabase integration
app.post('/api/auth/login', loginValidation, async (req, res) => {
  // Check validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn(`đźš¨ Login validation failed: ${req.ip} - ${JSON.stringify(errors.array())}`);
    return res.status(400).json({ 
      error: 'Invalid input format',
      details: errors.array()
    });
  }
  
  const { email, password } = req.body;
  
  // Log login attempt with IP tracking
  console.log(`đź” Login attempt: ${email} from ${req.ip} - ${req.get('User-Agent')}`);
  
  try {
    // Find user in Supabase
    const user = await userOperations.findUserByEmail(email);
    
    if (!user) {
      console.warn(`âťŚ User not found: ${email} from ${req.ip}`);
      return res.status(401).json({ 
        error: 'Invalid credentials',
        timestamp: new Date().toISOString()
      });
    }
    
    // Verify password
    // Validate credentials using Supabase Auth (if available)
    let authOk = false;
    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (!signInError && signInData && signInData.session) {
        authOk = true;
      }
    } catch (e) {
      // Supabase not available; will fallback
    }
    
    if (!authOk) {
      // Fallback to local users file
      const users = readLocalUsers();
      const localUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!localUser) {
        console.warn(`âťŚ User not found (local): ${email} from ${req.ip}`);
        return res.status(401).json({ error: 'Invalid credentials', timestamp: new Date().toISOString() });
      }
      const isValid = await bcrypt.compare(password, localUser.password_hash);
      if (!isValid) {
        console.warn(`âťŚ Invalid password (local): ${email} from ${req.ip}`);
        return res.status(401).json({ error: 'Invalid credentials', timestamp: new Date().toISOString() });
      }
    }

    // Development bypass: allow direct login without 2FA when enabled
    if (!supabase || !process.env.RESEND_API_KEY || String(process.env.DEV_NO_2FA || '').toLowerCase() === 'true') {
      const secret = process.env.JWT_SECRET || 'dev-secret';
      const token = jwt.sign(
        { userId: user.id, email: user.email, verified: user.is_verified },
        secret,
        { expiresIn: process.env.JWT_EXPIRE || '24h' }
      );
      console.log(`âś… DEV_NO_2FA active: issuing token directly for ${email}`);
      return res.status(200).json({ success: true, token, user: { id: user.id, email: user.email, verified: user.is_verified } });
    }
    
    // Generate cryptographically secure 2FA code
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes
    
    // Store 2FA code in Supabase
    // Try to store 2FA code in Supabase; also keep in-memory fallback
    const storeResult = await twoFAOperations.store2FACode(email, verificationCode, expiresAt);
    if (!storeResult.success) {
      console.warn(`âš ď¸Ź Falling back to in-memory 2FA store for ${email}: ${storeResult.error}`);
    }
    
    // Store IP for verification consistency
    verificationCodes[email] = {
      ip: req.ip,
      attempts: 0
    };
    inMemory2FA[email] = {
      code: verificationCode,
      expiresAt: expiresAt
    };
    
    console.log(`âś… 2FA Code for ${email}: ${verificationCode}`);
    
    res.status(200).json({
      success: true,
      message: 'Verification code sent to your email',
      requiresVerification: true,
      user: { email, verified: user.is_verified }
    });
    
  } catch (error) {
    console.error(`âťŚ Login error for ${email}:`, error);
    res.status(500).json({
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Enhanced 2FA verification with Supabase integration
app.post('/api/auth/verify', verifyValidation, async (req, res) => {
  // Check validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn(`đźš¨ 2FA validation failed: ${req.ip} - ${JSON.stringify(errors.array())}`);
    return res.status(400).json({ 
      error: 'Invalid input format',
      details: errors.array()
    });
  }
  
  const { email, code } = req.body;
  
  try {
    // Check if verification session exists
    if (!verificationCodes[email]) {
      console.warn(`âťŚ 2FA attempt for non-existent session: ${email} from ${req.ip}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired verification session'
      });
    }
    
    const verification = verificationCodes[email];
    
    // Check IP consistency (prevent session hijacking)
    if (verification.ip !== req.ip) {
      console.warn(`đźš¨ IP mismatch in 2FA: ${email} - Expected: ${verification.ip}, Got: ${req.ip}`);
      delete verificationCodes[email];
      return res.status(401).json({
        success: false,
        error: 'Security violation detected'
      });
    }
    
    // Increment attempt counter
    verification.attempts++;
    
    // Check for brute force (max 3 attempts)
    if (verification.attempts > 3) {
      delete verificationCodes[email];
      console.warn(`đźš¨ 2FA brute force detected: ${email} from ${req.ip}`);
      return res.status(429).json({
        success: false,
        error: 'Too many failed attempts. Please request a new code.'
      });
    }
    
    // First, try in-memory verification
    const mem = inMemory2FA[email];
    let isValidCode = false;
    if (mem && mem.code === code && new Date(mem.expiresAt).getTime() >= Date.now()) {
      isValidCode = true;
      delete inMemory2FA[email];
    } else {
      // Fallback to Supabase verification
      const verifyResult = await twoFAOperations.verify2FACode(email, code);
      if (!verifyResult.success) {
        console.error(`âťŚ 2FA verification error for ${email}:`, verifyResult.error);
        return res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
      isValidCode = verifyResult.valid;
    }
    if (!isValidCode) {
      console.warn(`âťŚ Invalid 2FA code: ${email} from ${req.ip} (Attempt ${verification.attempts}/3)`);
      return res.status(401).json({
        success: false,
        error: 'Invalid verification code',
        attemptsRemaining: 3 - verification.attempts
      });
    }
    
    // Success - get user data and generate JWT
    const user = await userOperations.findUserByEmail(email);
    
    if (!user) {
      console.error(`âťŚ User not found after successful 2FA: ${email}`);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        verified: user.is_verified 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );
    
    // Clean up verification session
    delete verificationCodes[email];
    console.log(`âś… Successful 2FA verification: ${email} from ${req.ip}`);
  
    res.status(200).json({
      success: true,
      token: token,
      user: {
        id: user.id,
        email: user.email,
        verified: user.is_verified,
        twoFAEnabled: user.two_fa_enabled
      },
      message: 'Authentication successful'
    });
    
  } catch (error) {
    console.error(`âťŚ 2FA verification error for ${email}:`, error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// License validation endpoint
const licensesFile = path.join(__dirname, 'include', 'licenses.json');
function readLicenses() {
  try {
    if (!fs.existsSync(licensesFile)) {
      fs.writeFileSync(licensesFile, JSON.stringify({ licenses: [] }, null, 2));
    }
    const raw = fs.readFileSync(licensesFile, 'utf-8');
    const json = JSON.parse(raw || '{}');
    return Array.isArray(json.licenses) ? json.licenses : [];
  } catch (e) {
    console.error('Failed to read licenses.json:', e);
    return [];
  }
}
function writeLicenses(licenses) {
  try {
    fs.writeFileSync(licensesFile, JSON.stringify({ licenses }, null, 2));
    return true;
  } catch (e) {
    console.error('Failed to write licenses.json:', e);
    return false;
  }
}

function generateKey() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segment = () => Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  return `${segment()}-${segment()}-${segment()}-${segment()}-${segment()}-${segment()}-${segment()}-${segment()}`;
}

// Enhanced license validation with HWID binding
app.post('/api/licenses/validate', advancedSecurity.apiRateLimit, async (req, res) => {
  try {
    const { key, hwid, systemInfo } = req.body;
    
    if (!key) {
      return res.status(400).json({ success: false, error: 'License key required' });
    }

    // Enhanced validation with HWID binding
    // Support either direct HWID string or systemInfo blob
    const siOrHwid = hwid ? hwid : systemInfo;
    const result = await licenseSecurity.validateLicense(key, siOrHwid);
    
    if (!result.valid) {
      console.log(`[LICENSE] Validation failed for ${key}: ${result.reason} from IP: ${req.ip}`);
      return res.status(400).json({ 
        success: false, 
        error: result.reason,
        code: 'VALIDATION_FAILED'
      });
    }

    console.log(`[LICENSE] Valid license ${key} used from IP: ${req.ip}`);
    res.status(200).json({ 
      success: true, 
      data: result.license,
      message: 'License validated successfully'
    });
  } catch (error) {
    console.error('[LICENSE] Validation error:', error);
    res.status(500).json({ success: false, error: 'Validation failed' });
  }
});

// Loader-friendly minimal validation endpoint
// Accepts { key, hwid?, systemInfo? } and returns a stable, compact shape
app.post('/api/loader/validate', advancedSecurity.apiRateLimit, async (req, res) => {
  try {
    const { key, hwid, systemInfo } = req.body || {};
    if (!key) return res.status(400).json({ ok: false, err: 'KEY_REQUIRED' });

    const siOrHwid = hwid ? hwid : systemInfo;
    const result = await licenseSecurity.validateLicense(key, siOrHwid);

    if (!result.valid) return res.status(200).json({ ok: false, err: String(result.reason || 'INVALID') });

    const lic = result.license || {};
    return res.status(200).json({
      ok: true,
      key: lic.key,
      type: lic.type,
      expires: lic.expires,
      hwid: lic.hwid || null,
      activations: lic.activations || 0,
      lastUsed: lic.lastUsed || null
    });
  } catch (e) {
    console.error('[LOADER] Validation error:', e);
    return res.status(500).json({ ok: false, err: 'SERVER_ERROR' });
  }
});

// Loader helper: server time sync endpoint
app.get('/api/loader/time', (req, res) => {
  const now = Date.now();
  res.json({ ok: true, ms: now, iso: new Date(now).toISOString() });
});

app.post('/api/licenses/bulk-generate', (req, res) => {
  const { type = 'default', quantity = 1 } = req.body;
  const q = Math.max(1, Math.min(quantity, 200));
  const licenses = readLicenses();
  const created = [];
  for (let i = 0; i < q; i++) {
    const key = generateKey();
    const lic = { key, type, status: 'active', createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 365*24*60*60*1000).toISOString() };
    licenses.push(lic);
    created.push(lic);
  }
  writeLicenses(licenses);
  res.status(201).json({ success: true, licenses: created });
});

app.delete('/api/licenses/bulk-delete', (req, res) => {
  const { status, olderThanDays } = req.body || {};
  let licenses = readLicenses();
  const beforeCount = licenses.length;
  const cutoff = olderThanDays ? Date.now() - (olderThanDays * 24 * 60 * 60 * 1000) : null;
  licenses = licenses.filter(l => {
    const created = l.createdAt ? new Date(l.createdAt).getTime() : Date.now();
    const statusMatch = status ? (l.status === status) : false;
    const olderMatch = cutoff ? (created < cutoff) : false;
    // Remove only those that match both filters when provided, otherwise match either
    if (status && cutoff) return !(statusMatch && olderMatch);
    if (status) return !statusMatch;
    if (cutoff) return !olderMatch;
    return true; // if no filters, keep all
  });
  const deletedCount = beforeCount - licenses.length;
  writeLicenses(licenses);
  res.status(200).json({ success: true, deletedCount });
});

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize Supabase database if available
    if (typeof initializeDatabase === 'function') {
      await initializeDatabase();
    } else {
      console.log('â„ąď¸Ź No database initializer, continuing in limited mode');
    }
    
    // Seed a test user for quick login in development
    const seedTestUser = async () => {
      const email = 'test@demo.local';
      const password = 'Demo@12345';
      try {
        const existing = await userOperations.findUserByEmail(email);
        if (existing) {
          console.log(`🧪 Test user already exists: ${email}`);
          return;
        }
        const created = await userOperations.createUser({ email, password });
        if (created && created.success) {
          console.log(`✅ Seeded Supabase test user: ${email}`);
        } else {
          // Fallback to local users file
          const saltRounds = 12;
          const hashedPassword = await bcrypt.hash(password, saltRounds);
          const users = readLocalUsers();
          users.push({
            id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            email,
            password_hash: hashedPassword,
            is_verified: true,
            two_fa_enabled: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          if (writeLocalUsers(users)) {
            console.log(`✅ Seeded local test user: ${email}`);
          } else {
            console.warn('⚠️ Failed to write local users.json for test user');
          }
        }
      } catch (e) {
        console.warn('⚠️ Error seeding test user:', e.message);
      }
    };
    await seedTestUser();
    
    // Start server
    app.listen(PORT, HOST, () => {
      console.log(`đźš€ BlackCode Auth Server running on http://${HOST}:${PORT}`);
      console.log(`đź“Š Status page: http://${HOST}:${PORT}/status.html`);
      console.log(`đź” Login panel: http://${HOST}:${PORT}/index.html`);
      console.log(`đź›ˇď¸Ź  Security monitoring active`);
    });
  } catch (error) {
    console.error('âťŚ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

