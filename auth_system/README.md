# Multi-Language Authentication System

A flexible authentication system that works with multiple programming languages including Node.js, Python, and PHP.

## Features

- Modern UI with responsive design
- License key management system
- User management
- HWID locking for security
- API endpoints for multiple languages
- Client examples in Node.js, Python, and PHP

## Quick Start

### Running the Server

1. Make sure you have Node.js installed
2. Run the start.bat file or use these commands:

```
cd server
npm install
npm start
```

3. The server will start on http://localhost:8000

### Test Credentials

- Username: admin
- Password: admin

## Client Examples

Check the `client/examples` directory for language-specific client implementations:

- Node.js: `nodejs_client.js`
- Python: `python_client.py`
- PHP: `php_client.php`

## API Documentation

### Authentication

- POST `/api/auth/login` - Login with username and password
- POST `/api/auth/register` - Register a new user

### License Keys

- GET `/api/licenses` - Get all license keys
- POST `/api/licenses/generate` - Generate new license keys
- POST `/api/licenses/activate` - Activate a license key with HWID
- POST `/api/licenses/reset-hwid` - Reset HWID for a license key
- POST `/api/licenses/ban` - Ban a license key

### Users

- GET `/api/users` - Get all users
- POST `/api/users` - Add a new user
- POST `/api/users/ban/:id` - Ban a user
- DELETE `/api/users/:id` - Delete a user
## Request Signing Protection

To harden against authentication emulators and tampering, API routes enforce HMAC request signing using per-client API keys.

Required headers on protected endpoints:
- X-API-Key: your client API key value (hex)
- X-Req-Timestamp: current Unix timestamp in milliseconds
- X-Req-Nonce: random nonce (unique per request)
- X-Req-Signature: hex HMAC-SHA256 signature

Signature payload format:
`
METHOD + "\n" + PATH + "\n" + JSON(body) + "\n" + timestamp + "\n" + nonce
`
Signature algorithm:
- HMAC-SHA256 over the payload using your API key value as the secret.
- Timestamp skew allowed: 60 seconds.
- Nonces are tracked and rejected on reuse (replay protection).

Admin & status endpoints:
- /api/admin/* remains protected by X-Admin-Secret and is allowlisted from request signing.
- /api/status and /api/security/status are allowlisted for health checks.

Client example (Node.js):
`js
const crypto = require('crypto');
function signRequest(apiKey, method, path, body) {
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(12).toString('hex');
  const payload = [method.toUpperCase(), path, body ? JSON.stringify(body) : '', String(timestamp), nonce].join('\n');
  const signature = crypto.createHmac('sha256', apiKey).update(payload).digest('hex');
  return { timestamp, nonce, signature };
}
`

All clients must include these headers to successfully call protected APIs.
