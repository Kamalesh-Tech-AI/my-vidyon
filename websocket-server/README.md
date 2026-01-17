# WebSocket Server

Production-grade WebSocket server for My Vidyon platform with comprehensive security features.

## Features

- ✅ Secure WSS connections with JWT authentication
- ✅ Automatic reconnection with exponential backoff
- ✅ Heartbeat mechanism (ping/pong)
- ✅ Rate limiting and connection throttling
- ✅ Message validation and sanitization
- ✅ Channel-based messaging with filters
- ✅ Role-based authorization
- ✅ Comprehensive security logging
- ✅ XSS/SQL injection protection
- ✅ DDoS protection

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

### 3. Start Server

```bash
# Development
npm run dev

# Production
npm start
```

## Configuration

See `config.js` for all configuration options.

Key settings:
- **Port**: 8081 (default)
- **Rate Limit**: 100 messages/minute
- **Max Connections**: 10 per user
- **Message Size**: 100KB max
- **Idle Timeout**: 5 minutes

## API Documentation

See `../docs/WEBSOCKET_API.md` for complete API documentation.

## Security

See `../docs/SECURITY_POLICY.md` for security guidelines.

## Monitoring

### Health Check
```bash
curl http://localhost:8081/health
```

### Statistics
```bash
curl http://localhost:8081/stats
```

## Testing

```bash
# Run all tests
npm test

# Run specific tests
npm run test:connection
npm run test:security
npm run test:load
```

## Production Deployment

See `../docs/DEPLOYMENT_CHECKLIST.md` for deployment guide.

## Troubleshooting

### Server won't start

1. Check port 8081 is not in use
2. Verify environment variables are set
3. Check Node.js version (18+ required)

### Connections failing

1. Verify JWT token is valid
2. Check firewall settings
3. Review server logs

### High memory usage

1. Check connection count
2. Review rate limit violations
3. Monitor for memory leaks

## Support

For issues or questions, contact the backend team.

## License

MIT
