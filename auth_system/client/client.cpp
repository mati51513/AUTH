#include <iostream>
#include <string>
#include <curl/curl.h>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

// Simple callback function to handle response data from curl
size_t WriteCallback(void* contents, size_t size, size_t nmemb, std::string* s) {
    size_t newLength = size * nmemb;
    try {
        s->append((char*)contents, newLength);
        return newLength;
    } catch(std::bad_alloc& e) {
        return 0;
    }
}

class AuthClient {
private:
    std::string m_serverUrl;
    std::string m_token;
    std::string m_username;
    std::string m_hwid;

    // Get hardware ID (simplified version)
    std::string getHardwareID() {
        // In a real implementation, this would gather unique hardware identifiers
        // For demo purposes, we'll return a fixed string
        return "DEMO-HWID-12345";
    }

public:
    AuthClient(const std::string& serverUrl) : m_serverUrl(serverUrl), m_token("") {
        m_hwid = getHardwareID();
    }

    bool login(const std::string& username, const std::string& password) {
        CURL* curl = curl_easy_init();
        if (!curl) {
            std::cerr << "Failed to initialize curl" << std::endl;
            return false;
        }

        // Prepare login data
        json loginData;
        loginData["username"] = username;
        loginData["password"] = password;
        loginData["hwid"] = m_hwid;
        std::string jsonStr = loginData.dump();

        // Set up request
        std::string url = m_serverUrl + "/login";
        std::string responseData;

        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, jsonStr.c_str());
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &responseData);

        // Add headers
        struct curl_slist* headers = NULL;
        headers = curl_slist_append(headers, "Content-Type: application/json");
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);

        // Perform request
        CURLcode res = curl_easy_perform(curl);
        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);

        if (res != CURLE_OK) {
            std::cerr << "Login request failed: " << curl_easy_strerror(res) << std::endl;
            return false;
        }

        // Parse response
        try {
            json response = json::parse(responseData);
            if (response["success"].get<bool>()) {
                m_token = response["token"].get<std::string>();
                m_username = username;
                return true;
            } else {
                std::cerr << "Login failed: " << response["message"].get<std::string>() << std::endl;
                return false;
            }
        } catch (const std::exception& e) {
            std::cerr << "Failed to parse response: " << e.what() << std::endl;
            return false;
        }
    }

    bool verifyToken() {
        if (m_token.empty()) {
            std::cerr << "No token available. Please login first." << std::endl;
            return false;
        }

        CURL* curl = curl_easy_init();
        if (!curl) {
            std::cerr << "Failed to initialize curl" << std::endl;
            return false;
        }

        // Prepare verification data
        json verifyData;
        verifyData["token"] = m_token;
        verifyData["hwid"] = m_hwid;
        std::string jsonStr = verifyData.dump();

        // Set up request
        std::string url = m_serverUrl + "/verify";
        std::string responseData;

        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, jsonStr.c_str());
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &responseData);

        // Add headers
        struct curl_slist* headers = NULL;
        headers = curl_slist_append(headers, "Content-Type: application/json");
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);

        // Perform request
        CURLcode res = curl_easy_perform(curl);
        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);

        if (res != CURLE_OK) {
            std::cerr << "Verification request failed: " << curl_easy_strerror(res) << std::endl;
            return false;
        }

        // Parse response
        try {
            json response = json::parse(responseData);
            return response["success"].get<bool>();
        } catch (const std::exception& e) {
            std::cerr << "Failed to parse response: " << e.what() << std::endl;
            return false;
        }
    }

    bool isLoggedIn() const {
        return !m_token.empty();
    }

    std::string getUsername() const {
        return m_username;
    }

    std::string getToken() const {
        return m_token;
    }
};

// Example usage
int main() {
    std::cout << "Loader Authentication Client" << std::endl;
    std::cout << "===========================" << std::endl;

    // Create auth client
    AuthClient client("http://localhost:8080");

    // Get login credentials
    std::string username, password;
    std::cout << "Username: ";
    std::cin >> username;
    std::cout << "Password: ";
    std::cin >> password;

    // Attempt login
    std::cout << "Logging in..." << std::endl;
    if (client.login(username, password)) {
        std::cout << "Login successful!" << std::endl;
        std::cout << "Token: " << client.getToken() << std::endl;

        // Verify token
        std::cout << "Verifying token..." << std::endl;
        if (client.verifyToken()) {
            std::cout << "Token verified. You are authenticated!" << std::endl;
            
            // Here you would continue with the loader's main functionality
            std::cout << "Loading application..." << std::endl;
            // ...
        } else {
            std::cout << "Token verification failed. Please try logging in again." << std::endl;
        }
    } else {
        std::cout << "Login failed. Please check your credentials and try again." << std::endl;
    }

    return 0;
}