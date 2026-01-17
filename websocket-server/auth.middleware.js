/**
 * Authentication Middleware
 * Validates JWT tokens and authenticates WebSocket connections
 */

import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { logger } from './logger.js';

/**
 * Extract token from WebSocket upgrade request
 */
function extractToken(request) {
    // Try query parameter first (for WebSocket connections)
    const url = new URL(request.url, `http://${request.headers.host}`);
    const queryToken = url.searchParams.get('token');

    if (queryToken) {
        return queryToken;
    }

    // Try Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    // Try cookie
    const cookies = parseCookies(request.headers.cookie);
    if (cookies.auth_token) {
        return cookies.auth_token;
    }

    return null;
}

/**
 * Parse cookies from header
 */
function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader) return cookies;

    cookieHeader.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        cookies[name] = value;
    });

    return cookies;
}

/**
 * Verify JWT token
 */
async function verifyToken(token) {
    try {
        // Verify token signature and expiration
        const decoded = jwt.verify(token, config.security.jwtSecret, {
            algorithms: [config.security.jwtAlgorithm],
        });

        // Validate required fields
        if (!decoded.sub && !decoded.user_id) {
            throw new Error('Token missing user identifier');
        }

        // Extract user information
        const userId = decoded.sub || decoded.user_id;
        const email = decoded.email;
        const role = decoded.role || decoded.user_metadata?.role;

        return {
            valid: true,
            userId,
            email,
            role,
            exp: decoded.exp,
        };
    } catch (error) {
        logger.debug('AUTH', 'Token verification failed', {
            error: error.message,
        });

        return {
            valid: false,
            error: error.message,
        };
    }
}

/**
 * Authenticate WebSocket connection
 */
export async function authenticateConnection(request, socket) {
    const ip = request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    try {
        // Extract token
        const token = extractToken(request);

        if (!token) {
            logger.logAuthFailure(ip, 'No token provided');
            return {
                authenticated: false,
                error: 'Authentication required',
            };
        }

        // Verify token
        const verification = await verifyToken(token);

        if (!verification.valid) {
            logger.logAuthFailure(ip, verification.error);
            return {
                authenticated: false,
                error: 'Invalid or expired token',
            };
        }

        // Check token expiration (warn if expiring soon)
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = verification.exp - now;

        if (timeUntilExpiry < 300) { // Less than 5 minutes
            logger.warn('AUTH', 'Token expiring soon', {
                userId: verification.userId,
                expiresIn: timeUntilExpiry,
            });
        }

        // Log successful authentication
        logger.logConnection(verification.userId, ip, userAgent);

        return {
            authenticated: true,
            user: {
                id: verification.userId,
                email: verification.email,
                role: verification.role,
            },
            token,
        };
    } catch (error) {
        logger.error('AUTH', 'Authentication error', {
            error: error.message,
            ip,
        });

        return {
            authenticated: false,
            error: 'Authentication failed',
        };
    }
}

/**
 * Validate session on message
 * Re-validates auth periodically to prevent session hijacking
 */
export async function validateSession(ws, token) {
    try {
        const verification = await verifyToken(token);

        if (!verification.valid) {
            logger.warn('AUTH', 'Session validation failed', {
                userId: ws.userId,
                reason: verification.error,
            });

            // Send auth error to client
            ws.send(JSON.stringify({
                type: 'auth_error',
                message: 'Session expired. Please reconnect.',
            }));

            // Close connection
            ws.close(1008, 'Session expired');
            return false;
        }

        // Update last validation time
        ws.lastAuthValidation = Date.now();

        return true;
    } catch (error) {
        logger.error('AUTH', 'Session validation error', {
            error: error.message,
            userId: ws.userId,
        });

        return false;
    }
}

/**
 * Middleware to check if session needs revalidation
 */
export function shouldRevalidateSession(ws) {
    const REVALIDATION_INTERVAL = 5 * 60 * 1000; // 5 minutes

    if (!ws.lastAuthValidation) {
        ws.lastAuthValidation = Date.now();
        return false;
    }

    const timeSinceLastValidation = Date.now() - ws.lastAuthValidation;
    return timeSinceLastValidation > REVALIDATION_INTERVAL;
}

/**
 * Generate authentication token (for testing)
 */
export function generateTestToken(userId, email, role = 'student') {
    return jwt.sign(
        {
            sub: userId,
            email,
            role,
            user_metadata: { role },
        },
        config.security.jwtSecret,
        {
            algorithm: config.security.jwtAlgorithm,
            expiresIn: config.security.jwtExpiresIn,
        }
    );
}

export default {
    authenticateConnection,
    validateSession,
    shouldRevalidateSession,
    generateTestToken,
};
