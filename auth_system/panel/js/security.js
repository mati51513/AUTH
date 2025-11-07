/**
 * Security Module for Multi-Auth System
 * Implements DDoS protection, rate limiting, and other security features
 */

// Security Configuration
const securityConfig = {
    // DDoS Protection
    ddos: {
        enabled: true,
        maxRequestsPerMinute: 60,
        blockDuration: 10 * 60 * 1000, // 10 minutes in milliseconds
        whitelistedIPs: ['127.0.0.1'], // Add trusted IPs here
        sensitiveEndpoints: ['/login', '/register', '/api/keys', '/api/users']
    },
    
    // Rate Limiting
    rateLimit: {
        enabled: true,
        loginAttempts: {
            max: 5,
            windowMs: 15 * 60 * 1000, // 15 minutes
            blockDuration: 30 * 60 * 1000 // 30 minutes
        },
        apiRequests: {
            max: 100,
            windowMs: 60 * 1000 // 1 minute
        }
    },
    
    // HWID Locking
    hwidLock: {
        enabled: true,
        strictMode: false, // If true, requires exact hardware match
        components: ['cpu', 'gpu', 'motherboard', 'mac', 'diskSerial']
    },
    
    // Encryption
    encryption: {
        algorithm: 'aes-256-gcm',
        keyRotationDays: 30
    },
    
    // Session Security
    session: {
        lifetime: 24 * 60 * 60 * 1000, // 24 hours
        idleTimeout: 30 * 60 * 1000, // 30 minutes
        renewalThreshold: 10 * 60 * 1000 // 10 minutes
    }
};

// Initialize Security Module
document.addEventListener('DOMContentLoaded', function() {
    // Initialize security features
    initSecurity();
    
    // Log security initialization
    console.log('Security module initialized');
});

// Initialize Security Features
function initSecurity() {
    // Initialize DDoS protection
    if (securityConfig.ddos.enabled) {
        initDDoSProtection();
    }
    
    // Initialize rate limiting
    if (securityConfig.rateLimit.enabled) {
        initRateLimiting();
    }
    
    // Initialize HWID locking
    if (securityConfig.hwidLock.enabled) {
        initHWIDLocking();
    }
    
    // Initialize session security
    initSessionSecurity();
    
    // Add security event listeners
    addSecurityEventListeners();
}

// DDoS Protection Implementation
function initDDoSProtection() {
    // Simulated DDoS protection for frontend demo
    // In a real application, this would be implemented on the server
    
    // Track request timestamps
    const requestLog = [];
    
    // Intercept fetch and XMLHttpRequest to monitor API calls
    const originalFetch = window.fetch;
    window.fetch = function() {
        const url = arguments[0];
        
        // Check if this is a sensitive endpoint
        if (isSensitiveEndpoint(url)) {
            if (isDDoSDetected()) {
                console.warn('Potential DDoS attack detected. Request blocked.');
                showSecurityNotification('Unusual traffic detected. Please try again later.', 'error');
                return Promise.reject(new Error('Request blocked due to DDoS protection'));
            }
            
            // Log this request
            requestLog.push(Date.now());
            
            // Clean up old requests (older than 1 minute)
            const oneMinuteAgo = Date.now() - 60000;
            while (requestLog.length > 0 && requestLog[0] < oneMinuteAgo) {
                requestLog.shift();
            }
        }
        
        return originalFetch.apply(this, arguments);
    };
    
    // Also intercept XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function() {
        const url = arguments[1];
        
        // Check if this is a sensitive endpoint
        if (isSensitiveEndpoint(url)) {
            if (isDDoSDetected()) {
                console.warn('Potential DDoS attack detected. Request blocked.');
                showSecurityNotification('Unusual traffic detected. Please try again later.', 'error');
                throw new Error('Request blocked due to DDoS protection');
            }
            
            // Log this request
            requestLog.push(Date.now());
            
            // Clean up old requests (older than 1 minute)
            const oneMinuteAgo = Date.now() - 60000;
            while (requestLog.length > 0 && requestLog[0] < oneMinuteAgo) {
                requestLog.shift();
            }
        }
        
        return originalOpen.apply(this, arguments);
    };
    
    // Check if endpoint is in the sensitive list
    function isSensitiveEndpoint(url) {
        return securityConfig.ddos.sensitiveEndpoints.some(endpoint => url.includes(endpoint));
    }
    
    // Check if too many requests are being made
    function isDDoSDetected() {
        // Clean up old requests (older than 1 minute)
        const oneMinuteAgo = Date.now() - 60000;
        while (requestLog.length > 0 && requestLog[0] < oneMinuteAgo) {
            requestLog.shift();
        }
        
        // Check if we've exceeded the maximum requests per minute
        return requestLog.length >= securityConfig.ddos.maxRequestsPerMinute;
    }
}

// Rate Limiting Implementation
function initRateLimiting() {
    // Simulated rate limiting for frontend demo
    // In a real application, this would be implemented on the server
    
    // Track login attempts
    let loginAttempts = JSON.parse(sessionStorage.getItem('loginAttempts')) || [];
    
    // Clean up old attempts
    const loginWindowStart = Date.now() - securityConfig.rateLimit.loginAttempts.windowMs;
    loginAttempts = loginAttempts.filter(attempt => attempt > loginWindowStart);
    sessionStorage.setItem('loginAttempts', JSON.stringify(loginAttempts));
    
    // Check if login is blocked
    const loginBlockedUntil = parseInt(sessionStorage.getItem('loginBlockedUntil') || '0');
    if (loginBlockedUntil > Date.now()) {
        const remainingMinutes = Math.ceil((loginBlockedUntil - Date.now()) / 60000);
        showSecurityNotification(`Too many login attempts. Please try again in ${remainingMinutes} minutes.`, 'error');
    }
    
    // Intercept login form submission
    document.addEventListener('submit', function(e) {
        const form = e.target;
        
        // Check if this is a login form
        if (form.id === 'loginForm' || form.action.includes('login')) {
            // Check if login is blocked
            if (loginBlockedUntil > Date.now()) {
                e.preventDefault();
                const remainingMinutes = Math.ceil((loginBlockedUntil - Date.now()) / 60000);
                showSecurityNotification(`Too many login attempts. Please try again in ${remainingMinutes} minutes.`, 'error');
                return;
            }
            
            // Add this attempt
            loginAttempts.push(Date.now());
            sessionStorage.setItem('loginAttempts', JSON.stringify(loginAttempts));
            
            // Check if we've exceeded the maximum attempts
            if (loginAttempts.length >= securityConfig.rateLimit.loginAttempts.max) {
                e.preventDefault();
                
                // Block login for the configured duration
                const blockUntil = Date.now() + securityConfig.rateLimit.loginAttempts.blockDuration;
                sessionStorage.setItem('loginBlockedUntil', blockUntil.toString());
                
                // Show notification
                const blockMinutes = securityConfig.rateLimit.loginAttempts.blockDuration / 60000;
                showSecurityNotification(`Too many login attempts. Your account has been temporarily locked for ${blockMinutes} minutes.`, 'error');
            }
        }
    });
}

// HWID Locking Implementation
function initHWIDLocking() {
    // In a real application, this would use actual hardware identifiers
    // For this demo, we'll simulate HWID with browser fingerprinting
    
    // Generate a simulated hardware ID
    const hwid = generateSimulatedHWID();
    
    // Store the HWID if not already stored
    if (!localStorage.getItem('hwid')) {
        localStorage.setItem('hwid', hwid);
    }
    
    // Check if the current HWID matches the stored one
    const storedHWID = localStorage.getItem('hwid');
    if (storedHWID && !isHWIDMatch(hwid, storedHWID)) {
        // In strict mode, log the user out
        if (securityConfig.hwidLock.strictMode) {
            showSecurityNotification('Hardware signature mismatch. Please log in again.', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000);
        } else {
            // In non-strict mode, just show a warning
            showSecurityNotification('Hardware signature changed. This has been logged for security purposes.', 'warning');
            // Update the stored HWID
            localStorage.setItem('hwid', hwid);
        }
    }
}

// Generate a simulated hardware ID
function generateSimulatedHWID() {
    const components = [];
    
    // Browser and OS info
    components.push(navigator.userAgent);
    
    // Screen properties
    components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
    
    // Timezone
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
    
    // Available browser plugins
    if (navigator.plugins) {
        const pluginsString = Array.from(navigator.plugins)
            .map(p => p.name)
            .join('|');
        components.push(pluginsString);
    }
    
    // Canvas fingerprint (simplified)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('HWID Fingerprint', 0, 0);
    components.push(canvas.toDataURL());
    
    // Generate a hash of all components
    return hashString(components.join('|'));
}

// Check if HWIDs match
function isHWIDMatch(hwid1, hwid2) {
    if (securityConfig.hwidLock.strictMode) {
        // In strict mode, require exact match
        return hwid1 === hwid2;
    } else {
        // In non-strict mode, calculate similarity
        const similarity = calculateStringSimilarity(hwid1, hwid2);
        return similarity >= 0.7; // 70% similarity threshold
    }
}

// Calculate string similarity (Levenshtein distance based)
function calculateStringSimilarity(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    
    // Create a matrix of distances
    const matrix = Array(len1 + 1).fill().map(() => Array(len2 + 1).fill(0));
    
    // Initialize the matrix
    for (let i = 0; i <= len1; i++) {
        matrix[i][0] = i;
    }
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }
    
    // Fill the matrix
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1, // deletion
                matrix[i][j - 1] + 1, // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }
    
    // Calculate similarity as 1 - normalized distance
    const maxLen = Math.max(len1, len2);
    const distance = matrix[len1][len2];
    return 1 - (distance / maxLen);
}

// Session Security Implementation
function initSessionSecurity() {
    // Check if user is logged in
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    
    if (isLoggedIn) {
        // Get session data
        const sessionStart = parseInt(sessionStorage.getItem('sessionStart') || '0');
        const lastActivity = parseInt(sessionStorage.getItem('lastActivity') || '0');
        const now = Date.now();
        
        // Check session lifetime
        if (now - sessionStart > securityConfig.session.lifetime) {
            // Session expired
            showSecurityNotification('Your session has expired. Please log in again.', 'info');
            logoutUser();
            return;
        }
        
        // Check idle timeout
        if (now - lastActivity > securityConfig.session.idleTimeout) {
            // Session idle timeout
            showSecurityNotification('Your session has timed out due to inactivity. Please log in again.', 'info');
            logoutUser();
            return;
        }
        
        // Update last activity
        sessionStorage.setItem('lastActivity', now.toString());
        
        // Check if session needs renewal
        if (now - sessionStart > securityConfig.session.lifetime - securityConfig.session.renewalThreshold) {
            // Renew session
            renewSession();
        }
        
        // Set up activity tracking
        trackUserActivity();
    }
}

// Track user activity
function trackUserActivity() {
    // Update last activity on user interaction
    ['click', 'keypress', 'scroll', 'mousemove', 'touchstart'].forEach(eventType => {
        document.addEventListener(eventType, function() {
            sessionStorage.setItem('lastActivity', Date.now().toString());
        });
    });
    
    // Set up idle timeout check
    setInterval(function() {
        const lastActivity = parseInt(sessionStorage.getItem('lastActivity') || '0');
        const now = Date.now();
        
        // Check idle timeout
        if (now - lastActivity > securityConfig.session.idleTimeout) {
            // Session idle timeout
            showSecurityNotification('Your session has timed out due to inactivity. Please log in again.', 'info');
            logoutUser();
        }
    }, 60000); // Check every minute
}

// Renew session
function renewSession() {
    // In a real application, this would make an API call to renew the session
    console.log('Renewing session...');
    
    // Update session start time
    sessionStorage.setItem('sessionStart', Date.now().toString());
    
    // Show notification
    showSecurityNotification('Your session has been renewed.', 'info');
}

// Logout user
function logoutUser() {
    // Clear session storage
    sessionStorage.clear();
    
    // Redirect to login page
    setTimeout(function() {
        window.location.href = 'index.html';
    }, 2000);
}

// Add security event listeners
function addSecurityEventListeners() {
    // Listen for visibility changes (tab switching)
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            // User returned to the tab
            const lastActivity = parseInt(sessionStorage.getItem('lastActivity') || '0');
            const now = Date.now();
            
            // If away for too long, check session
            if (now - lastActivity > 60000) { // 1 minute
                initSessionSecurity();
            }
        }
    });
    
    // Listen for storage events (for multi-tab synchronization)
    window.addEventListener('storage', function(e) {
        if (e.key === 'isLoggedIn' && e.newValue === 'false') {
            // Logged out in another tab
            showSecurityNotification('You have been logged out in another tab.', 'info');
            setTimeout(function() {
                window.location.reload();
            }, 2000);
        }
    });
}

// Simple string hashing function
function hashString(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    
    return hash.toString(16); // Convert to hex string
}

// Show security notification
function showSecurityNotification(message, type = 'info') {
    // Check if the showNotification function exists (defined in other JS files)
    if (typeof showNotification === 'function') {
        showNotification(message, type);
    } else {
        // Fallback notification
        console.log(`Security notification (${type}): ${message}`);
        
        // Create a simple notification if the container exists
        const container = document.querySelector('.notifications-container');
        if (container) {
            const notification = document.createElement('div');
            notification.className = `notification ${type} fade-in`;
            
            let icon;
            switch(type) {
                case 'success':
                    icon = 'fa-check-circle';
                    break;
                case 'error':
                    icon = 'fa-exclamation-circle';
                    break;
                case 'warning':
                    icon = 'fa-exclamation-triangle';
                    break;
                default:
                    icon = 'fa-info-circle';
            }
            
            notification.innerHTML = `
                <i class="fas ${icon}"></i>
                <span>${message}</span>
                <button class="notification-close"><i class="fas fa-times"></i></button>
            `;
            
            container.appendChild(notification);
            
            // Add event listener to close button
            notification.querySelector('.notification-close').addEventListener('click', function() {
                notification.classList.add('fade-out');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            });
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.classList.add('fade-out');
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.remove();
                        }
                    }, 300);
                }
            }, 5000);
        }
    }
}