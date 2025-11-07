#pragma once

#include <string>
#include <map>
#include <vector>
#include <ctime>
#include "database.h"

struct TokenData {
    std::string username;
    std::time_t expiryTime;
    std::string hwid;
};

class AuthManager {
public:
    AuthManager(Database* db);
    ~AuthManager();

    // Authentication methods
    std::string generateToken(const std::string& username, const std::string& hwid);
    bool validateToken(const std::string& token, std::string& username);
    bool revokeToken(const std::string& token);
    bool revokeAllUserTokens(const std::string& username);

    // Password management
    std::string hashPassword(const std::string& password);
    bool verifyPassword(const std::string& password, const std::string& hash);
    std::string generateResetToken(const std::string& email);
    bool resetPassword(const std::string& resetToken, const std::string& newPassword);

    // Security methods
    bool isUserBanned(const std::string& username);
    bool validateHWID(const std::string& username, const std::string& hwid);
    bool logLoginAttempt(const std::string& username, const std::string& ip, const std::string& hwid, bool success);
    bool checkBruteForce(const std::string& username, const std::string& ip);

private:
    Database* m_database;
    std::map<std::string, TokenData> m_activeTokens;
    std::string m_secretKey;

    // Helper methods
    std::string generateRandomString(int length);
    void cleanExpiredTokens();
};