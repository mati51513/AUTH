// Advanced Security Monitoring and Threat Detection
const fs = require('fs');
const path = require('path');

class SecurityMonitor {
    constructor() {
        this.suspiciousIPs = new Map(); // IP -> { count, lastSeen, blocked }
        this.attackPatterns = new Map(); // Pattern -> count
        this.logFile = path.join(__dirname, 'security.log');
        this.blockedIPs = new Set();
        
        // Initialize log file
        this.initializeLogging();
        
        // Clean up old entries every hour
        setInterval(() => this.cleanup(), 60 * 60 * 1000);
    }
    
    initializeLogging() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        this.log('🛡️ Security Monitor initialized');
    }
    
    log(message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}\n`;
        
        console.log(logEntry.trim());
        
        try {
            fs.appendFileSync(this.logFile, logEntry);
        } catch (error) {
            console.error('Failed to write to security log:', error);
        }
    }
    
    // Track suspicious activity
    trackSuspiciousActivity(ip, activity, severity = 'medium') {
        if (!this.suspiciousIPs.has(ip)) {
            this.suspiciousIPs.set(ip, { count: 0, lastSeen: Date.now(), blocked: false });
        }
        
        const record = this.suspiciousIPs.get(ip);
        record.count++;
        record.lastSeen = Date.now();
        
        this.log(`🚨 Suspicious activity from ${ip}: ${activity} (Count: ${record.count}, Severity: ${severity})`);
        
        // Auto-block after threshold
        const threshold = severity === 'high' ? 3 : severity === 'medium' ? 5 : 10;
        if (record.count >= threshold && !record.blocked) {
            this.blockIP(ip, `Exceeded ${severity} threat threshold`);
        }
        
        return record;
    }
    
    // Block IP address
    blockIP(ip, reason) {
        this.blockedIPs.add(ip);
        const record = this.suspiciousIPs.get(ip);
        if (record) {
            record.blocked = true;
        }
        
        this.log(`🔒 IP BLOCKED: ${ip} - Reason: ${reason}`);
        
        // In production, integrate with fail2ban or iptables
        // this.addToFirewall(ip);
    }
    
    // Check if IP is blocked
    isBlocked(ip) {
        return this.blockedIPs.has(ip);
    }
    
    // Unblock IP address
    unblockIP(ip) {
        this.blockedIPs.delete(ip);
        if (this.suspiciousIPs.has(ip)) {
            this.suspiciousIPs.get(ip).blocked = false;
        }
        this.log(`🔓 IP UNBLOCKED: ${ip}`);
    }
    
    // Clear all blocks (for development/testing)
    clearAllBlocks() {
        this.blockedIPs.clear();
        for (const [ip, record] of this.suspiciousIPs.entries()) {
            record.blocked = false;
            record.count = 0;
        }
        this.log(`🧹 All IP blocks cleared`);
    }
    
    // Analyze request patterns
    analyzeRequest(req) {
        const ip = req.ip;
        const userAgent = req.get('User-Agent') || '';
        const path = req.path;
        const method = req.method;
        
        const threats = [];
        
        // Check for blocked IP
        if (this.isBlocked(ip)) {
            threats.push({ type: 'blocked_ip', severity: 'high' });
        }
        
        // Analyze user agent
        const suspiciousAgents = [
            /bot/i, /crawler/i, /spider/i, /scraper/i, /scanner/i,
            /curl/i, /wget/i, /python/i, /php/i, /java/i, /perl/i,
            /nikto/i, /sqlmap/i, /nmap/i, /masscan/i, /zap/i
        ];
        
        for (const pattern of suspiciousAgents) {
            if (pattern.test(userAgent)) {
                threats.push({ type: 'suspicious_user_agent', severity: 'medium', pattern: pattern.source });
                break;
            }
        }
        
        // Check for empty or very short user agents
        if (!userAgent.trim() || userAgent.length < 10) {
            threats.push({ type: 'empty_user_agent', severity: 'medium' });
        }
        
        // Analyze request path
        const maliciousPaths = [
            /\.\./,  // Directory traversal
            /\/etc\/passwd/,  // System files
            /\/proc\//,  // Process info
            /wp-admin/i,  // WordPress attacks
            /phpmyadmin/i,  // Database attacks
            /\.env/,  // Environment files
            /\.git/,  // Git files
            /login\.php/i,  // PHP login attempts
            /shell/i,  // Web shells
            /eval\(/i,  // Code injection
            /base64_decode/i,  // Encoded payloads
        ];
        
        // Whitelist legitimate admin paths
        const legitimatePaths = [
            /^\/admin\.html$/i,
            /^\/dashboard\.html$/i,
            /^\/status\.html$/i,
            /^\/api\/admin\//i,
            /^\/api\/status\//i,
        ];
        
        // Check if path is whitelisted
        const isLegitimate = legitimatePaths.some(pattern => pattern.test(path));
        
        for (const pattern of maliciousPaths) {
            if (pattern.test(path) && !isLegitimate) {
                threats.push({ type: 'malicious_path', severity: 'high', pattern: pattern.source });
            }
        }
        
        // Check for SQL injection patterns in query parameters
        const queryString = JSON.stringify(req.query);
        const sqlPatterns = [
            /union.*select/i,
            /select.*from/i,
            /insert.*into/i,
            /delete.*from/i,
            /drop.*table/i,
            /exec\(/i,
            /script/i,
            /alert\(/i,
            /document\.cookie/i,
            /javascript:/i
        ];
        
        for (const pattern of sqlPatterns) {
            if (pattern.test(queryString)) {
                threats.push({ type: 'sql_injection', severity: 'high', pattern: pattern.source });
            }
        }
        
        // Check request frequency (simple rate limiting detection)
        const now = Date.now();
        const windowMs = 60 * 1000; // 1 minute
        const maxRequests = 60; // 60 requests per minute
        
        if (!this.requestCounts) {
            this.requestCounts = new Map();
        }
        
        if (!this.requestCounts.has(ip)) {
            this.requestCounts.set(ip, []);
        }
        
        const requests = this.requestCounts.get(ip);
        requests.push(now);
        
        // Clean old requests
        const recentRequests = requests.filter(time => now - time < windowMs);
        this.requestCounts.set(ip, recentRequests);
        
        if (recentRequests.length > maxRequests) {
            threats.push({ type: 'rate_limit_exceeded', severity: 'medium', count: recentRequests.length });
        }
        
        // Process threats
        for (const threat of threats) {
            this.trackSuspiciousActivity(ip, `${threat.type}: ${path}`, threat.severity);
            this.attackPatterns.set(threat.type, (this.attackPatterns.get(threat.type) || 0) + 1);
        }
        
        return threats;
    }
    
    // Get security statistics
    getStats() {
        return {
            blockedIPs: Array.from(this.blockedIPs),
            suspiciousIPs: Array.from(this.suspiciousIPs.entries()).map(([ip, data]) => ({
                ip,
                ...data
            })),
            attackPatterns: Object.fromEntries(this.attackPatterns),
            totalBlocked: this.blockedIPs.size,
            totalSuspicious: this.suspiciousIPs.size
        };
    }
    
    // Clean up old entries
    cleanup() {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        // Clean suspicious IPs
        for (const [ip, record] of this.suspiciousIPs.entries()) {
            if (now - record.lastSeen > maxAge && !record.blocked) {
                this.suspiciousIPs.delete(ip);
            }
        }
        
        // Clean request counts
        if (this.requestCounts) {
            for (const [ip, requests] of this.requestCounts.entries()) {
                const recentRequests = requests.filter(time => now - time < 60 * 60 * 1000); // 1 hour
                if (recentRequests.length === 0) {
                    this.requestCounts.delete(ip);
                } else {
                    this.requestCounts.set(ip, recentRequests);
                }
            }
        }
        
        this.log(`🧹 Cleanup completed. Active suspicious IPs: ${this.suspiciousIPs.size}, Blocked IPs: ${this.blockedIPs.size}`);
    }
    
    // Middleware function
    middleware() {
        return (req, res, next) => {
            const threats = this.analyzeRequest(req);
            
            // Block if IP is blocked
            if (this.isBlocked(req.ip)) {
                this.log(`🚫 Blocked request from ${req.ip}: ${req.path}`);
                return res.status(403).json({ error: 'Access denied' });
            }
            
            // Add security headers
            res.set({
                'X-Security-Monitor': 'active',
                'X-Request-ID': crypto.randomUUID()
            });
            
            next();
        };
    }
}

module.exports = SecurityMonitor;