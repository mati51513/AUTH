const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class LicenseSecurity {
    constructor() {
        this.licensesFile = path.join(__dirname, '..', 'data', 'licenses.json');
        this.hwidFile = path.join(__dirname, '..', 'data', 'hwid-bindings.json');
        this.secretKey = process.env.LICENSE_SECRET || 'blackcode-license-secret-2024';
    }

    // Generate cryptographically secure license key
    generateSecureLicense(type = 'standard', expirationDays = 30) {
        const timestamp = Date.now();
        const expiration = timestamp + (expirationDays * 24 * 60 * 60 * 1000);
        const randomBytes = crypto.randomBytes(16).toString('hex');
        
        // Create license data
        const licenseData = {
            type,
            created: timestamp,
            expires: expiration,
            random: randomBytes
        };
        
        // Create signature
        const dataString = JSON.stringify(licenseData);
        const signature = crypto.createHmac('sha256', this.secretKey)
            .update(dataString)
            .digest('hex');
        
        // Combine into license key format: TYPE-XXXX-XXXX-XXXX-SIGNATURE
        const keyParts = [
            type.toUpperCase().substring(0, 4),
            randomBytes.substring(0, 8).toUpperCase(),
            timestamp.toString(36).toUpperCase(),
            expiration.toString(36).toUpperCase(),
            signature.substring(0, 8).toUpperCase()
        ];
        
        return {
            key: keyParts.join('-'),
            type,
            created: timestamp,
            expires: expiration,
            status: 'active',
            hwid: null,
            activations: 0,
            maxActivations: 1,
            lastUsed: null
        };
    }

    // Validate license key format and signature
    validateLicenseFormat(licenseKey) {
        if (!licenseKey || typeof licenseKey !== 'string') {
            return { valid: false, reason: 'Invalid key format' };
        }

        const parts = licenseKey.split('-');
        if (parts.length !== 5) {
            return { valid: false, reason: 'Invalid key structure' };
        }

        const [type, random, createdHex, expiresHex, sig] = parts;
        
        try {
            const created = parseInt(createdHex, 36);
            const expires = parseInt(expiresHex, 36);
            
            if (isNaN(created) || isNaN(expires)) {
                return { valid: false, reason: 'Invalid timestamp format' };
            }

            if (expires < Date.now()) {
                return { valid: false, reason: 'License expired' };
            }

            // Verify signature
            const licenseData = {
                type: type.toLowerCase(),
                created,
                expires,
                random: random.toLowerCase()
            };
            
            const dataString = JSON.stringify(licenseData);
            const expectedSig = crypto.createHmac('sha256', this.secretKey)
                .update(dataString)
                .digest('hex')
                .substring(0, 8)
                .toUpperCase();
            
            if (sig !== expectedSig) {
                return { valid: false, reason: 'Invalid signature' };
            }

            return { 
                valid: true, 
                data: { type: type.toLowerCase(), created, expires }
            };
        } catch (error) {
            return { valid: false, reason: 'Validation error' };
        }
    }

    // Generate hardware ID from system info
    generateHWID(systemInfo) {
        const {
            cpuId = '',
            motherboardSerial = '',
            diskSerial = '',
            macAddress = '',
            systemUUID = ''
        } = systemInfo;

        const combined = `${cpuId}|${motherboardSerial}|${diskSerial}|${macAddress}|${systemUUID}`;
        return crypto.createHash('sha256').update(combined).digest('hex').substring(0, 32);
    }

    // Validate license with HWID binding
    // Accept either a systemInfo object or a direct HWID string
    async validateLicense(licenseKey, systemInfoOrHWID = null) {
        try {
            // First validate format
            const formatCheck = this.validateLicenseFormat(licenseKey);
            if (!formatCheck.valid) {
                return { valid: false, reason: formatCheck.reason };
            }

            // Load license data
            const licenses = await this.loadLicenses();
            const license = licenses[licenseKey];
            
            if (!license) {
                return { valid: false, reason: 'License not found' };
            }

            if (license.status !== 'active') {
                return { valid: false, reason: `License is ${license.status}` };
            }

            if (license.expires < Date.now()) {
                return { valid: false, reason: 'License expired' };
            }

            // HWID validation
            if (systemInfoOrHWID) {
                let currentHWID = null;
                if (typeof systemInfoOrHWID === 'string') {
                    // Treat as provided HWID string
                    currentHWID = systemInfoOrHWID;
                } else {
                    // Assume object blob and derive HWID
                    currentHWID = this.generateHWID(systemInfoOrHWID);
                }
                
                if (license.hwid && license.hwid !== currentHWID) {
                    return { valid: false, reason: 'Hardware mismatch' };
                }

                // Bind HWID on first use
                if (!license.hwid) {
                    license.hwid = currentHWID;
                    license.activations = 1;
                    license.lastUsed = Date.now();
                    await this.saveLicenses(licenses);
                } else {
                    // Update last used
                    license.lastUsed = Date.now();
                    await this.saveLicenses(licenses);
                }
            }

            return {
                valid: true,
                license: {
                    key: licenseKey,
                    type: license.type,
                    expires: license.expires,
                    hwid: license.hwid,
                    activations: license.activations,
                    lastUsed: license.lastUsed
                }
            };
        } catch (error) {
            console.error('License validation error:', error);
            return { valid: false, reason: 'Validation failed' };
        }
    }

    // Reset HWID binding (admin function)
    async resetHWID(licenseKey) {
        try {
            const licenses = await this.loadLicenses();
            const license = licenses[licenseKey];
            
            if (!license) {
                return { success: false, reason: 'License not found' };
            }

            license.hwid = null;
            license.activations = 0;
            license.lastUsed = null;
            
            await this.saveLicenses(licenses);
            return { success: true };
        } catch (error) {
            return { success: false, reason: 'Reset failed' };
        }
    }

    // Ban/revoke license
    async revokeLicense(licenseKey, reason = 'Revoked by admin') {
        try {
            const licenses = await this.loadLicenses();
            const license = licenses[licenseKey];
            
            if (!license) {
                return { success: false, reason: 'License not found' };
            }

            license.status = 'revoked';
            license.revokedAt = Date.now();
            license.revokeReason = reason;
            
            await this.saveLicenses(licenses);
            return { success: true };
        } catch (error) {
            return { success: false, reason: 'Revocation failed' };
        }
    }

    // Load licenses from file
    async loadLicenses() {
        try {
            const data = await fs.readFile(this.licensesFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return {};
        }
    }

    // Save licenses to file
    async saveLicenses(licenses) {
        try {
            // Ensure directory exists
            await fs.mkdir(path.dirname(this.licensesFile), { recursive: true });
            await fs.writeFile(this.licensesFile, JSON.stringify(licenses, null, 2));
            return true;
        } catch (error) {
            console.error('Failed to save licenses:', error);
            return false;
        }
    }

    // Generate multiple licenses
    async generateBulkLicenses(count, type = 'standard', expirationDays = 30) {
        const licenses = await this.loadLicenses();
        const generated = [];

        for (let i = 0; i < count; i++) {
            const license = this.generateSecureLicense(type, expirationDays);
            licenses[license.key] = license;
            generated.push(license.key);
        }

        await this.saveLicenses(licenses);
        return generated;
    }

    // Get license statistics
    async getLicenseStats() {
        const licenses = await this.loadLicenses();
        const stats = {
            total: 0,
            active: 0,
            expired: 0,
            revoked: 0,
            bound: 0,
            unbound: 0
        };

        const now = Date.now();
        
        for (const license of Object.values(licenses)) {
            stats.total++;
            
            if (license.status === 'revoked') {
                stats.revoked++;
            } else if (license.expires < now) {
                stats.expired++;
            } else {
                stats.active++;
            }

            if (license.hwid) {
                stats.bound++;
            } else {
                stats.unbound++;
            }
        }

        return stats;
    }
}

module.exports = LicenseSecurity;
