/**
 * WebSocket Server Configuration
 * Environment-based configuration for development and production
 */

import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

export const config = {
  // Server Configuration
  server: {
    port: process.env.WS_PORT || 8081,
    host: process.env.WS_HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
  },

  // Security Configuration
  security: {
    // JWT Configuration
    jwtSecret: process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-secret-key-change-in-production',
    jwtAlgorithm: 'HS256',
    jwtExpiresIn: '24h',

    // TLS Configuration
    tls: {
      enabled: process.env.NODE_ENV === 'production',
      minVersion: 'TLSv1.2',
      ciphers: [
        'ECDHE-ECDSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES128-GCM-SHA256',
        'ECDHE-ECDSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES256-GCM-SHA384',
      ].join(':'),
    },

    // CORS Configuration
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? ['https://yourdomain.com']
        : ['http://localhost:8080', 'http://localhost:5173'],
      credentials: true,
    },

    // Rate Limiting
    rateLimit: {
      windowMs: 60 * 1000, // 1 minute
      maxMessages: 100, // 100 messages per minute
      maxConnections: 10, // 10 connections per user
      banDuration: 15 * 60 * 1000, // 15 minutes ban
    },

    // Message Validation
    message: {
      maxSize: 100 * 1024, // 100KB
      allowedTypes: [
        'subscribe',
        'unsubscribe',
        'message',
        'broadcast',
        'ping',
        'pong',
      ],
    },

    // Connection Security
    connection: {
      idleTimeout: 5 * 60 * 1000, // 5 minutes
      heartbeatInterval: 30 * 1000, // 30 seconds
      maxReconnectAttempts: 5,
      reconnectBackoff: 1000, // 1 second initial backoff
    },

    // CSP Headers
    csp: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: [
          "'self'",
          'wss://localhost:8081',
          'https://ccyqzcaghwaggtmkmigi.supabase.co',
        ],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
  },

  // Supabase Configuration
  supabase: {
    url: process.env.VITE_SUPABASE_URL,
    anonKey: process.env.VITE_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    maskSensitiveData: true,
    logConnections: true,
    logMessages: process.env.NODE_ENV === 'development',
    logErrors: true,
  },

  // Channel Configuration
  channels: {
    maxChannelsPerUser: 50,
    allowedChannels: [
      'notifications',
      'messages',
      'updates',
      'alerts',
      'analytics',
      'events',
    ],
  },
};

// Validation
if (!config.supabase.url || !config.supabase.anonKey) {
  console.warn('⚠️  Supabase configuration missing. WebSocket authentication may not work.');
}

if (config.server.env === 'production' && config.security.jwtSecret === 'your-secret-key-change-in-production') {
  throw new Error('🚨 CRITICAL: JWT secret must be changed in production!');
}

export default config;
