#include "../include/database.h"
#include <iostream>
#include <sqlite3.h>
#include <sstream>

// Using SQLite for simplicity
// In a production environment, you might want to use a more robust database

Database::Database(const std::string& dbPath) : m_dbPath(dbPath), m_dbHandle(nullptr), m_connected(false) {
}

Database::~Database() {
    if (m_connected) {
        disconnect();
    }
}

bool Database::connect() {
    if (m_connected) {
        return true;
    }
    
    int rc = sqlite3_open(m_dbPath.c_str(), (sqlite3**)&m_dbHandle);
    if (rc != SQLITE_OK) {
        std::cerr << "Cannot open database: " << sqlite3_errmsg((sqlite3*)m_dbHandle) << std::endl;
        sqlite3_close((sqlite3*)m_dbHandle);
        m_dbHandle = nullptr;
        return false;
    }
    
    m_connected = true;
    
    // Initialize tables if they don't exist
    if (!initializeTables()) {
        std::cerr << "Failed to initialize database tables" << std::endl;
        disconnect();
        return false;
    }
    
    return true;
}

void Database::disconnect() {
    if (!m_connected) {
        return;
    }
    
    sqlite3_close((sqlite3*)m_dbHandle);
    m_dbHandle = nullptr;
    m_connected = false;
}

bool Database::isConnected() const {
    return m_connected;
}

bool Database::initializeTables() {
    const char* createUserTableSQL = 
        "CREATE TABLE IF NOT EXISTS users ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT,"
        "username TEXT UNIQUE NOT NULL,"
        "password_hash TEXT NOT NULL,"
        "email TEXT UNIQUE NOT NULL,"
        "hwid TEXT,"
        "registration_date INTEGER NOT NULL,"
        "last_login_date INTEGER,"
        "subscription_end INTEGER,"
        "is_banned INTEGER DEFAULT 0,"
        "ban_reason TEXT"
        ");";
    
    const char* createLogTableSQL = 
        "CREATE TABLE IF NOT EXISTS logs ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT,"
        "username TEXT NOT NULL,"
        "action TEXT NOT NULL,"
        "ip TEXT,"
        "hwid TEXT,"
        "timestamp INTEGER NOT NULL,"
        "success INTEGER NOT NULL"
        ");";
    
    char* errMsg = nullptr;
    int rc = sqlite3_exec((sqlite3*)m_dbHandle, createUserTableSQL, nullptr, nullptr, &errMsg);
    if (rc != SQLITE_OK) {
        std::cerr << "SQL error: " << errMsg << std::endl;
        sqlite3_free(errMsg);
        return false;
    }
    
    rc = sqlite3_exec((sqlite3*)m_dbHandle, createLogTableSQL, nullptr, nullptr, &errMsg);
    if (rc != SQLITE_OK) {
        std::cerr << "SQL error: " << errMsg << std::endl;
        sqlite3_free(errMsg);
        return false;
    }
    
    return true;
}

std::string Database::escapeString(const std::string& str) {
    std::string result;
    result.reserve(str.length() * 2);
    
    for (char c : str) {
        if (c == '\'') {
            result += "''";
        } else {
            result += c;
        }
    }
    
    return result;
}

bool Database::addUser(const UserData& user) {
    std::stringstream ss;
    ss << "INSERT INTO users (username, password_hash, email, hwid, registration_date, last_login_date, subscription_end, is_banned, ban_reason) VALUES ("
       << "'" << escapeString(user.username) << "', "
       << "'" << escapeString(user.passwordHash) << "', "
       << "'" << escapeString(user.email) << "', "
       << "'" << escapeString(user.hwid) << "', "
       << user.registrationDate << ", "
       << user.lastLoginDate << ", "
       << user.subscriptionEnd << ", "
       << (user.isBanned ? 1 : 0) << ", "
       << "'" << escapeString(user.banReason) << "');";
    
    char* errMsg = nullptr;
    int rc = sqlite3_exec((sqlite3*)m_dbHandle, ss.str().c_str(), nullptr, nullptr, &errMsg);
    if (rc != SQLITE_OK) {
        std::cerr << "SQL error: " << errMsg << std::endl;
        sqlite3_free(errMsg);
        return false;
    }
    
    return true;
}

bool Database::updateUser(const UserData& user) {
    std::stringstream ss;
    ss << "UPDATE users SET "
       << "password_hash = '" << escapeString(user.passwordHash) << "', "
       << "email = '" << escapeString(user.email) << "', "
       << "hwid = '" << escapeString(user.hwid) << "', "
       << "last_login_date = " << user.lastLoginDate << ", "
       << "subscription_end = " << user.subscriptionEnd << ", "
       << "is_banned = " << (user.isBanned ? 1 : 0) << ", "
       << "ban_reason = '" << escapeString(user.banReason) << "' "
       << "WHERE id = " << user.id << ";";
    
    char* errMsg = nullptr;
    int rc = sqlite3_exec((sqlite3*)m_dbHandle, ss.str().c_str(), nullptr, nullptr, &errMsg);
    if (rc != SQLITE_OK) {
        std::cerr << "SQL error: " << errMsg << std::endl;
        sqlite3_free(errMsg);
        return false;
    }
    
    return true;
}

bool Database::deleteUser(int userId) {
    std::stringstream ss;
    ss << "DELETE FROM users WHERE id = " << userId << ";";
    
    char* errMsg = nullptr;
    int rc = sqlite3_exec((sqlite3*)m_dbHandle, ss.str().c_str(), nullptr, nullptr, &errMsg);
    if (rc != SQLITE_OK) {
        std::cerr << "SQL error: " << errMsg << std::endl;
        sqlite3_free(errMsg);
        return false;
    }
    
    return true;
}

bool Database::deleteUser(const std::string& username) {
    std::stringstream ss;
    ss << "DELETE FROM users WHERE username = '" << escapeString(username) << "';";
    
    char* errMsg = nullptr;
    int rc = sqlite3_exec((sqlite3*)m_dbHandle, ss.str().c_str(), nullptr, nullptr, &errMsg);
    if (rc != SQLITE_OK) {
        std::cerr << "SQL error: " << errMsg << std::endl;
        sqlite3_free(errMsg);
        return false;
    }
    
    return true;
}

UserData Database::getUserById(int userId) {
    UserData user;
    user.id = 0; // Default to invalid user
    
    std::stringstream ss;
    ss << "SELECT id, username, password_hash, email, hwid, registration_date, last_login_date, subscription_end, is_banned, ban_reason "
       << "FROM users WHERE id = " << userId << ";";
    
    sqlite3_stmt* stmt;
    int rc = sqlite3_prepare_v2((sqlite3*)m_dbHandle, ss.str().c_str(), -1, &stmt, nullptr);
    if (rc != SQLITE_OK) {
        std::cerr << "Failed to prepare statement: " << sqlite3_errmsg((sqlite3*)m_dbHandle) << std::endl;
        return user;
    }
    
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        user.id = sqlite3_column_int(stmt, 0);
        user.username = (const char*)sqlite3_column_text(stmt, 1);
        user.passwordHash = (const char*)sqlite3_column_text(stmt, 2);
        user.email = (const char*)sqlite3_column_text(stmt, 3);
        user.hwid = (const char*)sqlite3_column_text(stmt, 4);
        user.registrationDate = sqlite3_column_int64(stmt, 5);
        user.lastLoginDate = sqlite3_column_int64(stmt, 6);
        user.subscriptionEnd = sqlite3_column_int64(stmt, 7);
        user.isBanned = sqlite3_column_int(stmt, 8) != 0;
        user.banReason = (const char*)sqlite3_column_text(stmt, 9);
    }
    
    sqlite3_finalize(stmt);
    return user;
}

UserData Database::getUserByUsername(const std::string& username) {
    UserData user;
    user.id = 0; // Default to invalid user
    
    std::stringstream ss;
    ss << "SELECT id, username, password_hash, email, hwid, registration_date, last_login_date, subscription_end, is_banned, ban_reason "
       << "FROM users WHERE username = '" << escapeString(username) << "';";
    
    sqlite3_stmt* stmt;
    int rc = sqlite3_prepare_v2((sqlite3*)m_dbHandle, ss.str().c_str(), -1, &stmt, nullptr);
    if (rc != SQLITE_OK) {
        std::cerr << "Failed to prepare statement: " << sqlite3_errmsg((sqlite3*)m_dbHandle) << std::endl;
        return user;
    }
    
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        user.id = sqlite3_column_int(stmt, 0);
        user.username = (const char*)sqlite3_column_text(stmt, 1);
        user.passwordHash = (const char*)sqlite3_column_text(stmt, 2);
        user.email = (const char*)sqlite3_column_text(stmt, 3);
        user.hwid = (const char*)sqlite3_column_text(stmt, 4);
        user.registrationDate = sqlite3_column_int64(stmt, 5);
        user.lastLoginDate = sqlite3_column_int64(stmt, 6);
        user.subscriptionEnd = sqlite3_column_int64(stmt, 7);
        user.isBanned = sqlite3_column_int(stmt, 8) != 0;
        user.banReason = (const char*)sqlite3_column_text(stmt, 9);
    }
    
    sqlite3_finalize(stmt);
    return user;
}

UserData Database::getUserByEmail(const std::string& email) {
    UserData user;
    user.id = 0; // Default to invalid user
    
    std::stringstream ss;
    ss << "SELECT id, username, password_hash, email, hwid, registration_date, last_login_date, subscription_end, is_banned, ban_reason "
       << "FROM users WHERE email = '" << escapeString(email) << "';";
    
    sqlite3_stmt* stmt;
    int rc = sqlite3_prepare_v2((sqlite3*)m_dbHandle, ss.str().c_str(), -1, &stmt, nullptr);
    if (rc != SQLITE_OK) {
        std::cerr << "Failed to prepare statement: " << sqlite3_errmsg((sqlite3*)m_dbHandle) << std::endl;
        return user;
    }
    
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        user.id = sqlite3_column_int(stmt, 0);
        user.username = (const char*)sqlite3_column_text(stmt, 1);
        user.passwordHash = (const char*)sqlite3_column_text(stmt, 2);
        user.email = (const char*)sqlite3_column_text(stmt, 3);
        user.hwid = (const char*)sqlite3_column_text(stmt, 4);
        user.registrationDate = sqlite3_column_int64(stmt, 5);
        user.lastLoginDate = sqlite3_column_int64(stmt, 6);
        user.subscriptionEnd = sqlite3_column_int64(stmt, 7);
        user.isBanned = sqlite3_column_int(stmt, 8) != 0;
        user.banReason = (const char*)sqlite3_column_text(stmt, 9);
    }
    
    sqlite3_finalize(stmt);
    return user;
}

std::vector<UserData> Database::getAllUsers() {
    std::vector<UserData> users;
    
    const char* sql = "SELECT id, username, password_hash, email, hwid, registration_date, last_login_date, subscription_end, is_banned, ban_reason FROM users;";
    
    sqlite3_stmt* stmt;
    int rc = sqlite3_prepare_v2((sqlite3*)m_dbHandle, sql, -1, &stmt, nullptr);
    if (rc != SQLITE_OK) {
        std::cerr << "Failed to prepare statement: " << sqlite3_errmsg((sqlite3*)m_dbHandle) << std::endl;
        return users;
    }
    
    while (sqlite3_step(stmt) == SQLITE_ROW) {
        UserData user;
        user.id = sqlite3_column_int(stmt, 0);
        user.username = (const char*)sqlite3_column_text(stmt, 1);
        user.passwordHash = (const char*)sqlite3_column_text(stmt, 2);
        user.email = (const char*)sqlite3_column_text(stmt, 3);
        user.hwid = (const char*)sqlite3_column_text(stmt, 4);
        user.registrationDate = sqlite3_column_int64(stmt, 5);
        user.lastLoginDate = sqlite3_column_int64(stmt, 6);
        user.subscriptionEnd = sqlite3_column_int64(stmt, 7);
        user.isBanned = sqlite3_column_int(stmt, 8) != 0;
        user.banReason = (const char*)sqlite3_column_text(stmt, 9);
        
        users.push_back(user);
    }
    
    sqlite3_finalize(stmt);
    return users;
}

bool Database::validateCredentials(const std::string& username, const std::string& passwordHash) {
    std::stringstream ss;
    ss << "SELECT id FROM users WHERE username = '" << escapeString(username) << "' AND password_hash = '" << escapeString(passwordHash) << "';";
    
    sqlite3_stmt* stmt;
    int rc = sqlite3_prepare_v2((sqlite3*)m_dbHandle, ss.str().c_str(), -1, &stmt, nullptr);
    if (rc != SQLITE_OK) {
        std::cerr << "Failed to prepare statement: " << sqlite3_errmsg((sqlite3*)m_dbHandle) << std::endl;
        return false;
    }
    
    bool valid = (sqlite3_step(stmt) == SQLITE_ROW);
    sqlite3_finalize(stmt);
    
    return valid;
}

bool Database::updateHWID(const std::string& username, const std::string& hwid) {
    std::stringstream ss;
    ss << "UPDATE users SET hwid = '" << escapeString(hwid) << "' WHERE username = '" << escapeString(username) << "';";
    
    char* errMsg = nullptr;
    int rc = sqlite3_exec((sqlite3*)m_dbHandle, ss.str().c_str(), nullptr, nullptr, &errMsg);
    if (rc != SQLITE_OK) {
        std::cerr << "SQL error: " << errMsg << std::endl;
        sqlite3_free(errMsg);
        return false;
    }
    
    return true;
}

bool Database::validateHWID(const std::string& username, const std::string& hwid) {
    std::stringstream ss;
    ss << "SELECT id FROM users WHERE username = '" << escapeString(username) << "' AND hwid = '" << escapeString(hwid) << "';";
    
    sqlite3_stmt* stmt;
    int rc = sqlite3_prepare_v2((sqlite3*)m_dbHandle, ss.str().c_str(), -1, &stmt, nullptr);
    if (rc != SQLITE_OK) {
        std::cerr << "Failed to prepare statement: " << sqlite3_errmsg((sqlite3*)m_dbHandle) << std::endl;
        return false;
    }
    
    bool valid = (sqlite3_step(stmt) == SQLITE_ROW);
    sqlite3_finalize(stmt);
    
    return valid;
}

bool Database::updateLastLogin(const std::string& username) {
    std::stringstream ss;
    ss << "UPDATE users SET last_login_date = " << std::time(nullptr) << " WHERE username = '" << escapeString(username) << "';";
    
    char* errMsg = nullptr;
    int rc = sqlite3_exec((sqlite3*)m_dbHandle, ss.str().c_str(), nullptr, nullptr, &errMsg);
    if (rc != SQLITE_OK) {
        std::cerr << "SQL error: " << errMsg << std::endl;
        sqlite3_free(errMsg);
        return false;
    }
    
    return true;
}

bool Database::updateSubscription(const std::string& username, int days) {
    UserData user = getUserByUsername(username);
    if (user.id == 0) {
        return false;
    }
    
    std::time_t newEnd;
    if (user.subscriptionEnd < std::time(nullptr)) {
        // Subscription expired or not set, start from now
        newEnd = std::time(nullptr) + (days * 86400); // 86400 seconds in a day
    } else {
        // Add days to current subscription end
        newEnd = user.subscriptionEnd + (days * 86400);
    }
    
    std::stringstream ss;
    ss << "UPDATE users SET subscription_end = " << newEnd << " WHERE username = '" << escapeString(username) << "';";
    
    char* errMsg = nullptr;
    int rc = sqlite3_exec((sqlite3*)m_dbHandle, ss.str().c_str(), nullptr, nullptr, &errMsg);
    if (rc != SQLITE_OK) {
        std::cerr << "SQL error: " << errMsg << std::endl;
        sqlite3_free(errMsg);
        return false;
    }
    
    return true;
}

bool Database::banUser(const std::string& username, const std::string& reason) {
    std::stringstream ss;
    ss << "UPDATE users SET is_banned = 1, ban_reason = '" << escapeString(reason) << "' WHERE username = '" << escapeString(username) << "';";
    
    char* errMsg = nullptr;
    int rc = sqlite3_exec((sqlite3*)m_dbHandle, ss.str().c_str(), nullptr, nullptr, &errMsg);
    if (rc != SQLITE_OK) {
        std::cerr << "SQL error: " << errMsg << std::endl;
        sqlite3_free(errMsg);
        return false;
    }
    
    return true;
}

bool Database::unbanUser(const std::string& username) {
    std::stringstream ss;
    ss << "UPDATE users SET is_banned = 0, ban_reason = '' WHERE username = '" << escapeString(username) << "';";
    
    char* errMsg = nullptr;
    int rc = sqlite3_exec((sqlite3*)m_dbHandle, ss.str().c_str(), nullptr, nullptr, &errMsg);
    if (rc != SQLITE_OK) {
        std::cerr << "SQL error: " << errMsg << std::endl;
        sqlite3_free(errMsg);
        return false;
    }
    
    return true;
}

bool Database::addLog(const LogEntry& log) {
    std::stringstream ss;
    ss << "INSERT INTO logs (username, action, ip, hwid, timestamp, success) VALUES ("
       << "'" << escapeString(log.username) << "', "
       << "'" << escapeString(log.action) << "', "
       << "'" << escapeString(log.ip) << "', "
       << "'" << escapeString(log.hwid) << "', "
       << log.timestamp << ", "
       << (log.success ? 1 : 0) << ");";
    
    char* errMsg = nullptr;
    int rc = sqlite3_exec((sqlite3*)m_dbHandle, ss.str().c_str(), nullptr, nullptr, &errMsg);
    if (rc != SQLITE_OK) {
        std::cerr << "SQL error: " << errMsg << std::endl;
        sqlite3_free(errMsg);
        return false;
    }
    
    return true;
}

std::vector<LogEntry> Database::getLogs(int limit) {
    std::vector<LogEntry> logs;
    
    std::stringstream ss;
    ss << "SELECT id, username, action, ip, hwid, timestamp, success FROM logs ORDER BY timestamp DESC LIMIT " << limit << ";";
    
    sqlite3_stmt* stmt;
    int rc = sqlite3_prepare_v2((sqlite3*)m_dbHandle, ss.str().c_str(), -1, &stmt, nullptr);
    if (rc != SQLITE_OK) {
        std::cerr << "Failed to prepare statement: " << sqlite3_errmsg((sqlite3*)m_dbHandle) << std::endl;
        return logs;
    }
    
    while (sqlite3_step(stmt) == SQLITE_ROW) {
        LogEntry log;
        log.id = sqlite3_column_int(stmt, 0);
        log.username = (const char*)sqlite3_column_text(stmt, 1);
        log.action = (const char*)sqlite3_column_text(stmt, 2);
        log.ip = (const char*)sqlite3_column_text(stmt, 3);
        log.hwid = (const char*)sqlite3_column_text(stmt, 4);
        log.timestamp = sqlite3_column_int64(stmt, 5);
        log.success = sqlite3_column_int(stmt, 6) != 0;
        
        logs.push_back(log);
    }
    
    sqlite3_finalize(stmt);
    return logs;
}

std::vector<LogEntry> Database::getUserLogs(const std::string& username, int limit) {
    std::vector<LogEntry> logs;
    
    std::stringstream ss;
    ss << "SELECT id, username, action, ip, hwid, timestamp, success FROM logs "
       << "WHERE username = '" << escapeString(username) << "' "
       << "ORDER BY timestamp DESC LIMIT " << limit << ";";
    
    sqlite3_stmt* stmt;
    int rc = sqlite3_prepare_v2((sqlite3*)m_dbHandle, ss.str().c_str(), -1, &stmt, nullptr);
    if (rc != SQLITE_OK) {
        std::cerr << "Failed to prepare statement: " << sqlite3_errmsg((sqlite3*)m_dbHandle) << std::endl;
        return logs;
    }
    
    while (sqlite3_step(stmt) == SQLITE_ROW) {
        LogEntry log;
        log.id = sqlite3_column_int(stmt, 0);
        log.username = (const char*)sqlite3_column_text(stmt, 1);
        log.action = (const char*)sqlite3_column_text(stmt, 2);
        log.ip = (const char*)sqlite3_column_text(stmt, 3);
        log.hwid = (const char*)sqlite3_column_text(stmt, 4);
        log.timestamp = sqlite3_column_int64(stmt, 5);
        log.success = sqlite3_column_int(stmt, 6) != 0;
        
        logs.push_back(log);
    }
    
    sqlite3_finalize(stmt);
    return logs;
}