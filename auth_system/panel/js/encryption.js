class ClientEncryption {
    constructor() {
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
        this.ivLength = 12;
        this.serverKey = null;
        this.hmacKey = null;
        this.initialized = false;
    }
    
    // Initialize encryption with server keys
    async initialize() {
        try {
            const response = await fetch('/api/encryption/keys', {
                method: 'GET',
                headers: {
                    'X-No-Encryption': 'true'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to get encryption keys');
            }
            
            const keys = await response.json();
            this.serverKey = await this.importKey(keys.publicKey);
            this.hmacKey = keys.publicKey; // Simplified for demo
            this.initialized = true;
            
            console.log('[ENCRYPTION] Client encryption initialized');
        } catch (error) {
            console.error('[ENCRYPTION] Initialization failed:', error);
            // Fallback to unencrypted mode
            this.initialized = false;
        }
    }
    
    // Import key for Web Crypto API
    async importKey(keyHex) {
        const keyBuffer = this.hexToArrayBuffer(keyHex);
        return await crypto.subtle.importKey(
            'raw',
            keyBuffer,
            { name: this.algorithm },
            false,
            ['encrypt', 'decrypt']
        );
    }
    
    // Convert hex string to ArrayBuffer
    hexToArrayBuffer(hex) {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return bytes.buffer;
    }
    
    // Convert ArrayBuffer to hex string
    arrayBufferToHex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
    
    // Encrypt data using Web Crypto API
    async encrypt(data) {
        if (!this.initialized || !this.serverKey) {
            return data; // Fallback to unencrypted
        }
        
        try {
            const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
            const encodedData = new TextEncoder().encode(JSON.stringify(data));
            
            const encrypted = await crypto.subtle.encrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                this.serverKey,
                encodedData
            );
            
            return {
                encrypted: this.arrayBufferToHex(encrypted),
                iv: this.arrayBufferToHex(iv.buffer),
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('[ENCRYPTION] Encryption failed:', error);
            return data; // Fallback to unencrypted
        }
    }
    
    // Decrypt response data
    async decrypt(encryptedData) {
        if (!this.initialized || !this.serverKey || typeof encryptedData !== 'object') {
            return encryptedData; // Return as-is if not encrypted
        }
        
        try {
            const { encrypted, iv, timestamp } = encryptedData;
            
            // Check timestamp
            const now = Date.now();
            if (Math.abs(now - timestamp) > 300000) { // 5 minutes
                throw new Error('Response expired');
            }
            
            const encryptedBuffer = this.hexToArrayBuffer(encrypted);
            const ivBuffer = this.hexToArrayBuffer(iv);
            
            const decrypted = await crypto.subtle.decrypt(
                {
                    name: this.algorithm,
                    iv: ivBuffer
                },
                this.serverKey,
                encryptedBuffer
            );
            
            const decryptedText = new TextDecoder().decode(decrypted);
            return JSON.parse(decryptedText);
        } catch (error) {
            console.error('[ENCRYPTION] Decryption failed:', error);
            return encryptedData; // Return as-is on error
        }
    }
    
    // Generate HMAC signature (simplified)
    async generateSignature(data, timestamp) {
        if (!this.hmacKey) return '';
        
        try {
            const payload = JSON.stringify(data) + timestamp;
            const encoder = new TextEncoder();
            const keyBuffer = this.hexToArrayBuffer(this.hmacKey);
            
            const key = await crypto.subtle.importKey(
                'raw',
                keyBuffer,
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['sign']
            );
            
            const signature = await crypto.subtle.sign(
                'HMAC',
                key,
                encoder.encode(payload)
            );
            
            return this.arrayBufferToHex(signature);
        } catch (error) {
            console.error('[ENCRYPTION] Signature generation failed:', error);
            return '';
        }
    }
    
    // Enhanced fetch with encryption
    async secureRequest(url, options = {}) {
        if (!this.initialized) {
            await this.initialize();
        }
        
        const method = options.method || 'GET';
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        let body = options.body;
        
        // Encrypt POST/PUT requests
        if (method !== 'GET' && body) {
            const data = typeof body === 'string' ? JSON.parse(body) : body;
            const encryptedData = await this.encrypt(data);
            const timestamp = Date.now().toString();
            const signature = await this.generateSignature(encryptedData, timestamp);
            
            headers['X-Encrypted'] = 'true';
            headers['X-Signature'] = signature;
            headers['X-Timestamp'] = timestamp;
            
            body = JSON.stringify(encryptedData);
        }
        
        try {
            const response = await fetch(url, {
                ...options,
                method,
                headers,
                body
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const responseData = await response.json();
            
            // Decrypt response if encrypted
            if (response.headers.get('X-Encrypted') === 'true') {
                return await this.decrypt(responseData);
            }
            
            return responseData;
        } catch (error) {
            console.error('[ENCRYPTION] Secure request failed:', error);
            throw error;
        }
    }
}

// Global instance
window.clientEncryption = new ClientEncryption();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.clientEncryption.initialize();
    });
} else {
    window.clientEncryption.initialize();
}