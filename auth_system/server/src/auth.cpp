#include "../include/auth.h"
#include <iostream>
#include <random>
#include <sstream>
#include <iomanip>
#include <chrono>
#include <openssl/sha.h>
#include <openssl/hmac.h>
#include <openssl/evp.h>
#include <openssl/rand.h>

AuthManager::AuthManager(Database* db) : m_db(db) {
    // Generate a random secret key for token signing
    unsigned char randomBytes[32];
    RAND_bytes(randomBytes, sizeof(randomBytes));
    
    std::stringstream ss;
    for (int i = 0; i < sizeof(randomBytes); i++) {
        ss << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(randomBytes[i]);
    }
    m_secretKey = ss.str();
}

AuthManager::~AuthManager() {
}

std::string AuthManager::generateToken(const std::string& username, const std::string& hwid) {
    // Create a token with format: username|hwid|expiry|signature
    std::time_t expiry = std::time(nullptr) + 86400; // 24 hours
    
    std::stringstream tokenData;
    tokenData << username << "|" << hwid << "|" << expiry;
    
    std::string signature = signData(tokenData.str());
    
    std::stringstream token;
    token << tokenData.str() << "|" << signature;
    
    return token.str();
}

bool AuthManager::validateToken(const std::string& token) {
    // Parse token
    std::stringstream ss(token);
    std::string username, hwid, expiryStr, signature;
    
    std::getline(ss, username, '|');
    std::getline(ss, hwid, '|');
    std::getline(ss, expiryStr, '|');
    std::getline(ss, signature, '|');
    
    if (username.empty() || hwid.empty() || expiryStr.empty() || signature.empty()) {
        return false;
    }
    
    // Check expiry
    std::time_t expiry = std::stoll(expiryStr);
    if (std::time(nullptr) > expiry) {
        return false;
    }
    
    // Verify signature
    std::stringstream tokenData;
    tokenData << username << "|" << hwid << "|" << expiryStr;
    
    std::string expectedSignature = signData(tokenData.str());
    if (signature != expectedSignature) {
        return false;
    }
    
    // Check if user is banned
    UserData user = m_db->getUserByUsername(username);
    if (user.id == 0) {
        return false; // User not found
    }
    
    if (user.isBanned) {
        return false; // User is banned
    }
    
    // Check if HWID matches
    if (!user.hwid.empty() && user.hwid != hwid) {
        return false; // HWID mismatch
    }
    
    return true;
}

std::string AuthManager::hashPassword(const std::string& password, const std::string& salt) {
    std::string saltToUse = salt;
    if (saltToUse.empty()) {
        saltToUse = generateSalt();
    }
    
    // Use PBKDF2 with SHA-256 for password hashing
    unsigned char hash[SHA256_DIGEST_LENGTH];
    PKCS5_PBKDF2_HMAC(password.c_str(), password.length(),
                      (const unsigned char*)saltToUse.c_str(), saltToUse.length(),
                      10000, // Iterations
                      EVP_sha256(),
                      SHA256_DIGEST_LENGTH, hash);
    
    std::stringstream ss;
    ss << saltToUse << "$"; // Store salt with hash
    for (int i = 0; i < SHA256_DIGEST_LENGTH; i++) {
        ss << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(hash[i]);
    }
    
    return ss.str();
}

bool AuthManager::verifyPassword(const std::string& password, const std::string& storedHash) {
    // Extract salt from stored hash
    size_t delimiterPos = storedHash.find('$');
    if (delimiterPos == std::string::npos) {
        return false;
    }
    
    std::string salt = storedHash.substr(0, delimiterPos);
    
    // Hash the provided password with the extracted salt
    std::string computedHash = hashPassword(password, salt);
    
    // Compare the computed hash with the stored hash
    return (computedHash == storedHash);
}

std::string AuthManager::generatePasswordResetToken(const std::string& username) {
    // Create a token with format: username|expiry|signature
    std::time_t expiry = std::time(nullptr) + 3600; // 1 hour
    
    std::stringstream tokenData;
    tokenData << username << "|" << expiry;
    
    std::string signature = signData(tokenData.str());
    
    std::stringstream token;
    token << tokenData.str() << "|" << signature;
    
    return token.str();
}

bool AuthManager::validatePasswordResetToken(const std::string& token) {
    // Parse token
    std::stringstream ss(token);
    std::string username, expiryStr, signature;
    
    std::getline(ss, username, '|');
    std::getline(ss, expiryStr, '|');
    std::getline(ss, signature, '|');
    
    if (username.empty() || expiryStr.empty() || signature.empty()) {
        return false;
    }
    
    // Check expiry
    std::time_t expiry = std::stoll(expiryStr);
    if (std::time(nullptr) > expiry) {
        return false;
    }
    
    // Verify signature
    std::stringstream tokenData;
    tokenData << username << "|" << expiryStr;
    
    std::string expectedSignature = signData(tokenData.str());
    return (signature == expectedSignature);
}

bool AuthManager::resetPassword(const std::string& token, const std::string& newPassword) {
    if (!validatePasswordResetToken(token)) {
        return false;
    }
    
    // Parse token to get username
    std::stringstream ss(token);
    std::string username, expiryStr, signature;
    
    std::getline(ss, username, '|');
    std::getline(ss, expiryStr, '|');
    std::getline(ss, signature, '|');
    
    // Get user data
    UserData user = m_db->getUserByUsername(username);
    if (user.id == 0) {
        return false; // User not found
    }
    
    // Update password
    user.passwordHash = hashPassword(newPassword, "");
    return m_db->updateUser(user);
}

bool AuthManager::checkBruteForce(const std::string& username, const std::string& ip) {
    // Get recent failed login attempts
    std::vector<LogEntry> logs = m_db->getUserLogs(username, 10);
    
    int failedAttempts = 0;
    std::time_t currentTime = std::time(nullptr);
    
    for (const auto& log : logs) {
        // Only count recent attempts (within last 10 minutes)
        if (log.action == "login" && !log.success && (currentTime - log.timestamp) < 600) {
            failedAttempts++;
        }
    }
    
    // If more than 5 failed attempts in the last 10 minutes, block the login
    return (failedAttempts >= 5);
}

std::string AuthManager::generateSalt() {
    unsigned char randomBytes[16];
    RAND_bytes(randomBytes, sizeof(randomBytes));
    
    std::stringstream ss;
    for (int i = 0; i < sizeof(randomBytes); i++) {
        ss << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(randomBytes[i]);
    }
    
    return ss.str();
}

std::string AuthManager::signData(const std::string& data) {
    unsigned char* digest = HMAC(EVP_sha256(), m_secretKey.c_str(), m_secretKey.length(),
                                (const unsigned char*)data.c_str(), data.length(), NULL, NULL);
    
    std::stringstream ss;
    for (int i = 0; i < SHA256_DIGEST_LENGTH; i++) {
        ss << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(digest[i]);
    }
    
    return ss.str();
}