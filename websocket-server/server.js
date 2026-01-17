/**
 * WebSocket Server
 * Production-grade WebSocket server with security hardening
 */

import { WebSocketServer } from 'ws';
import http from 'http';
import https from 'https';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config.js';
import { logger } from './logger.js';
import { authenticateConnection, validateSession, shouldRevalidateSession } from './auth.middleware.js';
import { rateLimiter } from './rate-limiter.js';
import { validateAndSanitize } from './message-validator.js';
import { channelManager } from './channel-manager.js';

// Create Express app for health checks
const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: config.security.csp.directives,
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
}));

app.use(cors(config.security.cors));
app.use(express.json({ limit: '10kb' }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        connections: wss ? wss.clients.size : 0,
    });
});

// Stats endpoint (for monitoring)
app.get('/stats', (req, res) => {
    const stats = channelManager.getAllStats();
    res.json({
        ...stats,
        totalConnections: wss ? wss.clients.size : 0,
        uptime: process.uptime(),
    });
});

// Create HTTP/HTTPS server
const server = config.security.tls.enabled
    ? https.createServer({
        // TLS configuration would go here in production
        // cert: fs.readFileSync('path/to/cert.pem'),
        // key: fs.readFileSync('path/to/key.pem'),
        minVersion: config.security.tls.minVersion,
        ciphers: config.security.tls.ciphers,
    }, app)
    : http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({
    server,
    verifyClient: async (info, callback) => {
        try {
            const ip = info.req.socket.remoteAddress;

            // Check IP-based rate limiting
            const ipCheck = rateLimiter.checkIpConnectionLimit(ip);
            if (!ipCheck.allowed) {
                logger.warn('CONNECTION', 'IP connection limit exceeded', { ip });
                callback(false, 429, ipCheck.reason);
                return;
            }

            // Authenticate connection
            const auth = await authenticateConnection(info.req, info.req.socket);

            if (!auth.authenticated) {
                callback(false, 401, auth.error);
                return;
            }

            // Check user connection limit
            const userCheck = rateLimiter.checkConnectionLimit(auth.user.id);
            if (!userCheck.allowed) {
                callback(false, 429, userCheck.reason);
                return;
            }

            // Store auth info for later use
            info.req.authUser = auth.user;
            info.req.authToken = auth.token;

            callback(true);
        } catch (error) {
            logger.error('CONNECTION', 'Verification error', {
                error: error.message,
            });
            callback(false, 500, 'Internal server error');
        }
    },
});

/**
 * Handle new WebSocket connection
 */
wss.on('connection', (ws, request) => {
    const user = request.authUser;
    const token = request.authToken;
    const ip = request.socket.remoteAddress;

    // Attach user info to WebSocket
    ws.userId = user.id;
    ws.userEmail = user.email;
    ws.userRole = user.role;
    ws.authToken = token;
    ws.ip = ip;
    ws.connectedAt = Date.now();
    ws.lastActivity = Date.now();
    ws.lastAuthValidation = Date.now();
    ws.isAlive = true;

    // Register connection
    rateLimiter.registerConnection(user.id);

    // Send welcome message
    ws.send(JSON.stringify({
        type: 'connected',
        message: 'WebSocket connection established',
        userId: user.id,
        timestamp: Date.now(),
    }));

    /**
     * Handle incoming messages
     */
    ws.on('message', async (rawMessage) => {
        try {
            ws.lastActivity = Date.now();

            // Check rate limit
            const rateCheck = rateLimiter.checkMessageRateLimit(ws.userId, ws.ip);
            if (!rateCheck.allowed) {
                ws.send(JSON.stringify({
                    type: 'error',
                    error: rateCheck.reason,
                    retryAfter: rateCheck.retryAfter,
                }));
                return;
            }

            // Validate and sanitize message
            const validation = validateAndSanitize(rawMessage, ws.userId, ws.ip);
            if (!validation.valid) {
                ws.send(JSON.stringify({
                    type: 'error',
                    error: validation.error,
                }));

                // Close connection if suspicious
                if (validation.suspicious) {
                    ws.close(1008, 'Policy violation');
                }
                return;
            }

            const message = validation.message;

            // Revalidate session periodically
            if (shouldRevalidateSession(ws)) {
                const sessionValid = await validateSession(ws, ws.authToken);
                if (!sessionValid) {
                    return; // Session validation will close the connection
                }
            }

            // Handle message based on type
            await handleMessage(ws, message);

        } catch (error) {
            logger.error('MESSAGE', 'Message handling error', {
                error: error.message,
                userId: ws.userId,
            });

            ws.send(JSON.stringify({
                type: 'error',
                error: 'Failed to process message',
            }));
        }
    });

    /**
     * Handle pong (heartbeat response)
     */
    ws.on('pong', () => {
        ws.isAlive = true;
        ws.lastActivity = Date.now();
    });

    /**
     * Handle connection close
     */
    ws.on('close', (code, reason) => {
        logger.logDisconnection(ws.userId, reason.toString());

        // Unregister connection
        rateLimiter.unregisterConnection(ws.userId);

        // Unsubscribe from all channels
        channelManager.unsubscribeAll(ws);
    });

    /**
     * Handle errors
     */
    ws.on('error', (error) => {
        logger.error('WEBSOCKET', 'WebSocket error', {
            error: error.message,
            userId: ws.userId,
        });
    });
});

/**
 * Handle different message types
 */
async function handleMessage(ws, message) {
    switch (message.type) {
        case 'subscribe':
            handleSubscribe(ws, message);
            break;

        case 'unsubscribe':
            handleUnsubscribe(ws, message);
            break;

        case 'message':
            handleChannelMessage(ws, message);
            break;

        case 'broadcast':
            handleBroadcast(ws, message);
            break;

        case 'ping':
            handlePing(ws, message);
            break;

        case 'pong':
            // Already handled in ws.on('pong')
            break;

        default:
            ws.send(JSON.stringify({
                type: 'error',
                error: `Unknown message type: ${message.type}`,
            }));
    }
}

/**
 * Handle channel subscription
 */
function handleSubscribe(ws, message) {
    const result = channelManager.subscribe(ws, message.channel, message.filters);

    ws.send(JSON.stringify({
        type: 'subscribed',
        ...result,
    }));
}

/**
 * Handle channel unsubscription
 */
function handleUnsubscribe(ws, message) {
    const result = channelManager.unsubscribe(ws, message.channel);

    ws.send(JSON.stringify({
        type: 'unsubscribed',
        ...result,
    }));
}

/**
 * Handle channel message
 */
function handleChannelMessage(ws, message) {
    // Check authorization (role-based)
    if (!canSendToChannel(ws.userRole, message.channel)) {
        ws.send(JSON.stringify({
            type: 'error',
            error: 'Unauthorized to send to this channel',
        }));
        return;
    }

    // Send to specific user or broadcast
    if (message.targetUserId) {
        const result = channelManager.sendToUser(message.targetUserId, {
            type: 'message',
            channel: message.channel,
            data: message.data,
            from: ws.userId,
            timestamp: Date.now(),
        });

        ws.send(JSON.stringify({
            type: 'message_sent',
            ...result,
        }));
    } else {
        const result = channelManager.broadcast(message.channel, {
            type: 'message',
            channel: message.channel,
            data: message.data,
            from: ws.userId,
            timestamp: Date.now(),
        }, ws);

        ws.send(JSON.stringify({
            type: 'message_sent',
            ...result,
        }));
    }
}

/**
 * Handle broadcast message
 */
function handleBroadcast(ws, message) {
    // Only admins and institutions can broadcast
    if (!['admin', 'institution'].includes(ws.userRole)) {
        ws.send(JSON.stringify({
            type: 'error',
            error: 'Unauthorized to broadcast',
        }));
        return;
    }

    const result = channelManager.broadcast(message.channel, {
        type: 'broadcast',
        channel: message.channel,
        data: message.data,
        from: ws.userId,
        timestamp: Date.now(),
    });

    ws.send(JSON.stringify({
        type: 'broadcast_sent',
        ...result,
    }));
}

/**
 * Handle ping
 */
function handlePing(ws, message) {
    ws.send(JSON.stringify({
        type: 'pong',
        timestamp: message.timestamp || Date.now(),
    }));
}

/**
 * Check if user can send to channel (role-based authorization)
 */
function canSendToChannel(role, channel) {
    const permissions = {
        admin: ['notifications', 'messages', 'updates', 'alerts', 'analytics', 'events'],
        institution: ['notifications', 'messages', 'updates', 'alerts', 'events'],
        faculty: ['messages', 'updates', 'events'],
        student: ['messages'],
        parent: ['messages'],
    };

    return permissions[role]?.includes(channel) || false;
}

/**
 * Heartbeat interval to detect dead connections
 */
const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
        // Check if connection is alive
        if (ws.isAlive === false) {
            logger.info('HEARTBEAT', 'Terminating dead connection', {
                userId: ws.userId,
            });
            return ws.terminate();
        }

        // Check idle timeout
        const idleTime = Date.now() - ws.lastActivity;
        if (idleTime > config.security.connection.idleTimeout) {
            logger.info('HEARTBEAT', 'Closing idle connection', {
                userId: ws.userId,
                idleTime: idleTime / 1000 + 's',
            });
            ws.close(1000, 'Idle timeout');
            return;
        }

        // Send ping
        ws.isAlive = false;
        ws.ping();
    });
}, config.security.connection.heartbeatInterval);

/**
 * Cleanup on server close
 */
wss.on('close', () => {
    clearInterval(heartbeatInterval);
    rateLimiter.destroy();
});

/**
 * Start server
 */
const PORT = config.server.port;
const HOST = config.server.host;

server.listen(PORT, HOST, () => {
    logger.info('SERVER', `WebSocket server started`, {
        host: HOST,
        port: PORT,
        env: config.server.env,
        tls: config.security.tls.enabled,
    });

    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 WebSocket Server Running                            ║
║                                                           ║
║   Host: ${HOST.padEnd(47)}║
║   Port: ${PORT.toString().padEnd(47)}║
║   Environment: ${config.server.env.padEnd(40)}║
║   TLS: ${(config.security.tls.enabled ? 'Enabled' : 'Disabled').padEnd(48)}║
║                                                           ║
║   Health Check: http://${HOST}:${PORT}/health${' '.repeat(20)}║
║   Stats: http://${HOST}:${PORT}/stats${' '.repeat(26)}║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
    logger.info('SERVER', 'SIGTERM received, shutting down gracefully');

    server.close(() => {
        logger.info('SERVER', 'Server closed');
        process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
        logger.error('SERVER', 'Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
});

process.on('SIGINT', () => {
    logger.info('SERVER', 'SIGINT received, shutting down gracefully');
    process.exit(0);
});

export { wss, server, app };
