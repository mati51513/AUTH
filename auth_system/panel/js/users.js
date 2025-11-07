// Accounts Management JavaScript
let myLicensesCache = [];

document.addEventListener('DOMContentLoaded', function() {
    // Ensure authenticated
    if (typeof checkAuth === 'function') { checkAuth(); }

    // Load licenses on start
    loadMyLicenses();

    // Redeem key
    const redeemBtn = document.getElementById('redeemBtn');
    if (redeemBtn) {
        redeemBtn.addEventListener('click', redeemKey);
    }

    // Search licenses
    initSearch();

    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            renderMyLicenses(myLicensesCache);
        });
    }

    // Refresh
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            this.querySelector('i')?.classList.add('spin-animation');
            loadMyLicenses().finally(() => {
                this.querySelector('i')?.classList.remove('spin-animation');
            });
        });
    }
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
function initTableActions() { /* no-op for accounts */ }

// Initialize search functionality
function initSearch() {
    const searchInput = document.getElementById('userSearch');
    if (!searchInput) return;
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const rows = document.querySelectorAll('#myLicensesTableBody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });
}

// Initialize pagination
function initPagination() { /* not needed for my licenses */ }

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

// Load current user's licenses
async function loadMyLicenses() {
    try {
        const resp = await makeAuthenticatedRequest('/api/licenses/mine');
        if (!resp || resp.success === false) {
            showNotification(resp?.error || resp?.message || 'Failed to load licenses', 'error');
            return;
        }
        myLicensesCache = resp.data || [];
        renderMyLicenses(myLicensesCache);
        showNotification('Licenses loaded', 'success');
    } catch (e) {
        showNotification(`Failed to connect to server: ${e?.message || e}`, 'error');
    }
}

// Render licenses table
function renderMyLicenses(list) {
    const tbody = document.getElementById('myLicensesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const filter = (document.getElementById('statusFilter')?.value || 'all');
    const filtered = list.filter(item => filter === 'all' ? true : (item.status === filter));
    filtered.forEach(item => {
        const tr = document.createElement('tr');
        const expires = item.expiresAt ? new Date(item.expiresAt).toLocaleString() : '—';
        tr.innerHTML = `
            <td><code>${item.key}</code></td>
            <td>${item.status}</td>
            <td>${expires}</td>
            <td>${item.hwid || 'None'}</td>
            <td>
                <button class="btn-icon" title="Stats" data-id="${item._id}" data-key="${item.key}" data-action="stats"><i class="fas fa-chart-line"></i></button>
                <button class="btn-icon" title="Reset HWID" data-id="${item._id}" data-action="reset"><i class="fas fa-sync"></i></button>
            </td>`;
        tbody.appendChild(tr);
    });
    tbody.querySelectorAll('button[data-action="reset"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            resetHWIDSelf(id);
        });
    });
    tbody.querySelectorAll('button[data-action="stats"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            const key = this.getAttribute('data-key');
            openStatsModal(id, key);
        });
    });
}

// Redeem license key
async function redeemKey() {
    const input = document.getElementById('redeemInput');
    const key = (input?.value || '').trim();
    if (!key) {
        return showNotification('Enter a license key to redeem', 'error');
    }
    try {
        const resp = await makeAuthenticatedRequest('/api/licenses/redeem', {
            method: 'POST',
            data: { key }
        });
        if (resp && resp.success) {
            showNotification('License redeemed successfully', 'success');
            input.value = '';
            loadMyLicenses();
        } else {
            const err = resp?.message || resp?.error || 'Failed to redeem license';
            showNotification(err, 'error');
        }
    } catch (e) {
        showNotification(`Failed to connect to server: ${e?.message || e}`, 'error');
    }
}

// Open stats modal and fetch data
async function openStatsModal(id, key) {
    const modal = document.getElementById('licenseStatsModal');
    if (!modal) return;
    // Set basic info
    modal.style.display = 'block';
    document.getElementById('statsTotalLogs').textContent = '…';
    document.getElementById('statsValidations').textContent = '…';
    document.getElementById('statsSuccess').textContent = '…';
    document.getElementById('statsFailed').textContent = '…';
    document.getElementById('statsLastAction').textContent = '…';
    document.getElementById('statsLastTime').textContent = '…';
    document.getElementById('statsLastIP').textContent = '…';
    document.getElementById('statsLastHWID').textContent = '…';
    document.getElementById('statsLastUA').textContent = '…';
    document.getElementById('statsLastMsg').textContent = '…';

    try {
        const resp = await makeAuthenticatedRequest(`/api/licenses/mine/${id}/stats`);
        if (!resp || resp.success === false) {
            showNotification(resp?.error || resp?.message || 'Failed to load stats', 'error');
            return;
        }
        const d = resp.data;
        document.getElementById('statsTotalLogs').textContent = d.totalLogs;
        document.getElementById('statsValidations').textContent = d.validations;
        document.getElementById('statsSuccess').textContent = d.successCount;
        document.getElementById('statsFailed').textContent = d.failCount;
        if (d.lastEvent) {
            document.getElementById('statsLastAction').textContent = d.lastEvent.action;
            document.getElementById('statsLastTime').textContent = new Date(d.lastEvent.createdAt).toLocaleString();
            document.getElementById('statsLastIP').textContent = d.lastEvent.ipAddress || '—';
            document.getElementById('statsLastHWID').textContent = d.lastEvent.hwid || '—';
            document.getElementById('statsLastUA').textContent = d.lastEvent.userAgent || '—';
            document.getElementById('statsLastMsg').textContent = d.lastEvent.message || '—';
        } else {
            document.getElementById('statsLastAction').textContent = '—';
            document.getElementById('statsLastTime').textContent = '—';
            document.getElementById('statsLastIP').textContent = '—';
            document.getElementById('statsLastHWID').textContent = '—';
            document.getElementById('statsLastUA').textContent = '—';
            document.getElementById('statsLastMsg').textContent = '—';
        }
    } catch (e) {
        showNotification(`Failed to connect to server: ${e?.message || e}`, 'error');
    }

    // Close controls
    const closeBtn = document.getElementById('closeStatsModal');
    const dismissBtn = document.getElementById('dismissStats');
    [closeBtn, dismissBtn].forEach(btn => {
        if (btn) {
            btn.onclick = () => { modal.style.display = 'none'; };
        }
    });
    // Close on backdrop click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) { modal.style.display = 'none'; }
    });
}

// Reset HWID for self-owned license
async function resetHWIDSelf(id) {
    if (!id) return;
    if (!confirm('Reset HWID for this license?')) return;
    try {
        const resp = await makeAuthenticatedRequest(`/api/licenses/mine/${id}/reset-hwid`, {
            method: 'PUT'
        });
        if (resp && resp.success) {
            showNotification('HWID reset successfully', 'success');
            loadMyLicenses();
        } else {
            showNotification(resp?.error || 'Failed to reset HWID', 'error');
        }
    } catch (e) {
        showNotification('Failed to connect to server', 'error');
    }
}
