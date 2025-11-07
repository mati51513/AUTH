# Database Setup Guide

This document provides instructions for setting up and configuring the database for the license key authentication system.

## MongoDB Setup

### Option 1: Local MongoDB Installation

1. **Install MongoDB Community Edition**:
   - Download from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
   - Follow the installation instructions for your operating system

2. **Start MongoDB Service**:
   - Windows: MongoDB should run as a service automatically
   - macOS/Linux: `sudo systemctl start mongod` or `brew services start mongodb-community`

3. **Verify Installation**:
   ```
   mongo --version
   mongod --version
   ```

### Option 2: MongoDB Atlas (Cloud Hosted)

1. **Create MongoDB Atlas Account**:
   - Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
   - Create a new project

2. **Create a Cluster**:
   - Choose the free tier option
   - Select your preferred cloud provider and region
   - Click "Create Cluster"

3. **Configure Network Access**:
   - Go to Network Access in the security menu
   - Add your IP address or allow access from anywhere (for development only)

4. **Create Database User**:
   - Go to Database Access in the security menu
   - Add a new database user with read/write permissions
   - Save the username and password securely

5. **Get Connection String**:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string

## Environment Configuration

1. **Create .env File**:
   Create a `.env` file in the server root directory with the following variables:

   ```
   # Database Configuration
   MONGO_URI=your_mongodb_connection_string
   
   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRE=30d
   JWT_COOKIE_EXPIRE=30
   
   # Server Configuration
   NODE_ENV=development
   PORT=5000
   
   # Email Configuration (for verification)
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_EMAIL=your_email@example.com
   SMTP_PASSWORD=your_email_password
   FROM_EMAIL=noreply@yourdomain.com
   FROM_NAME=Your App Name
   ```

2. **Replace Placeholder Values**:
   - Replace `your_mongodb_connection_string` with your actual MongoDB connection string
   - Generate a strong random string for `JWT_SECRET`
   - Configure email settings for verification emails

## Database Models

The system uses the following main models:

1. **User Model**: Stores user account information
2. **License Model**: Stores license key data with validation features
3. **KeyLog Model**: Tracks license key usage and validation attempts

## Database Initialization

The database will be automatically initialized when you start the server for the first time. The system will:

1. Create the required collections
2. Set up indexes for performance optimization
3. Create an admin user if none exists (check console for credentials)

## Running Database Migrations

If you need to update the database schema:

1. Install the migration tool:
   ```
   npm install -g migrate-mongo
   ```

2. Run migrations:
   ```
   cd server
   migrate-mongo up
   ```

## Backup and Restore

### Backup Database

```bash
mongodump --uri="your_mongodb_connection_string" --out=./backup
```

### Restore Database

```bash
mongorestore --uri="your_mongodb_connection_string" ./backup
```

## Troubleshooting

- **Connection Issues**: Verify network access settings and credentials
- **Authentication Errors**: Check that the database user has proper permissions
- **Performance Issues**: Consider adding appropriate indexes to frequently queried fields

For additional help, refer to the [MongoDB Documentation](https://docs.mongodb.com/).