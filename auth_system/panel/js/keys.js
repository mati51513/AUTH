// License Keys Management JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Track current key context and countdown state
    window.currentKeyId = null;
    window.currentExpiresAt = null;
    window.countdownInterval = null;

    // Initialize modals
    initModals();
    
    // Initialize table actions
    initTableActions();
    
    // Initialize search functionality
    initSearch();
    
    // Initialize pagination
    initPagination();
    
    // Initialize refresh button
    document.getElementById('refreshBtn').addEventListener('click', function() {
        this.querySelector('i').classList.add('spin-animation');
        setTimeout(() => {
            this.querySelector('i').classList.remove('spin-animation');
            showNotification('License keys refreshed successfully!', 'success');
        }, 1000);
    });
    
    // Initialize export button
    document.getElementById('exportBtn').addEventListener('click', function() {
        showNotification('License keys exported successfully!', 'success');
    });
    
    // Initialize generate key button
    document.getElementById('generateKeyBtn').addEventListener('click', function() {
        openModal('keyModal');
    });
    
    // Initialize generate button
    document.getElementById('generateBtn').addEventListener('click', function() {
        // Simulate generating key
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        setTimeout(() => {
            closeModal('keyModal');
            
            // Show generated key
            document.getElementById('viewKeyValue').textContent = generateRandomKey();
            document.getElementById('viewKeyType').textContent = document.getElementById('keyType').value;
            document.getElementById('viewKeyUser').textContent = document.getElementById('keyUser').value || 'Unassigned';
            document.getElementById('viewKeyHWID').textContent = document.getElementById('keyHWID').checked ? 'Enabled' : 'Disabled';
            // Hours-based expiry preview
            const hoursValue = parseInt(document.getElementById('keyHours').value, 10);
            if (!isNaN(hoursValue) && hoursValue > 0) {
                const expiresAt = new Date(Date.now() + hoursValue * 60 * 60 * 1000);
                document.getElementById('viewKeyExpires').textContent = expiresAt.toLocaleString();
                window.currentExpiresAt = expiresAt;
                startCountdown(expiresAt);
            } else {
                document.getElementById('viewKeyExpires').textContent = 'Never';
                window.currentExpiresAt = null;
                updateCountdownLabel(null);
            }
            
            openModal('viewKeyModal');
            showNotification('License key generated successfully!', 'success');
            
            // Reset button
            this.innerHTML = 'Generate';
        }, 1500);
    });
    
    // Initialize edit key button
    document.getElementById('editKeyBtn').addEventListener('click', function() {
        closeModal('viewKeyModal');
        openModal('keyModal');
        document.getElementById('modalTitle').textContent = 'Edit License Key';
    });
    
    // Initialize confirm delete button
    document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
        // Simulate deleting key
        setTimeout(() => {
            closeModal('deleteModal');
            showNotification('License key deleted successfully!', 'success');
        }, 500);
    });
    
    // Initialize copy buttons
    document.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', function() {
            const target = document.querySelector(this.getAttribute('data-clipboard-target'));
            const text = target.textContent;
            
            navigator.clipboard.writeText(text).then(() => {
                showNotification('Copied to clipboard!', 'success');
                
                // Show copy animation
                this.querySelector('i').className = 'fas fa-check';
                setTimeout(() => {
                    this.querySelector('i').className = 'fas fa-copy';
                }, 1500);
            });
        });
    });
});

// Initialize modals
function initModals() {
    // Close modal when clicking on close button or outside the modal
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal.id);
        });
    });
    
    // Close modal when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });
}

// Open modal
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// Initialize table actions
function initTableActions() {
    document.querySelectorAll('[data-action="view"]').forEach(button => {
        button.addEventListener('click', function() {
            const keyId = this.getAttribute('data-id');
            window.currentKeyId = keyId;
            // Simulate fetching key data
            const row = this.closest('tr');
            document.getElementById('viewKeyValue').textContent = row.cells[1].textContent;
            document.getElementById('viewKeyStatus').textContent = row.cells[4].querySelector('.badge').textContent;
            document.getElementById('viewKeyStatus').className = row.cells[4].querySelector('.badge').className;
            document.getElementById('viewKeyType').textContent = row.cells[3].querySelector('.badge').textContent;
            document.getElementById('viewKeyCreated').textContent = row.cells[5].textContent;
            document.getElementById('viewKeyExpires').textContent = row.cells[6].textContent;
            document.getElementById('viewKeyUser').textContent = row.cells[2].textContent;
            // Try to parse expiresAt and start countdown
            const expiresText = row.cells[6].textContent;
            const parsedDate = parseDate(expiresText);
            window.currentExpiresAt = parsedDate;
            startCountdown(parsedDate);
            
            openModal('viewKeyModal');
        });
    });
    
    document.querySelectorAll('[data-action="edit"]').forEach(button => {
        button.addEventListener('click', function() {
            const keyId = this.getAttribute('data-id');
            document.getElementById('modalTitle').textContent = 'Edit License Key';
            openModal('keyModal');
        });
    });
    
    document.querySelectorAll('[data-action="delete"]').forEach(button => {
        button.addEventListener('click', function() {
            const keyId = this.getAttribute('data-id');
            // Store the key ID for deletion
            document.getElementById('confirmDeleteBtn').setAttribute('data-id', keyId);
            openModal('deleteModal');
        });
    });
}

// Initialize search functionality
function initSearch() {
    const searchInput = document.getElementById('keySearch');
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const rows = document.querySelectorAll('#keysTableBody tr');
        
        rows.forEach(row => {
            const keyValue = row.cells[1].textContent.toLowerCase();
            const username = row.cells[2].textContent.toLowerCase();
            
            if (keyValue.includes(searchTerm) || username.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
}

// Initialize pagination
function initPagination() {
    const pageButtons = document.querySelectorAll('.btn-page');
    
    pageButtons.forEach(button => {
        button.addEventListener('click', function() {
            const page = this.getAttribute('data-page');
            
            // Remove active class from all buttons
            pageButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            if (page !== 'prev' && page !== 'next') {
                this.classList.add('active');
            }
            
            // Simulate page change
            showNotification('Page changed', 'info');
        });
    });
}

// Generate a secure license key: bcwtf + 27 chars (total 32)
function generateRandomKey() {
    // UI preview only; actual secure generation happens on the server
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let suffix = '';
    for (let i = 0; i < 27; i++) {
        suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `bcwtf${suffix}`;
}

// Countdown helpers
function parseDate(text) {
    if (!text || text.toLowerCase() === 'never') return null;
    const dt = new Date(text);
    return isNaN(dt.getTime()) ? null : dt;
}

function startCountdown(expiresAt) {
    if (window.countdownInterval) {
        clearInterval(window.countdownInterval);
        window.countdownInterval = null;
    }
    updateCountdownLabel(expiresAt);
    if (!expiresAt) return;
    window.countdownInterval = setInterval(() => {
        updateCountdownLabel(expiresAt);
    }, 1000);
}

function updateCountdownLabel(expiresAt) {
    const el = document.getElementById('viewKeyCountdown');
    if (!el) return;
    if (!expiresAt) {
        el.textContent = 'Never';
        return;
    }
    const now = Date.now();
    const end = expiresAt.getTime();
    let diff = Math.max(0, end - now);
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    diff -= days * 24 * 60 * 60 * 1000;
    const hours = Math.floor(diff / (60 * 60 * 1000));
    diff -= hours * 60 * 60 * 1000;
    const minutes = Math.floor(diff / (60 * 1000));
    diff -= minutes * 60 * 1000;
    const seconds = Math.floor(diff / 1000);
    el.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

// Simple token helper for authenticated requests
function getToken() {
    try { return localStorage.getItem('authToken'); } catch (e) { return null; }
}

// HWID reset button handler
document.addEventListener('DOMContentLoaded', function() {
    const resetBtn = document.getElementById('resetHWIDBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            if (!window.currentKeyId) {
                showNotification('Open a key first to reset HWID', 'error');
                return;
            }
            resetHWID(window.currentKeyId);
        });
    }
});

// Show notification if not defined in animations.js
if (typeof showNotification !== 'function') {
    function showNotification(message, type = 'info', duration = 3000) {
        const container = document.querySelector('.notifications-container');
        
        if (!container) {
            const newContainer = document.createElement('div');
            newContainer.classList.add('notifications-container');
            document.body.appendChild(newContainer);
        }
        
        const notification = document.createElement('div');
        notification.classList.add('notification', `notification-${type}`);
        
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';
        
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-${icon}"></i>
            </div>
            <div class="notification-content">
                ${message}
            </div>
            <div class="notification-close">
                <i class="fas fa-times"></i>
            </div>
        `;
        
        const notificationsContainer = document.querySelector('.notifications-container');
        notificationsContainer.appendChild(notification);
        
        // Show notification with animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Close notification on click
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        });
        
        // Auto close after duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, duration);
    }
}

// Key management functions
document.getElementById('freezeAllKeysBtn').addEventListener('click', async () => {
    if (confirm('Are you sure you want to freeze all active keys?')) {
        try {
            const response = await fetch('/api/licenses/freeze-all', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                showNotification('All keys have been frozen successfully', 'success');
                loadKeys(); // Refresh the keys list
            } else {
                showNotification(data.error, 'error');
            }
        } catch (err) {
            showNotification('Failed to freeze keys', 'error');
        }
    }
});

document.getElementById('unfreezeAllKeysBtn').addEventListener('click', async () => {
    if (confirm('Are you sure you want to unfreeze all frozen keys?')) {
        try {
            const response = await fetch('/api/licenses/unfreeze-all', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                showNotification('All keys have been unfrozen successfully', 'success');
                loadKeys(); // Refresh the keys list
            } else {
                showNotification(data.error, 'error');
            }
        } catch (err) {
            showNotification('Failed to unfreeze keys', 'error');
        }
    }
});

// Function to reset HWID for a specific key
async function resetHWID(keyId) {
    if (confirm('Are you sure you want to reset the HWID for this key?')) {
        try {
            const response = await fetch(`/api/licenses/reset-hwid/${keyId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                showNotification('HWID has been reset successfully', 'success');
                loadKeys(); // Refresh the keys list
            } else {
                showNotification(data.error, 'error');
            }
        } catch (err) {
            showNotification('Failed to reset HWID', 'error');
        }
    }
}

// Function to freeze a specific key
async function freezeKey(keyId) {
    try {
        const response = await fetch(`/api/licenses/freeze/${keyId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Key has been frozen successfully', 'success');
            loadKeys(); // Refresh the keys list
        } else {
            showNotification(data.error, 'error');
        }
    } catch (err) {
        showNotification('Failed to freeze key', 'error');
    }
}

// Function to unfreeze a specific key
async function unfreezeKey(keyId) {
    try {
        const response = await fetch(`/api/licenses/unfreeze/${keyId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Key has been unfrozen successfully', 'success');
            loadKeys(); // Refresh the keys list
        } else {
            showNotification(data.error, 'error');
        }
    } catch (err) {
        showNotification('Failed to unfreeze key', 'error');
    }
}
