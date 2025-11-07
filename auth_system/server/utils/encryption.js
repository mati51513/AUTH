const crypto = require('crypto');

class RequestEncryption {
    constructor() {
        // Generate or load encryption keys
        this.algorithm = 'aes-256-gcm';
        this.keyLength = 32;
        this.ivLength = 16;
        this.tagLength = 16;
        
        // In production, load from secure environment variables
        this.serverKey = process.env.ENCRYPTION_KEY || this.generateKey();
        this.hmacKey = process.env.HMAC_KEY || this.generateKey();
    }
    
    generateKey() {
        return crypto.randomBytes(this.keyLength).toString('hex');
    }
    
    // Encrypt data with AES-256-GCM
    encrypt(data) {
        try {
            const iv = crypto.randomBytes(this.ivLength);
            const key = Buffer.from(this.serverKey, 'hex');
            const cipher = crypto.createCipheriv(this.algorithm, key, iv);
            cipher.setAAD(Buffer.from('auth-request'));

            const plaintext = JSON.stringify(data);
            let encrypted = cipher.update(plaintext, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            const tag = cipher.getAuthTag();

            return {
                encrypted,
                iv: iv.toString('hex'),
                tag: tag.toString('hex'),
                timestamp: Date.now()
            };
        } catch (error) {
            throw new Error('Encryption failed: ' + error.message);
        }
    }
    
    // Decrypt data with AES-256-GCM
    decrypt(encryptedData) {
        try {
            const { encrypted, iv, tag, timestamp } = encryptedData;

            // Check timestamp (prevent replay attacks)
            const now = Date.now();
            if (Math.abs(now - timestamp) > 300000) { // 5 minutes
                throw new Error('Request expired');
            }

            const key = Buffer.from(this.serverKey, 'hex');
            const decipher = crypto.createDecipheriv(this.algorithm, key, Buffer.from(iv, 'hex'));
            decipher.setAAD(Buffer.from('auth-request'));
            decipher.setAuthTag(Buffer.from(tag, 'hex'));

            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return JSON.parse(decrypted);
        } catch (error) {
            throw new Error('Decryption failed: ' + error.message);
        }
    }
    
    // Generate HMAC signature for integrity verification
    generateSignature(data, timestamp) {
        const payload = JSON.stringify(data) + timestamp;
        return crypto.createHmac('sha256', this.hmacKey)
                    .update(payload)
                    .digest('hex');
    }
    
    // Verify HMAC signature
    verifySignature(data, timestamp, signature) {
        const expectedSignature = this.generateSignature(data, timestamp);
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    }
    
    // Middleware for decrypting incoming requests
    decryptMiddleware() {
        return (req, res, next) => {
            // Skip encryption for GET requests and public endpoints
            if (req.method === 'GET' || 
                req.path.includes('/public/') || 
                req.path.includes('/status') ||
                !req.headers['x-encrypted']) {
                return next();
            }
            
            try {
                const encryptedData = req.body;
                const signature = req.headers['x-signature'];
                const timestamp = req.headers['x-timestamp'];
                
                // In development, bypass strict header checks
                const isProd = (process.env.NODE_ENV || 'development') === 'production';
                if (!signature || !timestamp) {
                    if (!isProd) {
                        console.log('[ENCRYPTION] Missing signing headers; bypassing in development');
                        return next();
                    }
                    return res.status(400).json({ error: 'Missing security headers' });
                }
                
                // Verify signature first
                if (!this.verifySignature(encryptedData, timestamp, signature)) {
                    console.log(`[ENCRYPTION] Invalid signature from IP: ${req.ip}`);
                    return res.status(401).json({ error: 'Invalid request signature' });
                }
                
                // If body does not look encrypted, bypass (defensive)
                if (!encryptedData || typeof encryptedData !== 'object' ||
                    !encryptedData.encrypted || !encryptedData.iv || !encryptedData.tag) {
                    if (!isProd) {
                        console.log('[ENCRYPTION] Body not encrypted; bypassing in development');
                        return next();
                    }
                    return res.status(400).json({ error: 'Invalid encrypted request' });
                }

                // Decrypt the request body
                const decryptedData = this.decrypt(encryptedData);
                req.body = decryptedData;
                
                console.log(`[ENCRYPTION] Request decrypted successfully from IP: ${req.ip}`);
                next();
            } catch (error) {
                console.log(`[ENCRYPTION] Decryption error from IP: ${req.ip} - ${error.message}`);
                res.status(400).json({ error: 'Invalid encrypted request' });
            }
        };
    }
    
    // Middleware for encrypting outgoing responses
    encryptResponse() {
        return (req, res, next) => {
            // Skip encryption for non-API responses
            if (!req.path.includes('/api/') || req.headers['x-no-encryption']) {
                return next();
            }
            
            const originalJson = res.json;
            res.json = (data) => {
                try {
                    const encrypted = this.encrypt(data);
                    const timestamp = Date.now().toString();
                    const signature = this.generateSignature(encrypted, timestamp);
                    
                    res.setHeader('X-Encrypted', 'true');
                    res.setHeader('X-Signature', signature);
                    res.setHeader('X-Timestamp', timestamp);
                    
                    return originalJson.call(res, encrypted);
                } catch (error) {
                    console.error('[ENCRYPTION] Response encryption error:', error);
                    return originalJson.call(res, { error: 'Response encryption failed' });
                }
            };
            
            next();
        };
    }
    
    // Generate client-side encryption keys
    generateClientKeys() {
        return {
            publicKey: this.serverKey.substring(0, 32), // Simplified for demo
            timestamp: Date.now()
        };
    }
}

module.exports = RequestEncryption;
