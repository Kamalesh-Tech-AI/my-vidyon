/**
 * Security Logger
 * Logs security events with sensitive data masking
 */

import { config } from './config.js';

const LOG_LEVELS = {
    ERROR: 'ERROR',
    WARN: 'WARN',
    INFO: 'INFO',
    DEBUG: 'DEBUG',
};

class SecurityLogger {
    constructor() {
        this.level = config.logging.level.toUpperCase();
    }

    /**
     * Mask sensitive data in logs
     */
    maskSensitiveData(data) {
        if (!config.logging.maskSensitiveData) return data;

        const masked = { ...data };

        // Mask JWT tokens
        if (masked.token) {
            masked.token = masked.token.substring(0, 10) + '...' + masked.token.substring(masked.token.length - 10);
        }

        // Mask email addresses
        if (masked.email) {
            const [user, domain] = masked.email.split('@');
            masked.email = user.substring(0, 2) + '***@' + domain;
        }

        // Mask IP addresses (last octet)
        if (masked.ip) {
            const parts = masked.ip.split('.');
            if (parts.length === 4) {
                parts[3] = '***';
                masked.ip = parts.join('.');
            }
        }

        // Mask user IDs
        if (masked.userId) {
            masked.userId = masked.userId.substring(0, 8) + '...';
        }

        return masked;
    }

    /**
     * Format log message
     */
    formatMessage(level, category, message, data = {}) {
        const timestamp = new Date().toISOString();
        const maskedData = this.maskSensitiveData(data);

        return {
            timestamp,
            level,
            category,
            message,
            ...maskedData,
        };
    }

    /**
     * Check if log level should be logged
     */
    shouldLog(level) {
        const levels = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
        const currentLevelIndex = levels.indexOf(this.level);
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex <= currentLevelIndex;
    }

    /**
     * Log error
     */
    error(category, message, data = {}) {
        if (!this.shouldLog(LOG_LEVELS.ERROR)) return;

        const logEntry = this.formatMessage(LOG_LEVELS.ERROR, category, message, data);
        console.error(JSON.stringify(logEntry));

        // In production, send to monitoring service
        if (config.server.env === 'production') {
            // TODO: Send to monitoring service (e.g., Sentry, DataDog)
        }
    }

    /**
     * Log warning
     */
    warn(category, message, data = {}) {
        if (!this.shouldLog(LOG_LEVELS.WARN)) return;

        const logEntry = this.formatMessage(LOG_LEVELS.WARN, category, message, data);
        console.warn(JSON.stringify(logEntry));
    }

    /**
     * Log info
     */
    info(category, message, data = {}) {
        if (!this.shouldLog(LOG_LEVELS.INFO)) return;

        const logEntry = this.formatMessage(LOG_LEVELS.INFO, category, message, data);
        console.log(JSON.stringify(logEntry));
    }

    /**
     * Log debug
     */
    debug(category, message, data = {}) {
        if (!this.shouldLog(LOG_LEVELS.DEBUG)) return;

        const logEntry = this.formatMessage(LOG_LEVELS.DEBUG, category, message, data);
        console.log(JSON.stringify(logEntry));
    }

    /**
     * Log connection event
     */
    logConnection(userId, ip, userAgent) {
        if (!config.logging.logConnections) return;

        this.info('CONNECTION', 'Client connected', {
            userId,
            ip,
            userAgent,
        });
    }

    /**
     * Log disconnection event
     */
    logDisconnection(userId, reason) {
        if (!config.logging.logConnections) return;

        this.info('DISCONNECTION', 'Client disconnected', {
            userId,
            reason,
        });
    }

    /**
     * Log authentication failure
     */
    logAuthFailure(ip, reason) {
        this.warn('AUTH_FAILURE', 'Authentication failed', {
            ip,
            reason,
        });
    }

    /**
     * Log rate limit violation
     */
    logRateLimitViolation(userId, ip, type) {
        this.warn('RATE_LIMIT', 'Rate limit exceeded', {
            userId,
            ip,
            type,
        });
    }

    /**
     * Log message validation failure
     */
    logValidationFailure(userId, messageType, reason) {
        this.warn('VALIDATION_FAILURE', 'Message validation failed', {
            userId,
            messageType,
            reason,
        });
    }

    /**
     * Log suspicious activity
     */
    logSuspiciousActivity(userId, ip, activity, details) {
        this.error('SUSPICIOUS_ACTIVITY', activity, {
            userId,
            ip,
            ...details,
        });

        // In production, trigger alert
        if (config.server.env === 'production') {
            // TODO: Send alert to security team
        }
    }

    /**
     * Log message (if enabled)
     */
    logMessage(userId, channel, messageType) {
        if (!config.logging.logMessages) return;

        this.debug('MESSAGE', 'Message sent', {
            userId,
            channel,
            messageType,
        });
    }
}

export const logger = new SecurityLogger();
export default logger;
