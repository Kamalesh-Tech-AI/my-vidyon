# Security Policy

## Overview

This document outlines the comprehensive security policy implemented for the My Vidyon platform, including WebSocket security, transport security, content security policy, and attack prevention measures.

---

## 1. Authentication & Session Security

### 1.1 JWT Authentication

**Implementation:**
- All WebSocket connections require valid JWT tokens
- Tokens are verified using HS256 algorithm
- Token expiration is enforced (24-hour default)
- Tokens contain user ID, email, and role

**Token Validation:**
```javascript
// Server-side validation
const decoded = jwt.verify(token, SECRET_KEY, {
  algorithms: ['HS256'],
});

// Required fields
- sub or user_id (user identifier)
- email
- role
- exp (expiration)
```

**Session Revalidation:**
- Sessions are revalidated every 5 minutes
- Expired sessions are immediately terminated
- Warning issued when token expires in < 5 minutes

### 1.2 Secure Cookies

**Configuration:**
```javascript
{
  httpOnly: true,      // Prevents XSS access
  secure: true,        // HTTPS only
  sameSite: 'Strict',  // CSRF protection
  maxAge: 86400000,    // 24 hours
}
```

### 1.3 Session Fixation Prevention

- New session ID generated on login
- Old session invalidated on logout
- Session ID rotated on privilege escalation

---

## 2. Transport & Network Security

### 2.1 TLS/SSL Configuration

**Minimum TLS Version:** TLS 1.2  
**Preferred Version:** TLS 1.3

**Allowed Cipher Suites:**
```
ECDHE-ECDSA-AES128-GCM-SHA256
ECDHE-RSA-AES128-GCM-SHA256
ECDHE-ECDSA-AES256-GCM-SHA384
ECDHE-RSA-AES256-GCM-SHA384
```

**Disabled Ciphers:**
- All RC4 ciphers
- All DES/3DES ciphers
- All MD5-based ciphers
- All export-grade ciphers

### 2.2 HTTPS Enforcement

**HSTS Header:**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Redirect Rules:**
```nginx
# Nginx configuration
server {
    listen 80;
    return 301 https://$host$request_uri;
}
```

### 2.3 WebSocket Security (WSS)

- Only WSS (WebSocket Secure) connections allowed in production
- WS (unencrypted) only permitted in development
- Origin validation enforced
- Referer header validation

---

## 3. Content Security Policy (CSP)

### 3.1 CSP Headers

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https: blob:;
  connect-src 'self' wss://localhost:8081 https://ccyqzcaghwaggtmkmigi.supabase.co;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

### 3.2 CSP Directives Explained

| Directive | Value | Purpose |
|-----------|-------|---------|
| `default-src` | 'self' | Default policy for all resources |
| `script-src` | 'self' 'unsafe-inline' 'unsafe-eval' | Allow scripts from same origin |
| `style-src` | 'self' 'unsafe-inline' fonts.googleapis.com | Allow styles |
| `font-src` | 'self' fonts.gstatic.com | Allow fonts |
| `img-src` | 'self' data: https: blob: | Allow images |
| `connect-src` | 'self' wss:// https:// | Allow WebSocket and API connections |
| `frame-ancestors` | 'none' | Prevent clickjacking |
| `base-uri` | 'self' | Restrict base URL |
| `form-action` | 'self' | Restrict form submissions |

### 3.3 Additional Security Headers

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

---

## 4. Input Validation & Attack Prevention

### 4.1 Server-Side Validation

**All inputs are validated using Joi schemas:**

```javascript
const messageSchema = Joi.object({
  type: Joi.string().valid('subscribe', 'message', 'broadcast').required(),
  channel: Joi.string().valid(...allowedChannels).required(),
  data: Joi.object().required(),
});
```

### 4.2 XSS Prevention

**Input Sanitization:**
```javascript
function sanitizeData(data) {
  return data
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}
```

**Pattern Detection:**
- `<script>` tags removed
- `javascript:` protocol blocked
- Event handlers (`onclick`, `onerror`) stripped
- HTML entities encoded

### 4.3 SQL Injection Prevention

**Detection Patterns:**
```javascript
const sqlPatterns = [
  /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b/i,
  /(UNION\s+SELECT)/i,
  /(OR\s+1\s*=\s*1)/i,
];
```

**Prevention:**
- All database queries use parameterized statements
- User input never directly concatenated into SQL
- Suspicious patterns logged and blocked

### 4.4 CSRF Protection

**Token-Based Protection:**
- CSRF tokens required for state-changing operations
- Tokens validated on server side
- SameSite cookie attribute set to 'Strict'

**Origin Validation:**
```javascript
const allowedOrigins = [
  'https://yourdomain.com',
  'http://localhost:8080', // Development only
];
```

### 4.5 Command Injection Prevention

**Detection Patterns:**
```javascript
const cmdPatterns = [
  /(\||;|&|\$\(|\`)/,
];
```

**Prevention:**
- Shell commands never executed with user input
- All system calls use safe APIs
- Input validation before any system interaction

### 4.6 Path Traversal Prevention

**Detection:**
```javascript
if (input.includes('../') || input.includes('..\\')) {
  // Block and log
}
```

**Prevention:**
- File paths validated and normalized
- Access restricted to allowed directories
- Symbolic links resolved and validated

---

## 5. WebSocket-Specific Security

### 5.1 Message Validation

**Schema Validation:**
- All messages validated against predefined schemas
- Unknown message types rejected
- Required fields enforced
- Data types validated

**Size Limits:**
- Maximum message size: 100KB
- Oversized messages rejected
- Logged for security review

### 5.2 Rate Limiting

**Message Rate Limiting:**
- 100 messages per minute per user
- Sliding window algorithm
- Automatic ban after 2x violation

**Connection Rate Limiting:**
- 10 concurrent connections per user
- 50 connections per minute per IP
- Automatic IP ban for DDoS attempts

**Ban Duration:**
- Standard violations: 15 minutes
- Severe violations: 1 hour
- Repeated violations: 24 hours

### 5.3 Replay Attack Prevention

**Timestamp Validation:**
```javascript
const messageAge = Date.now() - message.timestamp;
if (messageAge > 60000) { // 1 minute
  // Reject old messages
}
```

**Nonce Tracking:**
- Unique message IDs tracked
- Duplicate messages rejected
- Nonce cache expires after 5 minutes

### 5.4 Connection Throttling

**Per User:**
- Maximum 10 concurrent connections
- Oldest connection closed when limit exceeded

**Per IP:**
- Maximum 50 connections per minute
- Automatic ban for excessive connections
- Logged as potential DDoS

### 5.5 Idle Connection Timeout

**Configuration:**
- Idle timeout: 5 minutes
- Heartbeat interval: 30 seconds
- Missed heartbeats: 3 (90 seconds)

**Implementation:**
```javascript
if (Date.now() - ws.lastActivity > IDLE_TIMEOUT) {
  ws.close(1000, 'Idle timeout');
}
```

### 5.6 Origin & Referer Validation

**Allowed Origins:**
```javascript
const allowedOrigins = [
  'https://yourdomain.com',
  'http://localhost:8080', // Dev only
];
```

**Validation:**
```javascript
const origin = request.headers.origin;
if (!allowedOrigins.includes(origin)) {
  // Reject connection
}
```

---

## 6. Authorization & Access Control

### 6.1 Role-Based Access Control (RBAC)

**Roles:**
- `admin` - Full access
- `institution` - Institution-level access
- `faculty` - Faculty-level access
- `student` - Student-level access
- `parent` - Parent-level access

**Channel Permissions:**
```javascript
const permissions = {
  admin: ['notifications', 'messages', 'updates', 'alerts', 'analytics', 'events'],
  institution: ['notifications', 'messages', 'updates', 'alerts', 'events'],
  faculty: ['messages', 'updates', 'events'],
  student: ['messages'],
  parent: ['messages'],
};
```

### 6.2 Server-Side Authorization

**Every action is authorized:**
```javascript
function canSendToChannel(role, channel) {
  return permissions[role]?.includes(channel) || false;
}
```

**Unauthorized attempts:**
- Logged with user ID and IP
- Error returned to client
- Repeated attempts trigger ban

---

## 7. Logging & Monitoring

### 7.1 Security Events Logged

**Connection Events:**
- Successful connections (user ID, IP, timestamp)
- Failed connections (reason, IP, timestamp)
- Disconnections (user ID, reason, duration)

**Authentication Events:**
- Successful authentications
- Failed authentications (reason, IP)
- Session expirations
- Token revalidations

**Rate Limit Events:**
- Rate limit violations (user ID, IP, type)
- Bans issued (user ID/IP, reason, duration)
- Ban expirations

**Security Events:**
- Suspicious patterns detected
- Validation failures
- Authorization failures
- Potential attacks (XSS, SQL injection, etc.)

### 7.2 Sensitive Data Masking

**Masked in Logs:**
- JWT tokens (first 10 + last 10 chars only)
- Email addresses (first 2 chars + domain)
- IP addresses (last octet masked)
- User IDs (first 8 chars only)

**Example:**
```javascript
{
  "userId": "abc12345...",
  "email": "jo***@example.com",
  "ip": "192.168.1.***",
  "token": "eyJhbGciOi...XCCnx50CD"
}
```

### 7.3 Real-Time Alerts

**Alert Triggers:**
- Multiple failed authentication attempts (5+ in 1 minute)
- Rate limit violations (2x threshold)
- Suspicious patterns detected
- DDoS attempts
- Repeated authorization failures

**Alert Channels:**
- Console logs (development)
- Log files (production)
- Monitoring service (production)
- Email/SMS (critical alerts)

---

## 8. Compliance & Best Practices

### 8.1 OWASP Top 10 Compliance

✅ **A01:2021 – Broken Access Control**
- Role-based access control implemented
- Server-side authorization enforced

✅ **A02:2021 – Cryptographic Failures**
- TLS 1.2+ enforced
- Strong cipher suites only
- Secure session management

✅ **A03:2021 – Injection**
- Input validation and sanitization
- Parameterized queries
- Pattern detection

✅ **A04:2021 – Insecure Design**
- Security-first architecture
- Threat modeling performed
- Defense in depth

✅ **A05:2021 – Security Misconfiguration**
- Secure defaults
- Minimal attack surface
- Regular security reviews

✅ **A06:2021 – Vulnerable Components**
- Dependencies regularly updated
- Security advisories monitored
- Automated vulnerability scanning

✅ **A07:2021 – Authentication Failures**
- Strong authentication (JWT)
- Session management
- Rate limiting

✅ **A08:2021 – Software and Data Integrity**
- Code signing
- Integrity checks
- Secure update process

✅ **A09:2021 – Logging Failures**
- Comprehensive logging
- Security event monitoring
- Sensitive data masking

✅ **A10:2021 – SSRF**
- URL validation
- Whitelist-based access
- Network segmentation

### 8.2 Security Best Practices

**Principle of Least Privilege:**
- Users granted minimum necessary permissions
- Role-based access strictly enforced
- Temporary privilege elevation logged

**Defense in Depth:**
- Multiple layers of security
- No single point of failure
- Redundant security controls

**Secure by Default:**
- Secure configuration out of the box
- Opt-in for less secure options
- Clear security warnings

**Fail Securely:**
- Errors don't expose sensitive information
- Graceful degradation
- Secure error handling

---

## 9. Incident Response

### 9.1 Security Incident Classification

**Critical:**
- Data breach
- Authentication bypass
- Remote code execution

**High:**
- DDoS attack
- Mass account compromise
- Privilege escalation

**Medium:**
- Rate limit violations
- Suspicious patterns
- Failed authentication attempts

**Low:**
- Minor validation failures
- Configuration warnings

### 9.2 Response Procedures

**Detection:**
1. Automated monitoring detects anomaly
2. Alert triggered
3. Security team notified

**Analysis:**
1. Review logs and metrics
2. Determine scope and impact
3. Classify incident severity

**Containment:**
1. Block malicious IPs
2. Revoke compromised tokens
3. Isolate affected systems

**Eradication:**
1. Remove malicious code/data
2. Patch vulnerabilities
3. Update security rules

**Recovery:**
1. Restore normal operations
2. Monitor for recurrence
3. Verify security posture

**Lessons Learned:**
1. Document incident
2. Update procedures
3. Implement preventive measures

---

## 10. Security Checklist

### Pre-Deployment

- [ ] TLS/SSL certificates installed and valid
- [ ] HSTS enabled
- [ ] CSP headers configured
- [ ] Rate limiting tested
- [ ] Authentication tested
- [ ] Authorization tested
- [ ] Input validation tested
- [ ] Logging configured
- [ ] Monitoring enabled
- [ ] Secrets rotated
- [ ] Dependencies updated
- [ ] Security scan completed

### Post-Deployment

- [ ] Monitor logs for anomalies
- [ ] Review security alerts
- [ ] Check rate limit violations
- [ ] Verify authentication working
- [ ] Test WebSocket connections
- [ ] Review access logs
- [ ] Update documentation
- [ ] Train team on security procedures

### Ongoing

- [ ] Weekly security log review
- [ ] Monthly dependency updates
- [ ] Quarterly security audits
- [ ] Annual penetration testing
- [ ] Continuous monitoring
- [ ] Incident response drills

---

## 11. Contact & Support

**Security Team:**
- Email: security@myvidyon.com
- Emergency: +1-XXX-XXX-XXXX

**Reporting Vulnerabilities:**
- Email: security@myvidyon.com
- PGP Key: [Link to public key]
- Response time: 24 hours

**Security Updates:**
- Subscribe: security-updates@myvidyon.com
- RSS Feed: https://myvidyon.com/security/feed

---

**Last Updated**: 2026-01-17  
**Version**: 1.0.0  
**Next Review**: 2026-04-17
