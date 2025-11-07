#pragma once

#include <string>
#include <vector>
#include <map>
#include <memory>
#include <functional>
#include <mutex>
#include "database.h"
#include "auth.h"

// License key structure
struct LicenseKey {
    std::string key;
    std::string username;
    std::string game;
    std::string duration;
    std::string created;
    std::string expires;
    std::string status;
    std::string hwid;
};

class AuthServer {
public:
    AuthServer(int port = 8080);
    ~AuthServer();

    bool start();
    void stop();
    bool isRunning() const;

    // Authentication endpoints
    bool registerUser(const std::string& username, const std::string& password, const std::string& email, const std::string& hwid);
    bool loginUser(const std::string& username, const std::string& password, const std::string& hwid, std::string& token);
    bool verifyToken(const std::string& token, std::string& username);
    bool resetPassword(const std::string& email);
    bool updateUserSubscription(const std::string& username, int subscriptionDays);
    bool banUser(const std::string& username, const std::string& reason);

    // Key management endpoints
    std::vector<std::string> generateLicenseKeys(const std::string& game, const std::string& duration, int quantity);
    bool activateLicenseKey(const std::string& key, const std::string& username, const std::string& hwid);
    bool resetKeyHWID(const std::string& key);
    bool banKey(const std::string& key, const std::string& reason);
    LicenseKey getLicenseKeyInfo(const std::string& key);
    std::vector<LicenseKey> getAllLicenseKeys();
    std::vector<LicenseKey> getLicenseKeysByGame(const std::string& game);
    std::vector<LicenseKey> getLicenseKeysByUser(const std::string& username);
    
    // Admin functions
    std::vector<UserData> getAllUsers();
    bool deleteUser(const std::string& username);
    std::vector<LogEntry> getLoginLogs(int limit = 100);
    std::vector<LogEntry> getSystemLogs(int limit = 100);

private:
    void setupRoutes();
    void handleRequest(const std::string& request, std::string& response);
    std::string generateToken(const std::string& username);

    int m_port;
    bool m_running;
    std::unique_ptr<Database> m_database;
    std::unique_ptr<AuthManager> m_authManager;
    std::mutex m_mutex;
    
    // Server implementation details (will vary based on HTTP library used)
    void* m_serverHandle;
};