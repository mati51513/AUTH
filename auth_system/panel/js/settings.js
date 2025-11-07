document.addEventListener('DOMContentLoaded', function() {
    // Initialize tabs
    initTabs();
    
    // Initialize form actions
    initFormActions();
    
    // Initialize theme options
    initThemeOptions();
    
    // Show notification on page load
    setTimeout(() => {
        showNotification('Settings loaded successfully', 'success');
    }, 1000);
});

// Initialize tabs
function initTabs() {
    const tabItems = document.querySelectorAll('.settings-tabs li');
    const tabContents = document.querySelectorAll('.settings-tab-content');
    
    tabItems.forEach(item => {
        item.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Update active tab
            tabItems.forEach(tab => tab.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabId + '-tab') {
                    content.classList.add('active');
                }
            });
        });
    });
}

// Initialize form actions
function initFormActions() {
    // General Settings
    document.getElementById('saveGeneralBtn')?.addEventListener('click', function() {
        showSavingIndicator(this);
        setTimeout(() => {
            showNotification('General settings saved successfully', 'success');
        }, 1000);
    });
    
    document.getElementById('resetGeneralBtn')?.addEventListener('click', function() {
        if (confirm('Are you sure you want to reset general settings to default?')) {
            showNotification('General settings reset to default', 'info');
        }
    });
    
    // Security Settings
    document.getElementById('saveSecurityBtn')?.addEventListener('click', function() {
        showSavingIndicator(this);
        setTimeout(() => {
            showNotification('Security settings saved successfully', 'success');
        }, 1000);
    });
    
    document.getElementById('resetSecurityBtn')?.addEventListener('click', function() {
        if (confirm('Are you sure you want to reset security settings to default?')) {
            showNotification('Security settings reset to default', 'info');
        }
    });
    
    // API Settings
    document.getElementById('saveApiBtn')?.addEventListener('click', function() {
        showSavingIndicator(this);
        setTimeout(() => {
            showNotification('API settings saved successfully', 'success');
        }, 1000);
    });
    
    document.getElementById('resetApiBtn')?.addEventListener('click', function() {
        if (confirm('Are you sure you want to reset API settings to default?')) {
            showNotification('API settings reset to default', 'info');
        }
    });
    
    document.getElementById('regenerateApiKey')?.addEventListener('click', function() {
        if (confirm('Are you sure you want to regenerate the API key? This will invalidate the current key.')) {
            const newKey = 'sk_live_' + generateRandomString(32);
            document.getElementById('apiKey').value = newKey;
            showNotification('API key regenerated', 'success');
        }
    });
    
    document.getElementById('copyApiKey')?.addEventListener('click', function() {
        const apiKey = document.getElementById('apiKey');
        apiKey.select();
        document.execCommand('copy');
        showNotification('API key copied to clipboard', 'success');
    });
    
    // Notification Settings
    document.getElementById('saveNotificationsBtn')?.addEventListener('click', function() {
        showSavingIndicator(this);
        setTimeout(() => {
            showNotification('Notification settings saved successfully', 'success');
        }, 1000);
    });
    
    document.getElementById('resetNotificationsBtn')?.addEventListener('click', function() {
        if (confirm('Are you sure you want to reset notification settings to default?')) {
            showNotification('Notification settings reset to default', 'info');
        }
    });
    
    // Backup Settings
    document.getElementById('createBackupBtn')?.addEventListener('click', function() {
        showLoadingIndicator(this, 'Creating backup...');
        setTimeout(() => {
            showNotification('Backup created successfully', 'success');
            this.innerHTML = '<i class="fas fa-download"></i> Create Backup';
            this.disabled = false;
        }, 2000);
    });
    
    document.getElementById('restoreBackupBtn')?.addEventListener('click', function() {
        const backupFile = document.getElementById('backupFile');
        if (!backupFile.value) {
            showNotification('Please select a backup file', 'error');
            return;
        }
        
        if (confirm('Are you sure you want to restore from this backup? This will overwrite current data.')) {
            showLoadingIndicator(this, 'Restoring...');
            setTimeout(() => {
                showNotification('Backup restored successfully', 'success');
                this.innerHTML = '<i class="fas fa-upload"></i> Restore Backup';
                this.disabled = false;
            }, 3000);
        }
    });
    
    // Appearance Settings
    document.getElementById('saveAppearanceBtn')?.addEventListener('click', function() {
        showSavingIndicator(this);
        setTimeout(() => {
            showNotification('Appearance settings saved successfully', 'success');
        }, 1000);
    });
    
    document.getElementById('resetAppearanceBtn')?.addEventListener('click', function() {
        if (confirm('Are you sure you want to reset appearance settings to default?')) {
            document.getElementById('primaryColor').value = '#8a2be2';
            document.getElementById('accentColor').value = '#00bfff';
            document.getElementById('glassmorphism').checked = true;
            document.getElementById('animations').checked = true;
            document.getElementById('animationSpeed').value = 1;
            document.getElementById('sidebarPosition').value = 'left';
            document.getElementById('compactMode').checked = false;
            
            // Reset theme options
            document.querySelectorAll('.theme-option').forEach(option => {
                option.classList.remove('active');
            });
            document.querySelector('.theme-option[data-theme="dark"]').classList.add('active');
            
            showNotification('Appearance settings reset to default', 'info');
        }
    });
    
    document.getElementById('previewAppearanceBtn')?.addEventListener('click', function() {
        showNotification('Preview mode activated. Changes will not be saved.', 'info');
        
        // Apply preview changes
        const primaryColor = document.getElementById('primaryColor').value;
        const accentColor = document.getElementById('accentColor').value;
        const glassmorphism = document.getElementById('glassmorphism').checked;
        const animations = document.getElementById('animations').checked;
        const animationSpeed = document.getElementById('animationSpeed').value;
        
        document.documentElement.style.setProperty('--primary-color', primaryColor);
        document.documentElement.style.setProperty('--accent-color', accentColor);
        document.documentElement.style.setProperty('--animation-speed', animationSpeed + 's');
        
        if (!glassmorphism) {
            document.querySelectorAll('.glass-card').forEach(card => {
                card.style.backdropFilter = 'none';
                card.style.backgroundColor = 'rgba(30, 30, 45, 0.95)';
            });
        } else {
            document.querySelectorAll('.glass-card').forEach(card => {
                card.style.backdropFilter = 'blur(10px)';
                card.style.backgroundColor = 'rgba(30, 30, 45, 0.7)';
            });
        }
        
        if (!animations) {
            document.querySelectorAll('.fade-in, .scroll-animate').forEach(el => {
                el.style.animation = 'none';
                el.style.opacity = 1;
                el.style.transform = 'none';
            });
        } else {
            document.querySelectorAll('.fade-in').forEach(el => {
                el.style.animation = '';
            });
            document.querySelectorAll('.scroll-animate').forEach(el => {
                el.style.animation = '';
            });
        }
    });
}

// Initialize theme options
function initThemeOptions() {
    const themeOptions = document.querySelectorAll('.theme-option');
    
    themeOptions.forEach(option => {
        option.addEventListener('click', function() {
            const theme = this.getAttribute('data-theme');
            
            // Update active theme
            themeOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
            // Apply theme
            applyTheme(theme);
        });
    });
}

// Apply theme
function applyTheme(theme) {
    let primaryColor, accentColor, bgColor, textColor;
    
    switch(theme) {
        case 'light':
            primaryColor = '#6200ea';
            accentColor = '#03a9f4';
            bgColor = '#f5f5f7';
            textColor = '#333333';
            break;
        case 'purple':
            primaryColor = '#9c27b0';
            accentColor = '#e91e63';
            bgColor = '#1a1a2e';
            textColor = '#ffffff';
            break;
        case 'blue':
            primaryColor = '#1976d2';
            accentColor = '#00bcd4';
            bgColor = '#0a1929';
            textColor = '#ffffff';
            break;
        default: // dark
            primaryColor = '#8a2be2';
            accentColor = '#00bfff';
            bgColor = '#121212';
            textColor = '#ffffff';
    }
    
    document.getElementById('primaryColor').value = primaryColor;
    document.getElementById('accentColor').value = accentColor;
    
    document.documentElement.style.setProperty('--primary-color', primaryColor);
    document.documentElement.style.setProperty('--accent-color', accentColor);
    document.documentElement.style.setProperty('--bg-color', bgColor);
    document.documentElement.style.setProperty('--text-color', textColor);
    
    showNotification(`${theme.charAt(0).toUpperCase() + theme.slice(1)} theme applied`, 'info');
}

// Show saving indicator
function showSavingIndicator(button) {
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    button.disabled = true;
    
    setTimeout(() => {
        button.innerHTML = originalText;
        button.disabled = false;
    }, 1000);
}

// Show loading indicator
function showLoadingIndicator(button, text) {
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
    button.disabled = true;
}

// Generate random string
function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
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

// Logout functionality
document.getElementById('logoutBtn')?.addEventListener('click', function(e) {
    e.preventDefault();
    showNotification('Logging out...', 'info');
    
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1500);
});