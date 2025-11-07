# BlackCode.online Deployment Guide 🚀

## 🔒 Ultra-Secure Production Deployment

This guide will help you deploy your BlackCode authentication system to `blackcode.online` with enterprise-grade security.

## 📋 Prerequisites

- Ubuntu/Debian server with root access
- Domain `blackcode.online` pointing to your server IP
- Minimum 2GB RAM, 2 CPU cores
- Port 80, 443, and 22 open

## 🛠️ Quick Deployment

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Create application user
sudo useradd -m -s /bin/bash blackcode
sudo usermod -aG sudo blackcode
```

### 2. Deploy Application

```bash
# Switch to application user
sudo su - blackcode

# Clone/upload your application
git clone <your-repo> /home/blackcode/auth_system
# OR upload files to /home/blackcode/auth_system

cd /home/blackcode/auth_system/server

# Install dependencies
npm install --production

# Set environment variables
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
RESEND_API_KEY=your_resend_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_key_here
DISCORD_BOT_TOKEN=your_discord_token_here
DATABASE_URL=your_database_url_here
REGION=us-east-1
EOF

# Start with PM2
pm2 start test-server.js --name "blackcode-auth"
pm2 startup
pm2 save
```

### 3. SSL & Nginx Setup

```bash
# Copy nginx configuration
sudo cp ../nginx/blackcode.online.conf /etc/nginx/sites-available/
sudo chmod +x ../nginx/setup-ssl.sh

# Run SSL setup script
sudo ../nginx/setup-ssl.sh
```

## 🛡️ Security Features Enabled

### ✅ Application Security
- **WAF-like Protection**: Blocks SQL injection, XSS, directory traversal
- **Advanced Rate Limiting**: Multiple tiers (global, API, auth)
- **Input Validation**: Comprehensive sanitization with express-validator
- **Security Headers**: Helmet with HSTS, CSP, and more
- **IP Tracking**: Real-time threat detection and auto-blocking
- **Brute Force Protection**: Progressive delays and attempt limits
- **Session Security**: IP validation for 2FA sessions

### ✅ Infrastructure Security
- **SSL/TLS**: Let's Encrypt with A+ rating configuration
- **Firewall**: UFW with minimal attack surface
- **Fail2ban**: Automatic IP blocking for suspicious activity
- **Nginx Security**: Rate limiting, bot blocking, security headers
- **CORS**: Strict domain-only access control

### ✅ Monitoring & Logging
- **Security Monitor**: Real-time threat detection and logging
- **Status Page**: Vercel-like system health monitoring
- **Attack Pattern Analysis**: Automatic threat categorization
- **Comprehensive Logging**: All security events tracked

## 🌐 DNS Configuration

Point your domain to your server:

```
A     blackcode.online        → YOUR_SERVER_IP
A     www.blackcode.online    → YOUR_SERVER_IP
```

## 🔧 Environment Variables

### Required for Production:
```bash
NODE_ENV=production
RESEND_API_KEY=re_xxxxxxxxxx        # For email 2FA
SUPABASE_URL=https://xxx.supabase.co # Database
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIs... # Database key
```

### Optional:
```bash
DISCORD_BOT_TOKEN=xxx               # Discord integration
DATABASE_URL=postgresql://...       # Alternative database
REGION=us-east-1                   # Server region
```

## 📊 Monitoring URLs

After deployment, access:

- **Main Panel**: `https://blackcode.online`
- **Status Page**: `https://blackcode.online/status.html`
- **API Health**: `https://blackcode.online/api/status`

## 🚨 Security Monitoring

The system automatically:

1. **Blocks malicious IPs** after suspicious activity
2. **Logs all security events** to `/home/blackcode/auth_system/security/security.log`
3. **Rate limits** aggressive requests
4. **Validates all inputs** to prevent injection attacks
5. **Monitors attack patterns** for threat intelligence

### View Security Logs:
```bash
tail -f /home/blackcode/auth_system/security/security.log
```

### Check Blocked IPs:
```bash
curl https://blackcode.online/api/status | jq '.security'
```

## 🔄 Maintenance

### Update Application:
```bash
cd /home/blackcode/auth_system/server
git pull  # or upload new files
npm install --production
pm2 restart blackcode-auth
```

### Renew SSL (automatic):
```bash
# Check renewal status
sudo certbot certificates

# Manual renewal (if needed)
sudo certbot renew --dry-run
```

### Monitor Performance:
```bash
pm2 monit
pm2 logs blackcode-auth
```

## 🆘 Troubleshooting

### Common Issues:

1. **SSL Certificate Issues**:
   ```bash
   sudo certbot certificates
   sudo nginx -t
   sudo systemctl reload nginx
   ```

2. **Application Not Starting**:
   ```bash
   pm2 logs blackcode-auth
   cd /home/blackcode/auth_system/server
   node test-server.js  # Test directly
   ```

3. **High Security Blocks**:
   ```bash
   # Check security logs
   tail -100 /home/blackcode/auth_system/security/security.log
   
   # Unblock IP if needed (modify security-monitor.js)
   ```

4. **Performance Issues**:
   ```bash
   pm2 monit
   htop
   sudo ufw status
   ```

## 🎯 Performance Optimization

### For High Traffic:
1. **Enable Nginx Caching**:
   ```nginx
   location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

2. **Scale with PM2 Cluster**:
   ```bash
   pm2 start test-server.js --name "blackcode-auth" -i max
   ```

3. **Add Redis for Rate Limiting**:
   ```bash
   sudo apt install redis-server
   # Update rate limiting to use Redis store
   ```

## 📞 Support

- **Security Issues**: security@blackcode.online
- **Technical Support**: Check logs and status page first
- **Emergency**: Review fail2ban and security monitor logs

---

**🎉 Your BlackCode.online deployment is now live with enterprise-grade security!**

Access your panel at: https://blackcode.online