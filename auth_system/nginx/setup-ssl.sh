#!/bin/bash
# SSL Setup Script for blackcode.online
# Run this script as root on your server

set -e

echo "🔒 Setting up SSL for blackcode.online..."

# Update system
apt update && apt upgrade -y

# Install Nginx and Certbot
apt install -y nginx certbot python3-certbot-nginx ufw fail2ban

# Configure UFW firewall
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Stop Nginx temporarily for certificate generation
systemctl stop nginx

# Generate SSL certificate
certbot certonly --standalone -d blackcode.online -d www.blackcode.online --agree-tos --no-eff-email --email admin@blackcode.online

# Copy Nginx configuration
cp blackcode.online.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/blackcode.online.conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Configure fail2ban for additional protection
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
backend = systemd

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 2

[nginx-botsearch]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
EOF

# Start services
systemctl enable nginx
systemctl enable fail2ban
systemctl start nginx
systemctl start fail2ban

# Set up automatic SSL renewal
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet && systemctl reload nginx") | crontab -

echo "✅ SSL setup complete!"
echo "🌐 Your site should now be available at https://blackcode.online"
echo "🔒 SSL certificate will auto-renew"
echo "🛡️ Fail2ban is protecting against brute force attacks"
echo ""
echo "Next steps:"
echo "1. Point your DNS A record for blackcode.online to this server's IP"
echo "2. Test the site: curl -I https://blackcode.online"
echo "3. Check SSL rating: https://www.ssllabs.com/ssltest/"