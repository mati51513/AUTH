const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Simple in-memory nonce store with TTL per API key
class NonceStore {
  constructor(ttlMs = 60_000) {
    this.ttlMs = ttlMs;
    this.store = new Map(); // keyValue => Map(nonce => expiresAt)
  }
  has(keyValue, nonce) {
    const m = this.store.get(keyValue);
    if (!m) return false;
    const exp = m.get(nonce);
    if (!exp) return false;
    if (Date.now() > exp) {
      m.delete(nonce);
      return false;
    }
    return true;
  }
  add(keyValue, nonce) {
    let m = this.store.get(keyValue);
    if (!m) {
      m = new Map();
      this.store.set(keyValue, m);
    }
    m.set(nonce, Date.now() + this.ttlMs);
  }
  sweep() {
    const now = Date.now();
    for (const [key, m] of this.store.entries()) {
      for (const [nonce, exp] of m.entries()) {
        if (now > exp) m.delete(nonce);
      }
      if (m.size === 0) this.store.delete(key);
    }
  }
}

// Cache API keys from data file with periodic refresh
class ApiKeyCache {
  constructor(filePath, refreshMs = 60_000) {
    this.filePath = filePath;
    this.refreshMs = refreshMs;
    this.lastLoad = 0;
    this.keys = [];
  }
  load() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      this.keys = Array.isArray(parsed) ? parsed : [];
      this.lastLoad = Date.now();
    } catch (_) {
      this.keys = [];
      this.lastLoad = Date.now();
    }
  }
  ensureFresh() {
    const stale = (Date.now() - this.lastLoad) > this.refreshMs;
    if (stale || this.keys.length === 0) this.load();
  }
  // Find key entry by provided key value
  findByValue(value) {
    this.ensureFresh();
    return this.keys.find(k => k.value === value);
  }
}

function timingSafeHexEqual(aHex, bHex) {
  try {
    const a = Buffer.from(String(aHex), 'hex');
    const b = Buffer.from(String(bHex), 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (_) {
    return false;
  }
}

function canonicalPayload(reqBody, method, pathName, timestamp, nonce) {
  const bodyStr = reqBody && Object.keys(reqBody).length > 0 ? JSON.stringify(reqBody) : '';
  return [method.toUpperCase(), pathName, bodyStr, String(timestamp), String(nonce)].join('\n');
}

function hmacSha256Hex(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

/**
 * Express middleware to enforce request signing using HMAC with per-client API keys.
 * Headers required:
 *  - x-api-key: client API key value (hex)
 *  - x-req-timestamp: unix ms timestamp
 *  - x-req-nonce: random nonce string
 *  - x-req-signature: hex HMAC-SHA256 over canonical payload
 * Canonical payload: METHOD + "\n" + PATH + "\n" + JSON(body) + "\n" + timestamp + "\n" + nonce
 */
function requestGuard(options = {}) {
  const {
    keysFile = path.join(__dirname, '..', 'data', 'api-keys.json'),
    allowlist = [
      '/api/status',
      '/api/status/incidents',
      '/api/security/status',
      // Admin API remains protected by x-admin-secret separately
      // but allow it to skip request signing
      '/api/admin',
    ],
    skewMs = 60_000,
  } = options;

  const cache = new ApiKeyCache(keysFile);
  cache.ensureFresh();
  const nonces = new NonceStore(skewMs);

  // Periodic maintenance
  setInterval(() => nonces.sweep(), Math.max(5_000, skewMs / 2)).unref?.();

  return (req, res, next) => {
    // Bypass for allowlisted paths (prefix match)
    // Ensure we compare against full path including mount base (e.g., '/api')
    const fullPath = (req.baseUrl || '') + req.path;
    const isAllowlisted = allowlist.some(p => fullPath.startsWith(p) || req.path.startsWith(p));
    if (isAllowlisted) return next();

    // Require headers
    const apiKey = req.get('x-api-key');
    const sig = req.get('x-req-signature');
    const ts = req.get('x-req-timestamp');
    const nonce = req.get('x-req-nonce');

    if (!apiKey || !sig || !ts || !nonce) {
      return res.status(401).json({ success: false, error: 'Missing request signing headers' });
    }

    // Validate timestamp skew
    const now = Date.now();
    const tsNum = Number(ts);
    if (!Number.isFinite(tsNum) || Math.abs(now - tsNum) > skewMs) {
      return res.status(401).json({ success: false, error: 'Request timestamp out of range' });
    }

    // Validate nonce replay
    if (nonces.has(apiKey, nonce)) {
      return res.status(401).json({ success: false, error: 'Replay detected' });
    }

    // Lookup API key
    const entry = cache.findByValue(apiKey);
    if (!entry || entry.revoked) {
      return res.status(403).json({ success: false, error: 'Invalid API key' });
    }

    // Build canonical payload and verify signature
    const payload = canonicalPayload(req.body || {}, req.method, req.path, tsNum, nonce);
    const expected = hmacSha256Hex(entry.value, payload);
    const ok = timingSafeHexEqual(sig, expected);
    if (!ok) {
      console.warn(`🚫 Invalid HMAC signature: ip=${req.ip} path=${req.path}`);
      return res.status(401).json({ success: false, error: 'Invalid request signature' });
    }

    // Record nonce to prevent replay
    nonces.add(apiKey, nonce);

    // Optional: per-key RPM enforcement
    if (entry.quota && entry.quota.rpm) {
      const key = `__rpm_${entry.value}`;
      req.app.locals.__rpm = req.app.locals.__rpm || new Map();
      const bucket = req.app.locals.__rpm.get(key) || { count: 0, resetAt: Date.now() + 60_000 };
      if (Date.now() > bucket.resetAt) {
        bucket.count = 0;
        bucket.resetAt = Date.now() + 60_000;
      }
      bucket.count += 1;
      req.app.locals.__rpm.set(key, bucket);
      if (bucket.count > entry.quota.rpm) {
        return res.status(429).json({ success: false, error: 'Per-key rate limit exceeded' });
      }
    }

    // Passed all checks
    return next();
  };
}

module.exports = requestGuard;

