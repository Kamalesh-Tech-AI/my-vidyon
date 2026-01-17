/**
 * Message Validator
 * Validates WebSocket messages against schema and security rules
 */

import Joi from 'joi';
import { config } from './config.js';
import { logger } from './logger.js';

/**
 * Message schemas
 */
const schemas = {
    // Subscribe to channel
    subscribe: Joi.object({
        type: Joi.string().valid('subscribe').required(),
        channel: Joi.string()
            .valid(...config.channels.allowedChannels)
            .required(),
        filters: Joi.object().optional(),
    }),

    // Unsubscribe from channel
    unsubscribe: Joi.object({
        type: Joi.string().valid('unsubscribe').required(),
        channel: Joi.string()
            .valid(...config.channels.allowedChannels)
            .required(),
    }),

    // Send message to channel
    message: Joi.object({
        type: Joi.string().valid('message').required(),
        channel: Joi.string()
            .valid(...config.channels.allowedChannels)
            .required(),
        data: Joi.object().required(),
        targetUserId: Joi.string().optional(), // For targeted messages
    }),

    // Broadcast message
    broadcast: Joi.object({
        type: Joi.string().valid('broadcast').required(),
        channel: Joi.string()
            .valid(...config.channels.allowedChannels)
            .required(),
        data: Joi.object().required(),
    }),

    // Ping
    ping: Joi.object({
        type: Joi.string().valid('ping').required(),
        timestamp: Joi.number().optional(),
    }),

    // Pong
    pong: Joi.object({
        type: Joi.string().valid('pong').required(),
        timestamp: Joi.number().optional(),
    }),
};

/**
 * Validate message structure
 */
export function validateMessage(message, userId) {
    try {
        // Check message size
        const messageSize = Buffer.byteLength(JSON.stringify(message));
        if (messageSize > config.security.message.maxSize) {
            logger.logValidationFailure(userId, message.type, 'Message too large');
            return {
                valid: false,
                error: `Message size ${messageSize} exceeds maximum ${config.security.message.maxSize}`,
            };
        }

        // Check message type
        if (!message.type) {
            logger.logValidationFailure(userId, 'unknown', 'Missing message type');
            return {
                valid: false,
                error: 'Message type is required',
            };
        }

        // Check if type is allowed
        if (!config.security.message.allowedTypes.includes(message.type)) {
            logger.logValidationFailure(userId, message.type, 'Invalid message type');
            return {
                valid: false,
                error: `Invalid message type: ${message.type}`,
            };
        }

        // Validate against schema
        const schema = schemas[message.type];
        if (!schema) {
            logger.logValidationFailure(userId, message.type, 'No schema defined');
            return {
                valid: false,
                error: `No validation schema for type: ${message.type}`,
            };
        }

        const { error, value } = schema.validate(message, {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            const errors = error.details.map(d => d.message).join(', ');
            logger.logValidationFailure(userId, message.type, errors);
            return {
                valid: false,
                error: errors,
            };
        }

        return {
            valid: true,
            message: value,
        };
    } catch (error) {
        logger.error('VALIDATION', 'Message validation error', {
            error: error.message,
            userId,
        });

        return {
            valid: false,
            error: 'Message validation failed',
        };
    }
}

/**
 * Sanitize message data
 * Prevents XSS and injection attacks
 */
export function sanitizeData(data) {
    if (typeof data === 'string') {
        // Remove potential XSS vectors
        return data
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .trim();
    }

    if (Array.isArray(data)) {
        return data.map(sanitizeData);
    }

    if (typeof data === 'object' && data !== null) {
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            sanitized[key] = sanitizeData(value);
        }
        return sanitized;
    }

    return data;
}

/**
 * Check for suspicious patterns
 */
export function detectSuspiciousPatterns(message, userId, ip) {
    const suspicious = [];

    // Check for SQL injection patterns
    const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)/i,
        /(UNION\s+SELECT)/i,
        /(OR\s+1\s*=\s*1)/i,
    ];

    const messageStr = JSON.stringify(message);
    for (const pattern of sqlPatterns) {
        if (pattern.test(messageStr)) {
            suspicious.push('Potential SQL injection');
            break;
        }
    }

    // Check for XSS patterns
    const xssPatterns = [
        /<script/i,
        /javascript:/i,
        /onerror\s*=/i,
        /onclick\s*=/i,
    ];

    for (const pattern of xssPatterns) {
        if (pattern.test(messageStr)) {
            suspicious.push('Potential XSS attack');
            break;
        }
    }

    // Check for path traversal
    if (messageStr.includes('../') || messageStr.includes('..\\')) {
        suspicious.push('Potential path traversal');
    }

    // Check for command injection
    const cmdPatterns = [
        /(\||;|&|\$\(|\`)/,
    ];

    for (const pattern of cmdPatterns) {
        if (pattern.test(messageStr)) {
            suspicious.push('Potential command injection');
            break;
        }
    }

    // Log if suspicious patterns found
    if (suspicious.length > 0) {
        logger.logSuspiciousActivity(userId, ip, 'Suspicious message patterns detected', {
            patterns: suspicious,
            messageType: message.type,
        });
    }

    return suspicious;
}

/**
 * Validate and sanitize message
 */
export function validateAndSanitize(rawMessage, userId, ip) {
    try {
        // Parse if string
        const message = typeof rawMessage === 'string'
            ? JSON.parse(rawMessage)
            : rawMessage;

        // Validate structure
        const validation = validateMessage(message, userId);
        if (!validation.valid) {
            return {
                valid: false,
                error: validation.error,
            };
        }

        // Check for suspicious patterns
        const suspicious = detectSuspiciousPatterns(message, userId, ip);
        if (suspicious.length > 0) {
            return {
                valid: false,
                error: 'Message contains suspicious patterns',
                suspicious,
            };
        }

        // Sanitize data
        if (validation.message.data) {
            validation.message.data = sanitizeData(validation.message.data);
        }

        return {
            valid: true,
            message: validation.message,
        };
    } catch (error) {
        logger.error('VALIDATION', 'Message parsing error', {
            error: error.message,
            userId,
        });

        return {
            valid: false,
            error: 'Invalid message format',
        };
    }
}

export default {
    validateMessage,
    sanitizeData,
    detectSuspiciousPatterns,
    validateAndSanitize,
};
