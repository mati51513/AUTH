// Authentication utilities for the admin panel

// Check if user is authenticated
function checkAuth() {
    const token = localStorage.getItem('authToken');
    const username = localStorage.getItem('username');

    if (!token || !username) {
        // Redirect to login if not authenticated
        window.location.href = 'index.html';
        return false;
    }

    // Verify token with server (fallback to fetch if jQuery unavailable)
    if (window.$ && $.ajax) {
        $.ajax({
            url: '/api/auth/verify',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            success: function(response) {
                if (!response || response.success === false) {
                    logout();
                }
            },
            error: function() {
                logout();
            }
        });
    } else {
        fetch('/api/auth/verify', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(r => r.json())
        .then(response => {
            if (!response || response.success === false) {
                logout();
            }
        })
        .catch(() => logout());
    }

    return true;
}

// Logout function
function logout() {
    try {
        localStorage.removeItem('authToken');
        localStorage.removeItem('username');
        localStorage.removeItem('userRole');
    } catch (e) {}
    window.location.href = 'index.html';
}

// Get current user info
function getCurrentUser() {
    return {
        username: localStorage.getItem('username'),
        role: localStorage.getItem('userRole'),
        token: localStorage.getItem('authToken')
    };
}

// Check if user has admin privileges
function isAdmin() {
    const role = localStorage.getItem('userRole');
    return role === 'admin' || role === 'owner';
}

// Make authenticated API request
function makeAuthenticatedRequest(url, options = {}) {
    const token = localStorage.getItem('authToken');

    if (!token) {
        logout();
        return Promise.reject('No authentication token');
    }

    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    // Merge options
    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...(options.headers || {})
        }
    };

    if (window.$ && $.ajax) {
        return $.ajax(url, finalOptions);
    }
    const fetchOptions = {
        method: finalOptions.method || 'GET',
        headers: finalOptions.headers,
        body: finalOptions.data ? JSON.stringify(finalOptions.data) : undefined
    };
    return fetch(url, fetchOptions).then(r => r.json());
}

// Setup logout button handler (vanilla JS fallback when jQuery is absent)
document.addEventListener('DOMContentLoaded', function() {
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
});
