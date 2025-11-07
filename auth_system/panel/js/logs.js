document.addEventListener('DOMContentLoaded', function() {
    // Initialize logs table
    initLogsTable();
    
    // Initialize date filters
    initDateFilters();
    
    // Initialize log filters
    initLogFilters();
    
    // Add event listeners
    addEventListeners();
    
    // Show notification on page load
    setTimeout(() => {
        showNotification('Logs loaded successfully', 'success');
    }, 1000);
});

// Initialize logs table
function initLogsTable() {
    // Simulate logs data
    const logs = generateSampleLogs(50);
    populateLogsTable(logs);
    updatePagination(logs.length, 10, 1);
}

// Initialize date filters
function initDateFilters() {
    const today = new Date();
    const todayFormatted = today.toISOString().split('T')[0];
    
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastWeekFormatted = lastWeek.toISOString().split('T')[0];
    
    document.getElementById('startDate').value = lastWeekFormatted;
    document.getElementById('endDate').value = todayFormatted;
    
    // Quick date filters
    document.getElementById('todayFilter').addEventListener('click', function() {
        document.getElementById('startDate').value = todayFormatted;
        document.getElementById('endDate').value = todayFormatted;
    });
    
    document.getElementById('last7DaysFilter').addEventListener('click', function() {
        document.getElementById('startDate').value = lastWeekFormatted;
        document.getElementById('endDate').value = todayFormatted;
    });
    
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthFormatted = lastMonth.toISOString().split('T')[0];
    
    document.getElementById('last30DaysFilter').addEventListener('click', function() {
        document.getElementById('startDate').value = lastMonthFormatted;
        document.getElementById('endDate').value = todayFormatted;
    });
}

// Initialize log filters
function initLogFilters() {
    // Level filters
    document.querySelectorAll('.level-filter').forEach(filter => {
        filter.addEventListener('click', function() {
            const level = this.getAttribute('data-level');
            
            if (level === 'all') {
                document.querySelectorAll('.level-filter').forEach(f => f.classList.remove('active'));
                this.classList.add('active');
                document.querySelectorAll('.log-row').forEach(row => row.style.display = '');
            } else {
                document.getElementById('allLevels').classList.remove('active');
                
                this.classList.toggle('active');
                
                // Get all active levels
                const activeLevels = [];
                document.querySelectorAll('.level-filter.active').forEach(f => {
                    activeLevels.push(f.getAttribute('data-level'));
                });
                
                // If no active levels, show all
                if (activeLevels.length === 0) {
                    document.getElementById('allLevels').classList.add('active');
                    document.querySelectorAll('.log-row').forEach(row => row.style.display = '');
                } else {
                    // Filter rows
                    document.querySelectorAll('.log-row').forEach(row => {
                        const rowLevel = row.getAttribute('data-level');
                        if (activeLevels.includes(rowLevel)) {
                            row.style.display = '';
                        } else {
                            row.style.display = 'none';
                        }
                    });
                }
            }
            
            updateVisibleRowCount();
        });
    });
}

// Add event listeners
function addEventListeners() {
    // Search
    document.getElementById('searchLogs').addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        
        document.querySelectorAll('.log-row').forEach(row => {
            const text = row.textContent.toLowerCase();
            if (text.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
        
        updateVisibleRowCount();
    });
    
    // Apply filters
    document.getElementById('applyFilters').addEventListener('click', function() {
        showNotification('Filters applied', 'success');
        // In a real app, this would fetch filtered logs from the server
        // For demo, we'll just simulate a refresh
        showLoadingIndicator(this, 'Applying filters...');
        
        setTimeout(() => {
            initLogsTable();
            this.innerHTML = '<i class="fas fa-filter"></i> Apply Filters';
            this.disabled = false;
        }, 1000);
    });
    
    // Refresh logs
    document.getElementById('refreshLogs').addEventListener('click', function() {
        showLoadingIndicator(this, 'Refreshing...');
        
        setTimeout(() => {
            initLogsTable();
            this.innerHTML = '<i class="fas fa-sync-alt"></i>';
            this.disabled = false;
            showNotification('Logs refreshed', 'success');
        }, 1000);
    });
    
    // Export logs
    document.getElementById('exportLogs').addEventListener('click', function() {
        showLoadingIndicator(this, 'Exporting...');
        
        setTimeout(() => {
            this.innerHTML = '<i class="fas fa-file-export"></i>';
            this.disabled = false;
            showNotification('Logs exported successfully', 'success');
        }, 1500);
    });
    
    // Clear logs
    document.getElementById('clearLogs').addEventListener('click', function() {
        if (confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
            showLoadingIndicator(this, 'Clearing...');
            
            setTimeout(() => {
                document.querySelector('.logs-table tbody').innerHTML = '';
                updatePagination(0, 10, 1);
                this.innerHTML = '<i class="fas fa-trash-alt"></i>';
                this.disabled = false;
                showNotification('All logs cleared', 'success');
            }, 1500);
        }
    });
    
    // View log details
    document.querySelector('.logs-table').addEventListener('click', function(e) {
        if (e.target.classList.contains('view-log-btn') || e.target.parentElement.classList.contains('view-log-btn')) {
            const row = e.target.closest('tr');
            const logId = row.getAttribute('data-id');
            const level = row.getAttribute('data-level');
            const timestamp = row.querySelector('td:nth-child(1)').textContent;
            const user = row.querySelector('td:nth-child(2)').textContent;
            const action = row.querySelector('td:nth-child(3)').textContent;
            const ip = row.querySelector('td:nth-child(4)').textContent;
            
            // Generate random details
            const details = {
                browser: ['Chrome', 'Firefox', 'Safari', 'Edge'][Math.floor(Math.random() * 4)],
                os: ['Windows 10', 'macOS', 'Linux', 'iOS', 'Android'][Math.floor(Math.random() * 5)],
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                referrer: ['direct', 'google.com', 'facebook.com', 'twitter.com'][Math.floor(Math.random() * 4)],
                sessionId: 'sess_' + Math.random().toString(36).substring(2, 15),
                requestId: 'req_' + Math.random().toString(36).substring(2, 15)
            };
            
            // Populate modal
            document.getElementById('logDetailsId').textContent = logId;
            document.getElementById('logDetailsTimestamp').textContent = timestamp;
            document.getElementById('logDetailsUser').textContent = user;
            document.getElementById('logDetailsAction').textContent = action;
            document.getElementById('logDetailsIP').textContent = ip;
            document.getElementById('logDetailsLevel').textContent = level.toUpperCase();
            document.getElementById('logDetailsLevel').className = `badge ${level}`;
            
            document.getElementById('logDetailsBrowser').textContent = details.browser;
            document.getElementById('logDetailsOS').textContent = details.os;
            document.getElementById('logDetailsUserAgent').textContent = details.userAgent;
            document.getElementById('logDetailsReferrer').textContent = details.referrer;
            document.getElementById('logDetailsSessionId').textContent = details.sessionId;
            document.getElementById('logDetailsRequestId').textContent = details.requestId;
            
            // Show modal
            document.getElementById('logDetailsModal').classList.add('show');
        }
    });
    
    // Close modal
    document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('show');
            });
        });
    });
    
    // Delete log
    document.getElementById('deleteLogBtn').addEventListener('click', function() {
        const logId = document.getElementById('logDetailsId').textContent;
        
        if (confirm('Are you sure you want to delete this log entry?')) {
            document.getElementById('logDetailsModal').classList.remove('show');
            
            // Find and remove the row
            const row = document.querySelector(`.log-row[data-id="${logId}"]`);
            if (row) {
                row.classList.add('fade-out');
                setTimeout(() => {
                    row.remove();
                    updateVisibleRowCount();
                    showNotification('Log entry deleted', 'success');
                }, 300);
            }
        }
    });
    
    // Pagination
    document.querySelector('.pagination').addEventListener('click', function(e) {
        if (e.target.classList.contains('page-link')) {
            e.preventDefault();
            const page = parseInt(e.target.getAttribute('data-page'));
            updatePagination(50, 10, page);
            
            // Scroll to top of table
            document.querySelector('.logs-table').scrollIntoView({ behavior: 'smooth' });
        }
    });
}

// Populate logs table
function populateLogsTable(logs) {
    const tbody = document.querySelector('.logs-table tbody');
    tbody.innerHTML = '';
    
    logs.forEach((log, index) => {
        if (index < 10) { // Show only first page
            const row = document.createElement('tr');
            row.className = 'log-row fade-in';
            row.setAttribute('data-id', log.id);
            row.setAttribute('data-level', log.level);
            
            row.innerHTML = `
                <td>${log.timestamp}</td>
                <td>${log.user}</td>
                <td>${log.action}</td>
                <td>${log.ip}</td>
                <td><span class="badge ${log.level}">${log.level.toUpperCase()}</span></td>
                <td>
                    <button class="btn btn-icon view-log-btn" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        }
    });
    
    updateVisibleRowCount();
}

// Update pagination
function updatePagination(totalItems, itemsPerPage, currentPage) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const pagination = document.querySelector('.pagination');
    pagination.innerHTML = '';
    
    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" data-page="${currentPage - 1}" href="#"><i class="fas fa-chevron-left"></i></a>`;
    pagination.appendChild(prevLi);
    
    // Page numbers
    const maxPages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);
    
    if (endPage - startPage + 1 < maxPages) {
        startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" data-page="${i}" href="#">${i}</a>`;
        pagination.appendChild(li);
    }
    
    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" data-page="${currentPage + 1}" href="#"><i class="fas fa-chevron-right"></i></a>`;
    pagination.appendChild(nextLi);
    
    // Update showing text
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalItems);
    document.getElementById('paginationInfo').textContent = `Showing ${start}-${end} of ${totalItems} entries`;
}

// Update visible row count
function updateVisibleRowCount() {
    const visibleRows = document.querySelectorAll('.log-row:not([style*="display: none"])').length;
    const totalRows = document.querySelectorAll('.log-row').length;
    document.getElementById('paginationInfo').textContent = `Showing ${visibleRows} of ${totalRows} entries`;
}

// Generate sample logs
function generateSampleLogs(count) {
    const logs = [];
    const users = ['admin', 'john.doe', 'jane.smith', 'guest', 'system'];
    const actions = [
        'User login', 'User logout', 'Password change', 'Profile update', 
        'License key generated', 'License key activated', 'License key deleted',
        'User created', 'User deleted', 'Settings updated', 'API request',
        'Failed login attempt', 'Password reset', 'File download', 'File upload'
    ];
    const levels = ['info', 'warning', 'error', 'success'];
    const ips = ['192.168.1.1', '10.0.0.1', '172.16.0.1', '127.0.0.1', '8.8.8.8'];
    
    for (let i = 0; i < count; i++) {
        const date = new Date();
        date.setMinutes(date.getMinutes() - Math.floor(Math.random() * 10000));
        
        logs.push({
            id: 'log_' + Math.random().toString(36).substring(2, 10),
            timestamp: date.toLocaleString(),
            user: users[Math.floor(Math.random() * users.length)],
            action: actions[Math.floor(Math.random() * actions.length)],
            ip: ips[Math.floor(Math.random() * ips.length)],
            level: levels[Math.floor(Math.random() * levels.length)]
        });
    }
    
    // Sort by timestamp (newest first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return logs;
}

// Show loading indicator
function showLoadingIndicator(button, text) {
    const originalText = button.innerHTML;
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
    button.disabled = true;
    
    return function() {
        button.innerHTML = originalText;
        button.disabled = false;
    };
}

// Show notification function
function showNotification(message, type = 'info') {
    const container = document.querySelector('.notifications-container');
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