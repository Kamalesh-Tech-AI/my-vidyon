/**
 * Rate Limiter
 * Implements rate limiting and connection throttling
 */

import { config } from './config.js';
import { logger } from './logger.js';

class RateLimiter {
    constructor() {
        // Message rate limiting: userId -> { count, resetTime }
        this.messageRateLimits = new Map();

        // Connection rate limiting: userId -> connectionCount
        this.connectionLimits = new Map();

        // IP-based connection limiting: ip -> { count, resetTime }
        this.ipConnectionLimits = new Map();

        // Banned users/IPs: key -> banUntil
        this.bannedEntities = new Map();

        // Cleanup interval
        this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Every minute
    }

    /**
     * Check if user/IP is banned
     */
    isBanned(key) {
        const banUntil = this.bannedEntities.get(key);

        if (!banUntil) return false;

        if (Date.now() > banUntil) {
            this.bannedEntities.delete(key);
            return false;
        }

        return true;
    }

    /**
     * Ban user or IP
     */
    ban(key, reason, duration = config.security.rateLimit.banDuration) {
        const banUntil = Date.now() + duration;
        this.bannedEntities.set(key, banUntil);

        logger.warn('RATE_LIMIT', 'Entity banned', {
            key,
            reason,
            duration: duration / 1000 / 60 + ' minutes',
        });
    }

    /**
     * Check message rate limit
     */
    checkMessageRateLimit(userId, ip) {
        const key = `msg_${userId}`;

        // Check if banned
        if (this.isBanned(userId) || this.isBanned(ip)) {
            logger.logRateLimitViolation(userId, ip, 'banned');
            return {
                allowed: false,
                reason: 'Temporarily banned due to rate limit violations',
            };
        }

        const now = Date.now();
        const limit = this.messageRateLimits.get(key);

        // Initialize if not exists
        if (!limit) {
            this.messageRateLimits.set(key, {
                count: 1,
                resetTime: now + config.security.rateLimit.windowMs,
            });
            return { allowed: true };
        }

        // Reset if window expired
        if (now > limit.resetTime) {
            this.messageRateLimits.set(key, {
                count: 1,
                resetTime: now + config.security.rateLimit.windowMs,
            });
            return { allowed: true };
        }

        // Increment count
        limit.count++;

        // Check if exceeded
        if (limit.count > config.security.rateLimit.maxMessages) {
            logger.logRateLimitViolation(userId, ip, 'messages');

            // Ban if severely exceeded (2x limit)
            if (limit.count > config.security.rateLimit.maxMessages * 2) {
                this.ban(userId, 'Severe message rate limit violation');
                this.ban(ip, 'Severe message rate limit violation');
            }

            return {
                allowed: false,
                reason: 'Message rate limit exceeded',
                retryAfter: limit.resetTime - now,
            };
        }

        return { allowed: true };
    }

    /**
     * Check connection limit per user
     */
    checkConnectionLimit(userId) {
        const count = this.connectionLimits.get(userId) || 0;

        if (count >= config.security.rateLimit.maxConnections) {
            logger.logRateLimitViolation(userId, 'unknown', 'connections');
            return {
                allowed: false,
                reason: `Maximum ${config.security.rateLimit.maxConnections} connections per user`,
            };
        }

        return { allowed: true };
    }

    /**
     * Check IP-based connection limit
     */
    checkIpConnectionLimit(ip) {
        const now = Date.now();
        const limit = this.ipConnectionLimits.get(ip);

        const MAX_CONNECTIONS_PER_IP = 50; // Prevent DDoS
        const WINDOW_MS = 60000; // 1 minute

        if (!limit) {
            this.ipConnectionLimits.set(ip, {
                count: 1,
                resetTime: now + WINDOW_MS,
            });
            return { allowed: true };
        }

        if (now > limit.resetTime) {
            this.ipConnectionLimits.set(ip, {
                count: 1,
                resetTime: now + WINDOW_MS,
            });
            return { allowed: true };
        }

        limit.count++;

        if (limit.count > MAX_CONNECTIONS_PER_IP) {
            logger.logSuspiciousActivity(null, ip, 'Excessive connections from single IP', {
                count: limit.count,
            });

            // Auto-ban IP
            this.ban(ip, 'Excessive connections (possible DDoS)');

            return {
                allowed: false,
                reason: 'Too many connections from this IP',
            };
        }

        return { allowed: true };
    }

    /**
     * Register new connection
     */
    registerConnection(userId) {
        const count = this.connectionLimits.get(userId) || 0;
        this.connectionLimits.set(userId, count + 1);
    }

    /**
     * Unregister connection
     */
    unregisterConnection(userId) {
        const count = this.connectionLimits.get(userId) || 0;
        if (count <= 1) {
            this.connectionLimits.delete(userId);
        } else {
            this.connectionLimits.set(userId, count - 1);
        }
    }

    /**
     * Get current stats for user
     */
    getStats(userId) {
        const messageLimit = this.messageRateLimits.get(`msg_${userId}`);
        const connectionCount = this.connectionLimits.get(userId) || 0;

        return {
            connections: connectionCount,
            maxConnections: config.security.rateLimit.maxConnections,
            messages: messageLimit ? messageLimit.count : 0,
            maxMessages: config.security.rateLimit.maxMessages,
            windowMs: config.security.rateLimit.windowMs,
            isBanned: this.isBanned(userId),
        };
    }

    /**
     * Cleanup expired entries
     */
    cleanup() {
        const now = Date.now();

        // Cleanup message rate limits
        for (const [key, limit] of this.messageRateLimits.entries()) {
            if (now > limit.resetTime) {
                this.messageRateLimits.delete(key);
            }
        }

        // Cleanup IP connection limits
        for (const [ip, limit] of this.ipConnectionLimits.entries()) {
            if (now > limit.resetTime) {
                this.ipConnectionLimits.delete(ip);
            }
        }

        // Cleanup bans
        for (const [key, banUntil] of this.bannedEntities.entries()) {
            if (now > banUntil) {
                this.bannedEntities.delete(key);
                logger.info('RATE_LIMIT', 'Ban expired', { key });
            }
        }
    }

    /**
     * Destroy rate limiter
     */
    destroy() {
        clearInterval(this.cleanupInterval);
        this.messageRateLimits.clear();
        this.connectionLimits.clear();
        this.ipConnectionLimits.clear();
        this.bannedEntities.clear();
    }
}

export const rateLimiter = new RateLimiter();
export default rateLimiter;
