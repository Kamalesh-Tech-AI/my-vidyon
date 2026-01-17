# Deployment Checklist

## Pre-Deployment Checklist

### 1. Environment Configuration

- [ ] **Production environment variables set**
  - [ ] `NODE_ENV=production`
  - [ ] `WS_PORT` configured
  - [ ] `WS_HOST` configured
  - [ ] `VITE_SUPABASE_URL` set
  - [ ] `VITE_SUPABASE_ANON_KEY` set
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` set (keep secret!)

- [ ] **Secrets rotated**
  - [ ] JWT secret changed from default
  - [ ] Database credentials rotated
  - [ ] API keys regenerated
  - [ ] Service account keys updated

- [ ] **Configuration reviewed**
  - [ ] CORS origins updated for production
  - [ ] CSP directives configured
  - [ ] Rate limits appropriate
  - [ ] TLS/SSL enabled
  - [ ] Logging level set

### 2. Security Hardening

- [ ] **TLS/SSL Configuration**
  - [ ] Valid SSL certificate installed
  - [ ] Certificate chain complete
  - [ ] TLS 1.2+ enforced
  - [ ] Weak ciphers disabled
  - [ ] HSTS enabled

- [ ] **Security Headers**
  - [ ] CSP headers configured
  - [ ] X-Frame-Options set
  - [ ] X-Content-Type-Options set
  - [ ] Referrer-Policy set
  - [ ] Permissions-Policy set

- [ ] **Authentication**
  - [ ] JWT secret is strong and unique
  - [ ] Token expiration configured
  - [ ] Session revalidation enabled
  - [ ] Cookie security attributes set

- [ ] **Rate Limiting**
  - [ ] Message rate limits configured
  - [ ] Connection limits set
  - [ ] IP-based throttling enabled
  - [ ] Ban durations appropriate

### 3. Code Quality

- [ ] **Testing**
  - [ ] Unit tests passing
  - [ ] Integration tests passing
  - [ ] Security tests passing
  - [ ] Load tests passing
  - [ ] Connection tests passing

- [ ] **Code Review**
  - [ ] Security review completed
  - [ ] Performance review completed
  - [ ] Code quality review completed
  - [ ] Documentation reviewed

- [ ] **Dependencies**
  - [ ] All dependencies updated
  - [ ] Security vulnerabilities fixed
  - [ ] Unused dependencies removed
  - [ ] License compliance verified

### 4. Infrastructure

- [ ] **Server Resources**
  - [ ] CPU capacity adequate
  - [ ] Memory capacity adequate
  - [ ] Disk space sufficient
  - [ ] Network bandwidth adequate

- [ ] **Reverse Proxy**
  - [ ] Nginx/Apache configured
  - [ ] WebSocket upgrade headers set
  - [ ] SSL termination configured
  - [ ] Load balancing configured (if applicable)

- [ ] **Firewall**
  - [ ] WebSocket port open (8081)
  - [ ] HTTPS port open (443)
  - [ ] Unnecessary ports closed
  - [ ] IP whitelisting configured (if needed)

### 5. Monitoring & Logging

- [ ] **Logging**
  - [ ] Log directory configured
  - [ ] Log rotation enabled
  - [ ] Log retention policy set
  - [ ] Sensitive data masking verified

- [ ] **Monitoring**
  - [ ] Health check endpoint accessible
  - [ ] Stats endpoint accessible
  - [ ] Monitoring service integrated
  - [ ] Alert thresholds configured

- [ ] **Alerting**
  - [ ] Email alerts configured
  - [ ] SMS alerts configured (critical)
  - [ ] Alert recipients updated
  - [ ] Alert escalation policy set

### 6. Documentation

- [ ] **Technical Documentation**
  - [ ] API documentation complete
  - [ ] Security policy documented
  - [ ] Deployment guide updated
  - [ ] Troubleshooting guide available

- [ ] **Operational Documentation**
  - [ ] Runbook created
  - [ ] Incident response plan documented
  - [ ] Escalation procedures defined
  - [ ] Contact information updated

---

## Deployment Steps

### Step 1: Prepare Server

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 2: Clone Repository

```bash
# Clone repository
git clone https://github.com/your-org/my-vidyon.git
cd my-vidyon

# Checkout production branch
git checkout production
```

### Step 3: Install Dependencies

```bash
# Install main app dependencies
npm install --production

# Install WebSocket server dependencies
cd websocket-server
npm install --production
cd ..
```

### Step 4: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env

# Verify configuration
cat .env
```

**Required Variables:**
```env
NODE_ENV=production
WS_PORT=8081
WS_HOST=0.0.0.0
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
LOG_LEVEL=info
```

### Step 5: Build Application

```bash
# Build frontend
npm run build

# Verify build
ls -la dist/
```

### Step 6: Setup Process Manager

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start WebSocket server with PM2
cd websocket-server
pm2 start server.js --name "myvidyon-ws" --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
# Follow the instructions printed
```

### Step 7: Configure Reverse Proxy

**Nginx Configuration:**

```nginx
# /etc/nginx/sites-available/myvidyon

upstream websocket {
    server localhost:8081;
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # WebSocket Location
    location /ws {
        proxy_pass http://websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # Health Check
    location /ws/health {
        proxy_pass http://websocket/health;
        access_log off;
    }

    # Main Application
    location / {
        root /var/www/myvidyon/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

**Enable Configuration:**
```bash
# Test configuration
sudo nginx -t

# Enable site
sudo ln -s /etc/nginx/sites-available/myvidyon /etc/nginx/sites-enabled/

# Reload Nginx
sudo systemctl reload nginx
```

### Step 8: Setup SSL Certificate

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### Step 9: Configure Firewall

```bash
# Allow SSH
sudo ufw allow ssh

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### Step 10: Start Services

```bash
# Start WebSocket server
pm2 start myvidyon-ws

# Check status
pm2 status

# View logs
pm2 logs myvidyon-ws
```

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# Check WebSocket server health
curl https://yourdomain.com/ws/health

# Expected response:
# {
#   "status": "healthy",
#   "uptime": 123,
#   "timestamp": "2026-01-17T10:00:00.000Z",
#   "connections": 0
# }
```

### 2. WebSocket Connection Test

```javascript
// Browser console test
const ws = new WebSocket('wss://yourdomain.com/ws?token=YOUR_TOKEN');

ws.onopen = () => console.log('Connected!');
ws.onmessage = (e) => console.log('Message:', e.data);
ws.onerror = (e) => console.error('Error:', e);
```

### 3. SSL Certificate Verification

```bash
# Check SSL certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Verify TLS version
curl -I --tlsv1.2 https://yourdomain.com
```

### 4. Security Headers Verification

```bash
# Check security headers
curl -I https://yourdomain.com

# Should include:
# Strict-Transport-Security
# X-Frame-Options
# X-Content-Type-Options
# Content-Security-Policy
```

### 5. Load Testing

```bash
# Install artillery (load testing tool)
npm install -g artillery

# Run load test
artillery quick --count 100 --num 10 wss://yourdomain.com/ws
```

### 6. Monitor Logs

```bash
# WebSocket server logs
pm2 logs myvidyon-ws

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u nginx -f
```

---

## Rollback Procedure

### If Deployment Fails

```bash
# Stop WebSocket server
pm2 stop myvidyon-ws

# Checkout previous version
git checkout previous-tag

# Reinstall dependencies
cd websocket-server
npm install --production

# Restart server
pm2 restart myvidyon-ws

# Verify
pm2 status
```

---

## Monitoring & Maintenance

### Daily Tasks

- [ ] Check server health
- [ ] Review error logs
- [ ] Monitor connection count
- [ ] Check rate limit violations

### Weekly Tasks

- [ ] Review security logs
- [ ] Check disk space
- [ ] Monitor memory usage
- [ ] Review performance metrics

### Monthly Tasks

- [ ] Update dependencies
- [ ] Review security advisories
- [ ] Rotate logs
- [ ] Performance optimization

### Quarterly Tasks

- [ ] Security audit
- [ ] Load testing
- [ ] Disaster recovery drill
- [ ] Documentation review

---

## Troubleshooting

### WebSocket Connection Fails

**Symptoms:**
- Clients cannot connect
- Connection timeout errors

**Solutions:**
1. Check WebSocket server is running: `pm2 status`
2. Verify port is open: `sudo netstat -tulpn | grep 8081`
3. Check firewall rules: `sudo ufw status`
4. Review Nginx configuration: `sudo nginx -t`
5. Check SSL certificate: `sudo certbot certificates`

### High Memory Usage

**Symptoms:**
- Server slow or unresponsive
- Out of memory errors

**Solutions:**
1. Check memory usage: `free -h`
2. Review connection count: `curl https://yourdomain.com/ws/stats`
3. Restart WebSocket server: `pm2 restart myvidyon-ws`
4. Increase server resources
5. Implement connection limits

### Rate Limit Issues

**Symptoms:**
- Users getting rate limit errors
- Legitimate traffic blocked

**Solutions:**
1. Review rate limit configuration
2. Check logs for violations
3. Adjust limits if needed
4. Whitelist specific IPs
5. Implement user-specific limits

---

## Emergency Contacts

**On-Call Engineer:** +1-XXX-XXX-XXXX  
**Security Team:** security@myvidyon.com  
**DevOps Team:** devops@myvidyon.com  
**Management:** management@myvidyon.com

---

## Deployment Sign-Off

**Deployed By:** ___________________  
**Date:** ___________________  
**Version:** ___________________  
**Verified By:** ___________________  
**Sign-Off:** ___________________

---

**Last Updated**: 2026-01-17  
**Version**: 1.0.0  
**Next Review**: 2026-02-17
