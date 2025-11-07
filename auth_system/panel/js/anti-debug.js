// Anti-debugging and client-side protection system
(function() {
    'use strict';
    
    // Obfuscated variables
    const _0x1a2b = ['debugger', 'console', 'devtools', 'inspect'];
    const _0x3c4d = performance.now();
    let _0x5e6f = false;
    let _0x7g8h = 0;
    
    // Anti-debugger detection
    const detectDebugger = () => {
        const start = performance.now();
        debugger; // This will pause if debugger is open
        const end = performance.now();
        
        if (end - start > 100) {
            triggerProtection('debugger_detected');
            return true;
        }
        return false;
    };
    
    // Console detection
    const detectConsole = () => {
        let devtools = {
            open: false,
            orientation: null
        };
        
        const threshold = 160;
        setInterval(() => {
            if (window.outerHeight - window.innerHeight > threshold || 
                window.outerWidth - window.innerWidth > threshold) {
                if (!devtools.open) {
                    devtools.open = true;
                    triggerProtection('devtools_detected');
                }
            } else {
                devtools.open = false;
            }
        }, 500);
    };
    
    // Right-click and key combination blocking
    const blockInteractions = () => {
        // Block right-click
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            triggerProtection('context_menu_blocked');
            return false;
        });
        
        // Block common dev shortcuts
        document.addEventListener('keydown', (e) => {
            // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+Shift+C
            if (e.keyCode === 123 || 
                (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) ||
                (e.ctrlKey && e.keyCode === 85)) {
                e.preventDefault();
                triggerProtection('dev_shortcut_blocked');
                return false;
            }
        });
    };
    
    // DOM manipulation detection
    const protectDOM = () => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            const tagName = node.tagName?.toLowerCase();
                            if (tagName === 'script' || tagName === 'iframe') {
                                triggerProtection('dom_manipulation_detected');
                                node.remove();
                            }
                        }
                    });
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    };
    
    // Timing attack detection
    const detectTimingAttacks = () => {
        const originalSetTimeout = window.setTimeout;
        const originalSetInterval = window.setInterval;
        
        window.setTimeout = function(callback, delay) {
            if (delay < 10) {
                triggerProtection('timing_attack_detected');
                delay = Math.max(delay, 100);
            }
            return originalSetTimeout.call(this, callback, delay);
        };
        
        window.setInterval = function(callback, delay) {
            if (delay < 50) {
                triggerProtection('timing_attack_detected');
                delay = Math.max(delay, 100);
            }
            return originalSetInterval.call(this, callback, delay);
        };
    };
    
    // Memory usage monitoring
    const monitorMemory = () => {
        if (performance.memory) {
            setInterval(() => {
                const used = performance.memory.usedJSHeapSize;
                const total = performance.memory.totalJSHeapSize;
                
                if (used / total > 0.9) {
                    triggerProtection('memory_exhaustion_detected');
                }
            }, 5000);
        }
    };
    
    // Network request monitoring
    const monitorRequests = () => {
        const originalFetch = window.fetch;
        const originalXHR = window.XMLHttpRequest;
        
        window.fetch = function(...args) {
            const url = args[0];
            if (typeof url === 'string' && !url.startsWith(window.location.origin)) {
                console.warn('External request blocked:', url);
                return Promise.reject(new Error('External requests not allowed'));
            }
            return originalFetch.apply(this, args);
        };
        
        const XHROpen = originalXHR.prototype.open;
        originalXHR.prototype.open = function(method, url) {
            if (typeof url === 'string' && !url.startsWith(window.location.origin) && !url.startsWith('/')) {
                triggerProtection('external_request_blocked');
                throw new Error('External requests not allowed');
            }
            return XHROpen.apply(this, arguments);
        };
    };
    
    // Protection trigger
    const triggerProtection = (reason) => {
        _0x7g8h++;
        console.warn(`[PROTECTION] ${reason} - Count: ${_0x7g8h}`);
        
        // Progressive response
        if (_0x7g8h >= 3) {
            // Clear sensitive data
            sessionStorage.clear();
            localStorage.clear();
            
            // Redirect to safe page
            window.location.href = '/';
        } else if (_0x7g8h >= 2) {
            // Add visual interference
            document.body.style.filter = 'blur(2px)';
            setTimeout(() => {
                document.body.style.filter = 'none';
            }, 2000);
        }
        
        // Log to server
        fetch('/api/security/violation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reason,
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
                url: window.location.href
            })
        }).catch(() => {}); // Silent fail
    };
    
    // Integrity check
    const checkIntegrity = () => {
        const scripts = document.querySelectorAll('script[src]');
        scripts.forEach(script => {
            if (script.src && !script.src.startsWith(window.location.origin)) {
                triggerProtection('external_script_detected');
            }
        });
    };
    
    // Initialize all protections
    const init = () => {
        if (_0x5e6f) return; // Already initialized
        _0x5e6f = true;
        
        detectConsole();
        blockInteractions();
        protectDOM();
        detectTimingAttacks();
        monitorMemory();
        monitorRequests();
        checkIntegrity();
        
        // Continuous debugger detection
        setInterval(detectDebugger, 1000);
        
        // Random integrity checks
        setInterval(() => {
            if (Math.random() < 0.1) { // 10% chance every interval
                checkIntegrity();
            }
        }, 5000);
    };
    
    // Start protection when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Prevent script removal
    Object.defineProperty(window, 'antiDebugProtection', {
        value: true,
        writable: false,
        configurable: false
    });
    
})();