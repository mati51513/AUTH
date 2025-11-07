#include <iostream>
#include <string>
#include "../include/server.h"
#include "../include/database.h"
#include "../include/auth.h"

int main(int argc, char* argv[]) {
    std::cout << "Starting Authentication Server..." << std::endl;
    
    // Initialize database
    std::string dbPath = "auth_database.db";
    Database db(dbPath);
    
    if (!db.connect()) {
        std::cerr << "Failed to connect to database!" << std::endl;
        return 1;
    }
    
    std::cout << "Database connected successfully." << std::endl;
    
    // Initialize auth manager
    AuthManager authManager(&db);
    std::cout << "Authentication manager initialized." << std::endl;
    
    // Initialize server
    int port = 8080;
    if (argc > 1) {
        port = std::stoi(argv[1]);
    }
    
    AuthServer server(&db, &authManager, port);
    std::cout << "Server initialized on port " << port << std::endl;
    
    // Start server
    if (!server.start()) {
        std::cerr << "Failed to start server!" << std::endl;
        return 1;
    }
    
    std::cout << "Server started successfully. Press Ctrl+C to stop." << std::endl;
    
    // Wait for server to finish (in a real implementation, this would be a proper event loop)
    while (server.isRunning()) {
        std::this_thread::sleep_for(std::chrono::seconds(1));
    }
    
    // Stop server
    server.stop();
    std::cout << "Server stopped." << std::endl;
    
    return 0;
}