# Changelog

## Version 2.0.0 (2025-11-03)

### Major Changes
- Migrated authentication backend from MongoDB/Mongoose to Supabase Auth (server-side)
- Implemented secure JWT handling with a cryptographic secret and 24h expiry
- Refactored test server to initialize Supabase and use Auth for credential checks
- Added robust in-memory 2FA fallback to keep login working if Supabase tables are unavailable

### New Features
- Supabase-backed registration via Admin API
- Password-based login validated against Supabase Auth
- 2FA code storage with Supabase plus in-memory fallback
- Status endpoint enriched with Security Monitor statistics

### Security Improvements
- Helmet CSP hardened and HSTS enabled
- Multi-tier rate limiting and progressive slowdown on auth routes
- WAF-like request inspection (SQLi/XSS/traversal patterns)
- Real-time threat monitoring via SecurityMonitor middleware

### Operations
- Production deployment guide with Nginx + SSL, PM2, UFW/Fail2ban
- Added CHANGELOG and TODO updates for live tracking

### Notes
- If Supabase keys are invalid or unavailable, registration/login gracefully fall back to local JSON storage for development.

## Version 1.0.0 (Previous)

### Added
- **Role-Based Access Control**
  - Added 'owner' role with special permissions
  - Updated authentication middleware with `ownerOnly` function
  - Restricted sensitive operations to owner role

- **Discord Bot Enhancements**
  - Added owner role checks for sensitive commands
  - Implemented bulk key generation (owner only)
  - Implemented bulk key deletion by status and age (owner only)
  - Added CSV export for bulk generated keys

- **Email Verification System**
  - Integrated Resend API for email delivery
  - Added email verification functionality
  - Implemented password reset via email
  - Created verification code login system

- **Supabase Integration**
  - Added Supabase authentication
  - Configured Supabase client with proper credentials
  - Created MongoDB user synchronization

- **System Status Page**
  - Added Vercel-style system status monitoring
  - Implemented service status indicators
  - Created incident history timeline
  - Added real-time status updates

- **Multi-Language Support**
  - Implemented i18n internationalization
  - Added support for multiple languages
  - Created language selector component

- **HWID Reset Functionality**
  - Added API endpoints for HWID reset
  - Implemented logging for reset operations
  - Added Discord bot command for HWID reset

## Previous Versions

### Version 0.9.0
- Initial authentication system
- Basic license management
- Simple admin panel
