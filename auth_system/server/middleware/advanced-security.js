const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const crypto = require('crypto');

// Advanced rate limiting with progressive delays
const createAdvancedRateLimit = (windowMs, max, skipSuccessfulRequests = false) => {
    return rateLimit({
        windowMs,
        max,
        skipSuccessfulRequests,
        message: { error: 'Too many requests, please try again later.' },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            console.log(`[SECURITY] Rate limit exceeded from IP: ${req.ip} - ${req.originalUrl}`);
            res.status(429).json({ error: 'Rate limit exceeded' });
        }
    });
};

// Progressive slowdown for suspicious behavior
const createSlowDown = (windowMs, delayAfter, delayMs) => {
    // express-slow-down v2 expects delayMs to be a function for constant delays
    return slowDown({
        windowMs,
        delayAfter,
        delayMs: () => delayMs,
        maxDelayMs: 20000,
        skipSuccessfulRequests: true,
        validate: { delayMs: true }
    });
};

// IP blacklist store and middleware
const blacklist = [];

const ipFilter = (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    if (blacklist.includes(clientIP)) {
        console.log(`[SECURITY] Blocked blacklisted IP: ${clientIP}`);
        return res.status(403).json({ error: 'Access denied' });
    }
    next();
};

// Request signature validation
const validateRequestSignature = (req, res, next) => {
    // Skip for GET requests and public endpoints
    if (req.method === 'GET' || req.path.includes('/public/')) {
        return next();
    }
    
    const signature = req.headers['x-request-signature'];
    const timestamp = req.headers['x-timestamp'];
    
    if (!signature || !timestamp) {
        return next(); // Allow unsigned requests for now
    }
    
    // Verify timestamp (prevent replay attacks)
    const now = Date.now();
    const requestTime = parseInt(timestamp);
    if (Math.abs(now - requestTime) > 300000) { // 5 minutes
        console.log(`[SECURITY] Request timestamp too old from IP: ${req.ip}`);
        return res.status(401).json({ error: 'Request expired' });
    }
    
    next();
};

// Anti-automation detection
const antiBot = (req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    const suspicious = [
        'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python', 'requests'
    ];
    
    const isSuspicious = suspicious.some(pattern => 
        userAgent.toLowerCase().includes(pattern)
    );
    
    if (isSuspicious && !req.path.includes('/api/')) {
        console.log(`[SECURITY] Suspicious user agent blocked: ${userAgent} from ${req.ip}`);
        return res.status(403).json({ error: 'Automated requests not allowed' });
    }
    
    next();
};

// Request validation middleware
const validateRequest = (req, res, next) => {
    // Check for common attack patterns
    const body = JSON.stringify(req.body || {});
    const query = JSON.stringify(req.query || {});
    const params = JSON.stringify(req.params || {});
    
    const attackPatterns = [
        /<script/i, /javascript:/i, /vbscript:/i, /onload=/i, /onerror=/i,
        /union.*select/i, /drop.*table/i, /insert.*into/i, /delete.*from/i,
        /\.\.\//g, /etc\/passwd/i, /proc\/self/i, /windows\/system32/i
    ];
    
    const content = body + query + params;
    const hasAttack = attackPatterns.some(pattern => pattern.test(content));
    
    if (hasAttack) {
        console.log(`[SECURITY] Attack pattern detected from IP: ${req.ip} - Content: ${content.substring(0, 200)}`);
        return res.status(400).json({ error: 'Invalid request format' });
    }
    
    next();
};

// Honeypot endpoints to catch bots
const honeypot = (req, res) => {
    console.log(`[SECURITY] Honeypot triggered by IP: ${req.ip} - ${req.originalUrl}`);
    // Log but don't respond immediately to waste bot time
    setTimeout(() => {
        res.status(404).json({ error: 'Not found' });
    }, 5000);
};

module.exports = {
    // Rate limiting tiers
    strictRateLimit: createAdvancedRateLimit(15 * 60 * 1000, 10), // 10 requests per 15 minutes
    authRateLimit: createAdvancedRateLimit(15 * 60 * 1000, 5), // 5 auth attempts per 15 minutes
    apiRateLimit: createAdvancedRateLimit(1 * 60 * 1000, 30), // 30 API calls per minute
    generalRateLimit: createAdvancedRateLimit(1 * 60 * 1000, 100), // 100 requests per minute
    
    // Progressive slowdown
    authSlowDown: createSlowDown(15 * 60 * 1000, 2, 1000), // Delay after 2 attempts
    apiSlowDown: createSlowDown(1 * 60 * 1000, 10, 500), // Delay after 10 requests
    
    // Security middleware
    ipFilter,
    validateRequestSignature,
    antiBot,
    validateRequest,
    honeypot,
    // Blacklist management
    getBlacklist: () => blacklist.slice(),
    addToBlacklist: (ip) => { if (ip && !blacklist.includes(ip)) blacklist.push(ip); },
    removeFromBlacklist: (ip) => {
        const idx = blacklist.indexOf(ip);
        if (idx !== -1) blacklist.splice(idx, 1);
    }
};
