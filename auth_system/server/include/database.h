#pragma once

#include <string>
#include <vector>
#include <ctime>

struct UserData {
    int id;
    std::string username;
    std::string passwordHash;
    std::string email;
    std::string hwid;
    std::time_t registrationDate;
    std::time_t lastLoginDate;
    std::time_t subscriptionEnd;
    bool isBanned;
    std::string banReason;
};

struct LogEntry {
    int id;
    std::string username;
    std::string action;
    std::string ip;
    std::string hwid;
    std::time_t timestamp;
    bool success;
};

// HWID locking implementation
bool isHWIDLocked(const std::string& key, const std::string& hwid) {
    // In a real implementation, check if the key is locked to a specific HWID
    // If the key has no HWID, it's not locked
    // If the key has a HWID and it matches the provided HWID, access is granted
    // If the key has a HWID and it doesn't match, access is denied
    
    // For demo purposes, we'll simulate HWID locking
    std::string storedHWID = getKeyHWID(key);
    
    if (storedHWID.empty()) {
        // Key has no HWID, not locked
        return false;
    }
    
    // Key is locked to a specific HWID
    return storedHWID != hwid;
}

std::string getKeyHWID(const std::string& key) {
    // In a real implementation, fetch the HWID for the given key from the database
    // For demo purposes, we'll return a mock HWID
    
    // Simulate some keys having HWIDs and others not
    if (key.find('A') != std::string::npos) {
        return "HWID-12345";
    }
    
    return "";
}

    // User management
    bool addUser(const UserData& user);
    bool updateUser(const UserData& user);
    bool deleteUser(int userId);
    bool deleteUser(const std::string& username);
    UserData getUserById(int userId);
    UserData getUserByUsername(const std::string& username);
    UserData getUserByEmail(const std::string& email);
    std::vector<UserData> getAllUsers();

    // Authentication
    bool validateCredentials(const std::string& username, const std::string& passwordHash);
    bool updateHWID(const std::string& username, const std::string& hwid);
    bool validateHWID(const std::string& username, const std::string& hwid);
    bool updateLastLogin(const std::string& username);
    bool updateSubscription(const std::string& username, int days);
    bool banUser(const std::string& username, const std::string& reason);
    bool unbanUser(const std::string& username);

    // Logging
    bool addLog(const LogEntry& log);
    std::vector<LogEntry> getLogs(int limit = 100);
    std::vector<LogEntry> getUserLogs(const std::string& username, int limit = 100);

private:
    std::string m_dbPath;
    void* m_dbHandle;
    bool m_connected;

    // Helper methods
    bool initializeTables();
    std::string escapeString(const std::string& str);
};