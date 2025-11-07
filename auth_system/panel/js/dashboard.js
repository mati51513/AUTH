document.addEventListener('DOMContentLoaded', function() {
    // Navigation
    const navLinks = document.querySelectorAll('.sidebar-menu a');
    const contentSections = document.querySelectorAll('.content-section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Update active link
            navLinks.forEach(link => link.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding section
            const targetSection = this.getAttribute('data-section');
            contentSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === targetSection) {
                    section.classList.add('active');
                    document.querySelector('.header h1').textContent = targetSection.replace('-section', '').toUpperCase();
                }
            });
        });
    });
    
    // User dropdown
    const userInfoToggle = document.querySelector('.user-info-toggle');
    const userDropdown = document.querySelector('.user-dropdown');
    
    userInfoToggle.addEventListener('click', function() {
        userDropdown.classList.toggle('active');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!userInfoToggle.contains(e.target) && !userDropdown.contains(e.target)) {
            userDropdown.classList.remove('active');
        }
    });
    
    // Logout
    document.getElementById('logout-link').addEventListener('click', function(e) {
        e.preventDefault();
        // Clear session storage
        sessionStorage.removeItem('authToken');
        // Redirect to login page
        window.location.href = 'index.html';
    });
    
    // Modal functionality
    const openModal = (modalId) => {
        document.getElementById(modalId).classList.add('active');
    };
    
    const closeModal = (modalId) => {
        document.getElementById(modalId).classList.remove('active');
    };
    
    // Generate Key Modal
    document.getElementById('generate-key-btn').addEventListener('click', () => {
        openModal('generate-key-modal');
    });
    
    document.getElementById('close-generate-key-modal').addEventListener('click', () => {
        closeModal('generate-key-modal');
    });
    
    // Add User Modal
    document.getElementById('add-user-btn').addEventListener('click', () => {
        openModal('add-user-modal');
    });
    
    document.getElementById('close-add-user-modal').addEventListener('click', () => {
        closeModal('add-user-modal');
    });
    
    // Reset HWID Modal
    document.getElementById('close-reset-hwid-modal').addEventListener('click', () => {
        closeModal('reset-hwid-modal');
    });
    
    // Generate Keys
    document.getElementById('confirm-generate-key').addEventListener('click', function() {
        const game = document.getElementById('key-game').value;
        const duration = document.getElementById('key-duration').value;
        const quantity = document.getElementById('key-quantity').value;
        
        // In a real application, this would be an API call
        // For now, we'll simulate key generation
        alert(`Generated ${quantity} keys for ${game} with duration ${duration}`);
        
        // Add generated keys to the table
        populateKeysTable(generateMockKeys(quantity, game, duration));
        
        closeModal('generate-key-modal');
    });
    
    // Add User
    document.getElementById('confirm-add-user').addEventListener('click', function() {
        const username = document.getElementById('new-username').value;
        const email = document.getElementById('new-email').value;
        const password = document.getElementById('new-password').value;
        
        if (!username || !email || !password) {
            alert('Please fill in all fields');
            return;
        }
        
        // In a real application, this would be an API call
        // For now, we'll simulate user creation
        alert(`User ${username} created successfully`);
        
        // Add new user to the table
        const newUser = {
            username: username,
            email: email,
            registrationDate: new Date().toISOString().split('T')[0],
            lastLogin: 'Never',
            status: 'active'
        };
        
        const usersTable = document.getElementById('users-table-body');
        const row = createUserRow(newUser);
        usersTable.prepend(row);
        
        closeModal('add-user-modal');
        
        // Clear form
        document.getElementById('new-username').value = '';
        document.getElementById('new-email').value = '';
        document.getElementById('new-password').value = '';
    });
    
    // Reset HWID
    document.getElementById('confirm-reset-hwid').addEventListener('click', function() {
        const key = document.getElementById('reset-hwid-key').textContent;
        
        // In a real application, this would be an API call
        // For now, we'll simulate HWID reset
        alert(`HWID reset for key ${key}`);
        
        // Update the key in the table
        const keyRows = document.querySelectorAll('#keys-table-body tr');
        keyRows.forEach(row => {
            if (row.querySelector('td:first-child').textContent === key) {
                row.querySelector('td:nth-child(7)').innerHTML = '<span class="badge unused">UNUSED</span>';
            }
        });
        
        closeModal('reset-hwid-modal');
    });
    
    // Populate tables with mock data
    populateUsersTable(generateMockUsers());
    populateKeysTable(generateMockKeys(10));
    populateBansTable(generateMockBans());
    populateLogsTable(generateMockLogs());
    populateActivityTable(generateMockActivity());
    
    // Search functionality
    document.getElementById('search-key-btn').addEventListener('click', function() {
        const searchTerm = document.getElementById('key-search').value.toLowerCase();
        searchTable('keys-table-body', searchTerm);
    });
    
    document.getElementById('search-user-btn').addEventListener('click', function() {
        const searchTerm = document.getElementById('user-search').value.toLowerCase();
        searchTable('users-table-body', searchTerm);
    });
    
    document.getElementById('search-log-btn').addEventListener('click', function() {
        const searchTerm = document.getElementById('log-search').value.toLowerCase();
        searchTable('logs-table-body', searchTerm);
    });
});

// Helper functions
function searchTable(tableId, searchTerm) {
    const rows = document.querySelectorAll(`#${tableId} tr`);
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function populateUsersTable(users) {
    const usersTable = document.getElementById('users-table-body');
    usersTable.innerHTML = '';
    
    users.forEach(user => {
        const row = createUserRow(user);
        usersTable.appendChild(row);
    });
}

function createUserRow(user) {
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td>${user.username}</td>
        <td>${user.email}</td>
        <td>${user.registrationDate}</td>
        <td>${user.lastLogin}</td>
        <td><span class="badge ${user.status}">${user.status.toUpperCase()}</span></td>
        <td>
            <button class="action-btn small" title="Edit User"><i class="fas fa-edit"></i></button>
            <button class="action-btn small danger" title="Ban User"><i class="fas fa-ban"></i></button>
            <button class="action-btn small warning" title="Reset Password"><i class="fas fa-key"></i></button>
        </td>
    `;
    
    return row;
}

function populateKeysTable(keys) {
    const keysTable = document.getElementById('keys-table-body');
    keysTable.innerHTML = '';
    
    keys.forEach(key => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${key.key}</td>
            <td>${key.username || 'N/A'}</td>
            <td>${key.game}</td>
            <td>${key.duration}</td>
            <td>${key.created}</td>
            <td>${key.expires}</td>
            <td><span class="badge ${key.status}">${key.status.toUpperCase()}</span></td>
            <td>
                <button class="action-btn small reset-hwid-btn" title="Reset HWID" data-key="${key.key}" data-hwid="${key.hwid || 'None'}"><i class="fas fa-sync"></i></button>
                <button class="action-btn small danger" title="Ban Key"><i class="fas fa-ban"></i></button>
                <button class="action-btn small warning" title="Copy Key"><i class="fas fa-copy"></i></button>
            </td>
        `;
        
        keysTable.appendChild(row);
    });
    
    // Add event listeners for HWID reset buttons
    document.querySelectorAll('.reset-hwid-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const key = this.getAttribute('data-key');
            const hwid = this.getAttribute('data-hwid');
            
            document.getElementById('reset-hwid-key').textContent = key;
            document.getElementById('current-hwid').textContent = hwid;
            
            openModal('reset-hwid-modal');
        });
    });
}

function populateBansTable(bans) {
    const bansTable = document.getElementById('bans-table-body');
    bansTable.innerHTML = '';
    
    bans.forEach(ban => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${ban.username}</td>
            <td>${ban.reason}</td>
            <td>${ban.date}</td>
            <td>${ban.bannedBy}</td>
            <td>
                <button class="action-btn small success" title="Unban User"><i class="fas fa-undo"></i></button>
            </td>
        `;
        
        bansTable.appendChild(row);
    });
}

function populateLogsTable(logs) {
    const logsTable = document.getElementById('logs-table-body');
    logsTable.innerHTML = '';
    
    logs.forEach(log => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${log.timestamp}</td>
            <td>${log.user}</td>
            <td>${log.action}</td>
            <td>${log.ip}</td>
            <td>${log.details}</td>
        `;
        
        logsTable.appendChild(row);
    });
}

function populateActivityTable(activities) {
    const activityTable = document.getElementById('activity-table-body');
    activityTable.innerHTML = '';
    
    activities.forEach(activity => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${activity.username}</td>
            <td>${activity.action}</td>
            <td>${activity.timestamp}</td>
            <td>${activity.ip}</td>
            <td><span class="badge ${activity.status}">${activity.status.toUpperCase()}</span></td>
        `;
        
        activityTable.appendChild(row);
    });
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Mock data generators
function generateMockUsers() {
    const users = [
        {
            username: 'john_doe',
            email: 'john@example.com',
            registrationDate: '2023-05-15',
            lastLogin: '2023-06-01',
            status: 'active'
        },
        {
            username: 'jane_smith',
            email: 'jane@example.com',
            registrationDate: '2023-04-22',
            lastLogin: '2023-05-30',
            status: 'active'
        },
        {
            username: 'mike_jones',
            email: 'mike@example.com',
            registrationDate: '2023-03-10',
            lastLogin: '2023-05-28',
            status: 'inactive'
        },
        {
            username: 'sarah_wilson',
            email: 'sarah@example.com',
            registrationDate: '2023-02-05',
            lastLogin: '2023-05-25',
            status: 'active'
        },
        {
            username: 'alex_brown',
            email: 'alex@example.com',
            registrationDate: '2023-01-20',
            lastLogin: '2023-05-20',
            status: 'banned'
        }
    ];
    
    return users;
}

function generateMockKeys(count = 5, gameType = null, durationType = null) {
    const games = ['rust', 'fortnite', 'csgo', 'valorant', 'apex', 'other'];
    const durations = ['3d', '7d', '30d', '90d', '365d', 'lifetime'];
    const statuses = ['active', 'inactive', 'banned', 'expired', 'unused'];
    
    const keys = [];
    
    for (let i = 0; i < count; i++) {
        const game = gameType || games[Math.floor(Math.random() * games.length)];
        const duration = durationType || durations[Math.floor(Math.random() * durations.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        // Generate a random key
        const keyChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let key = '';
        for (let j = 0; j < 4; j++) {
            for (let k = 0; k < 4; k++) {
                key += keyChars.charAt(Math.floor(Math.random() * keyChars.length));
            }
            if (j < 3) key += '-';
        }
        
        // Calculate expiration date based on duration
        const created = new Date();
        created.setDate(created.getDate() - Math.floor(Math.random() * 30)); // Random creation date within the last 30 days
        
        let expires;
        if (duration === 'lifetime') {
            expires = 'Never';
        } else {
            const days = parseInt(duration);
            const expiresDate = new Date(created);
            expiresDate.setDate(expiresDate.getDate() + days);
            expires = expiresDate.toISOString().split('T')[0];
        }
        
        keys.push({
            key: key,
            username: status === 'unused' ? null : `user${i + 1}`,
            game: game,
            duration: duration === '3d' ? '3 Days' : 
                     duration === '7d' ? '1 Week' : 
                     duration === '30d' ? '1 Month' : 
                     duration === '90d' ? '3 Months' : 
                     duration === '365d' ? '1 Year' : 'Lifetime',
            created: created.toISOString().split('T')[0],
            expires: expires,
            status: status,
            hwid: status === 'unused' ? null : `HWID-${Math.random().toString(36).substring(2, 10)}`
        });
    }
    
    return keys;
}

function generateMockBans() {
    const bans = [
        {
            username: 'alex_brown',
            reason: 'Cheating',
            date: '2023-05-20',
            bannedBy: 'admin'
        },
        {
            username: 'hacker123',
            reason: 'Multiple accounts',
            date: '2023-05-15',
            bannedBy: 'admin'
        },
        {
            username: 'spammer42',
            reason: 'Spamming',
            date: '2023-05-10',
            bannedBy: 'moderator'
        },
        {
            username: 'toxic_player',
            reason: 'Toxic behavior',
            date: '2023-05-05',
            bannedBy: 'admin'
        },
        {
            username: 'payment_fraud',
            reason: 'Payment fraud',
            date: '2023-04-30',
            bannedBy: 'system'
        }
    ];
    
    return bans;
}

function generateMockLogs() {
    const logs = [
        {
            timestamp: '2023-06-01 14:32:45',
            user: 'admin',
            action: 'Generated 5 license keys',
            ip: '192.168.1.1',
            details: 'Game: Rust, Duration: 1 Month'
        },
        {
            timestamp: '2023-06-01 13:15:22',
            user: 'admin',
            action: 'Reset HWID',
            ip: '192.168.1.1',
            details: 'Key: ABCD-EFGH-IJKL-MNOP'
        },
        {
            timestamp: '2023-06-01 12:05:10',
            user: 'system',
            action: 'User banned',
            ip: '192.168.1.1',
            details: 'User: toxic_player, Reason: Toxic behavior'
        },
        {
            timestamp: '2023-06-01 11:30:45',
            user: 'john_doe',
            action: 'Login',
            ip: '192.168.1.2',
            details: 'Successful login'
        },
        {
            timestamp: '2023-06-01 10:15:30',
            user: 'unknown',
            action: 'Login attempt',
            ip: '192.168.1.3',
            details: 'Failed login attempt'
        }
    ];
    
    return logs;
}

function generateMockActivity() {
    const activities = [
        {
            username: 'john_doe',
            action: 'Login',
            timestamp: '2023-06-01 14:32:45',
            ip: '192.168.1.2',
            status: 'success'
        },
        {
            username: 'jane_smith',
            action: 'Key activation',
            timestamp: '2023-06-01 13:15:22',
            ip: '192.168.1.4',
            status: 'success'
        },
        {
            username: 'unknown',
            action: 'Login attempt',
            timestamp: '2023-06-01 12:05:10',
            ip: '192.168.1.5',
            status: 'danger'
        },
        {
            username: 'mike_jones',
            action: 'Password reset',
            timestamp: '2023-06-01 11:30:45',
            ip: '192.168.1.6',
            status: 'warning'
        },
        {
            username: 'sarah_wilson',
            action: 'HWID update',
            timestamp: '2023-06-01 10:15:30',
            ip: '192.168.1.7',
            status: 'success'
        }
    ];
    
    return activities;
}