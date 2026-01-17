/**
 * Channel Manager
 * Manages WebSocket channels/rooms for targeted messaging
 */

import { config } from './config.js';
import { logger } from './logger.js';

class ChannelManager {
    constructor() {
        // Channel subscriptions: channel -> Set<ws>
        this.channels = new Map();

        // User subscriptions: userId -> Set<channel>
        this.userSubscriptions = new Map();

        // Initialize allowed channels
        config.channels.allowedChannels.forEach(channel => {
            this.channels.set(channel, new Set());
        });
    }

    /**
     * Subscribe user to channel
     */
    subscribe(ws, channel, filters = {}) {
        try {
            // Validate channel
            if (!config.channels.allowedChannels.includes(channel)) {
                logger.warn('CHANNEL', 'Invalid channel subscription attempt', {
                    userId: ws.userId,
                    channel,
                });
                return {
                    success: false,
                    error: `Invalid channel: ${channel}`,
                };
            }

            // Check subscription limit
            const userSubs = this.userSubscriptions.get(ws.userId) || new Set();
            if (userSubs.size >= config.channels.maxChannelsPerUser) {
                logger.warn('CHANNEL', 'Channel subscription limit exceeded', {
                    userId: ws.userId,
                    limit: config.channels.maxChannelsPerUser,
                });
                return {
                    success: false,
                    error: `Maximum ${config.channels.maxChannelsPerUser} channel subscriptions allowed`,
                };
            }

            // Get or create channel
            if (!this.channels.has(channel)) {
                this.channels.set(channel, new Set());
            }

            const channelSubs = this.channels.get(channel);

            // Add to channel
            channelSubs.add(ws);

            // Add to user subscriptions
            userSubs.add(channel);
            this.userSubscriptions.set(ws.userId, userSubs);

            // Store filters on WebSocket
            if (!ws.channelFilters) {
                ws.channelFilters = new Map();
            }
            ws.channelFilters.set(channel, filters);

            logger.info('CHANNEL', 'User subscribed to channel', {
                userId: ws.userId,
                channel,
                subscriberCount: channelSubs.size,
            });

            return {
                success: true,
                channel,
                subscriberCount: channelSubs.size,
            };
        } catch (error) {
            logger.error('CHANNEL', 'Subscription error', {
                error: error.message,
                userId: ws.userId,
                channel,
            });

            return {
                success: false,
                error: 'Subscription failed',
            };
        }
    }

    /**
     * Unsubscribe user from channel
     */
    unsubscribe(ws, channel) {
        try {
            const channelSubs = this.channels.get(channel);
            if (channelSubs) {
                channelSubs.delete(ws);
            }

            const userSubs = this.userSubscriptions.get(ws.userId);
            if (userSubs) {
                userSubs.delete(channel);
                if (userSubs.size === 0) {
                    this.userSubscriptions.delete(ws.userId);
                }
            }

            if (ws.channelFilters) {
                ws.channelFilters.delete(channel);
            }

            logger.info('CHANNEL', 'User unsubscribed from channel', {
                userId: ws.userId,
                channel,
                subscriberCount: channelSubs ? channelSubs.size : 0,
            });

            return {
                success: true,
                channel,
            };
        } catch (error) {
            logger.error('CHANNEL', 'Unsubscription error', {
                error: error.message,
                userId: ws.userId,
                channel,
            });

            return {
                success: false,
                error: 'Unsubscription failed',
            };
        }
    }

    /**
     * Unsubscribe user from all channels
     */
    unsubscribeAll(ws) {
        const userSubs = this.userSubscriptions.get(ws.userId);
        if (!userSubs) return;

        userSubs.forEach(channel => {
            const channelSubs = this.channels.get(channel);
            if (channelSubs) {
                channelSubs.delete(ws);
            }
        });

        this.userSubscriptions.delete(ws.userId);
        if (ws.channelFilters) {
            ws.channelFilters.clear();
        }

        logger.info('CHANNEL', 'User unsubscribed from all channels', {
            userId: ws.userId,
        });
    }

    /**
     * Broadcast message to channel
     */
    broadcast(channel, message, excludeWs = null) {
        const channelSubs = this.channels.get(channel);
        if (!channelSubs || channelSubs.size === 0) {
            return {
                success: true,
                recipientCount: 0,
            };
        }

        let sentCount = 0;
        const messageStr = JSON.stringify(message);

        channelSubs.forEach(ws => {
            // Skip excluded WebSocket
            if (ws === excludeWs) return;

            // Check if connection is open
            if (ws.readyState !== 1) return; // 1 = OPEN

            // Apply filters if present
            if (ws.channelFilters && ws.channelFilters.has(channel)) {
                const filters = ws.channelFilters.get(channel);
                if (!this.matchesFilters(message, filters)) {
                    return;
                }
            }

            try {
                ws.send(messageStr);
                sentCount++;
            } catch (error) {
                logger.error('CHANNEL', 'Failed to send message', {
                    error: error.message,
                    userId: ws.userId,
                    channel,
                });
            }
        });

        logger.logMessage('system', channel, 'broadcast');

        return {
            success: true,
            recipientCount: sentCount,
        };
    }

    /**
     * Send message to specific user
     */
    sendToUser(userId, message) {
        const userSubs = this.userSubscriptions.get(userId);
        if (!userSubs) {
            return {
                success: false,
                error: 'User not subscribed to any channels',
            };
        }

        let sent = false;
        const messageStr = JSON.stringify(message);

        // Find any active WebSocket for this user
        for (const channel of userSubs) {
            const channelSubs = this.channels.get(channel);
            if (!channelSubs) continue;

            for (const ws of channelSubs) {
                if (ws.userId === userId && ws.readyState === 1) {
                    try {
                        ws.send(messageStr);
                        sent = true;
                        break;
                    } catch (error) {
                        logger.error('CHANNEL', 'Failed to send targeted message', {
                            error: error.message,
                            userId,
                        });
                    }
                }
            }

            if (sent) break;
        }

        return {
            success: sent,
            error: sent ? null : 'Failed to send message to user',
        };
    }

    /**
     * Check if message matches filters
     */
    matchesFilters(message, filters) {
        if (!filters || Object.keys(filters).length === 0) {
            return true;
        }

        // Simple filter matching
        for (const [key, value] of Object.entries(filters)) {
            if (message.data && message.data[key] !== value) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get channel statistics
     */
    getChannelStats(channel) {
        const channelSubs = this.channels.get(channel);
        return {
            channel,
            subscriberCount: channelSubs ? channelSubs.size : 0,
            exists: this.channels.has(channel),
        };
    }

    /**
     * Get user subscriptions
     */
    getUserSubscriptions(userId) {
        const userSubs = this.userSubscriptions.get(userId);
        return userSubs ? Array.from(userSubs) : [];
    }

    /**
     * Get all statistics
     */
    getAllStats() {
        const stats = {
            totalChannels: this.channels.size,
            totalSubscribers: this.userSubscriptions.size,
            channels: {},
        };

        this.channels.forEach((subs, channel) => {
            stats.channels[channel] = subs.size;
        });

        return stats;
    }

    /**
     * Cleanup
     */
    cleanup() {
        // Remove empty channels
        this.channels.forEach((subs, channel) => {
            if (subs.size === 0 && !config.channels.allowedChannels.includes(channel)) {
                this.channels.delete(channel);
            }
        });
    }
}

export const channelManager = new ChannelManager();
export default channelManager;
