/**
 * WebSocket Service
 * Client-side WebSocket service with automatic reconnection and security
 */

import { supabase } from '@/lib/supabase';
import type {
    WebSocketConfig,
    WebSocketMessage,
    WebSocketChannel,
    WebSocketEventHandler,
    WebSocketStats,
    WebSocketServiceInterface,
} from '@/types/websocket.types';

class WebSocketService implements WebSocketServiceInterface {
    private ws: WebSocket | null = null;
    private config: Required<WebSocketConfig>;
    private subscriptions: Map<WebSocketChannel, Set<WebSocketEventHandler>> = new Map();
    private reconnectAttempts: number = 0;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private heartbeatTimer: NodeJS.Timeout | null = null;
    private stats: WebSocketStats = {
        connected: false,
        reconnectAttempts: 0,
        lastConnected: null,
        lastDisconnected: null,
        messagesSent: 0,
        messagesReceived: 0,
        subscriptions: [],
    };
    private messageQueue: WebSocketMessage[] = [];
    private isReconnecting: boolean = false;

    constructor(config: WebSocketConfig) {
        this.config = {
            reconnect: true,
            reconnectInterval: 1000,
            reconnectBackoff: 1.5,
            maxReconnectAttempts: 5,
            heartbeatInterval: 30000,
            debug: false,
            ...config,
        };
    }

    /**
     * Connect to WebSocket server
     */
    async connect(): Promise<void> {
        try {
            // Get auth token
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                throw new Error('No active session. Please login first.');
            }

            const token = session.access_token;

            // Construct WebSocket URL with token
            const wsUrl = `${this.config.url}?token=${encodeURIComponent(token)}`;

            this.log('Connecting to WebSocket server...');

            // Create WebSocket connection
            this.ws = new WebSocket(wsUrl);

            // Setup event handlers
            this.ws.onopen = this.handleOpen.bind(this);
            this.ws.onmessage = this.handleMessage.bind(this);
            this.ws.onclose = this.handleClose.bind(this);
            this.ws.onerror = this.handleError.bind(this);

            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, 10000);

                this.ws!.addEventListener('open', () => {
                    clearTimeout(timeout);
                    resolve();
                }, { once: true });

                this.ws!.addEventListener('error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                }, { once: true });
            });
        } catch (error) {
            this.log('Connection error:', error);
            throw error;
        }
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect(): void {
        this.log('Disconnecting...');

        // Clear timers
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }

        // Close WebSocket
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }

        this.stats.connected = false;
        this.stats.lastDisconnected = Date.now();
    }

    /**
     * Subscribe to channel
     */
    subscribe(
        channel: WebSocketChannel,
        callback: WebSocketEventHandler,
        filters?: Record<string, any>
    ): () => void {
        // Add to local subscriptions
        if (!this.subscriptions.has(channel)) {
            this.subscriptions.set(channel, new Set());
        }

        this.subscriptions.get(channel)!.add(callback);

        // Send subscribe message to server
        if (this.isConnected()) {
            this.sendMessage({
                type: 'subscribe',
                channel,
                ...(filters && { filters }),
            });
        } else {
            // Queue for when connected
            this.messageQueue.push({
                type: 'subscribe',
                channel,
                ...(filters && { filters }),
            });
        }

        this.updateSubscriptionStats();

        // Return unsubscribe function
        return () => this.unsubscribe(channel);
    }

    /**
     * Unsubscribe from channel
     */
    unsubscribe(channel: WebSocketChannel): void {
        this.subscriptions.delete(channel);

        if (this.isConnected()) {
            this.sendMessage({
                type: 'unsubscribe',
                channel,
            });
        }

        this.updateSubscriptionStats();
    }

    /**
     * Send message to channel
     */
    send(channel: WebSocketChannel, data: any, targetUserId?: string): void {
        const message: WebSocketMessage = {
            type: 'message',
            channel,
            data,
            ...(targetUserId && { targetUserId }),
        };

        this.sendMessage(message);
    }

    /**
     * Broadcast message to channel
     */
    broadcast(channel: WebSocketChannel, data: any): void {
        this.sendMessage({
            type: 'broadcast',
            channel,
            data,
        });
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    /**
     * Get statistics
     */
    getStats(): WebSocketStats {
        return { ...this.stats };
    }

    /**
     * Handle WebSocket open
     */
    private handleOpen(): void {
        this.log('Connected to WebSocket server');

        this.stats.connected = true;
        this.stats.lastConnected = Date.now();
        this.reconnectAttempts = 0;
        this.stats.reconnectAttempts = 0;
        this.isReconnecting = false;

        // Start heartbeat
        this.startHeartbeat();

        // Process queued messages
        this.processMessageQueue();

        // Resubscribe to channels
        this.resubscribeChannels();
    }

    /**
     * Handle incoming message
     */
    private handleMessage(event: MessageEvent): void {
        try {
            const message: WebSocketMessage = JSON.parse(event.data);

            this.log('Received message:', message);
            this.stats.messagesReceived++;

            // Handle different message types
            switch (message.type) {
                case 'connected':
                    this.log('Connection confirmed by server');
                    break;

                case 'message':
                case 'broadcast':
                    this.handleChannelMessage(message);
                    break;

                case 'pong':
                    // Heartbeat response
                    break;

                case 'error':
                    console.error('WebSocket error:', message.error);
                    break;

                case 'auth_error':
                    console.error('Authentication error:', message.error);
                    this.disconnect();
                    // Trigger re-authentication
                    window.dispatchEvent(new CustomEvent('websocket:auth_error'));
                    break;

                default:
                    this.log('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
        }
    }

    /**
     * Handle channel message
     */
    private handleChannelMessage(message: WebSocketMessage): void {
        if (!message.channel) return;

        const handlers = this.subscriptions.get(message.channel);
        if (!handlers) return;

        handlers.forEach(handler => {
            try {
                handler(message.data);
            } catch (error) {
                console.error('Error in message handler:', error);
            }
        });
    }

    /**
     * Handle WebSocket close
     */
    private handleClose(event: CloseEvent): void {
        this.log('WebSocket closed:', event.code, event.reason);

        this.stats.connected = false;
        this.stats.lastDisconnected = Date.now();

        // Stop heartbeat
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }

        // Attempt reconnection
        if (this.config.reconnect && !this.isReconnecting) {
            this.attemptReconnect();
        }
    }

    /**
     * Handle WebSocket error
     */
    private handleError(event: Event): void {
        console.error('WebSocket error:', event);
    }

    /**
     * Attempt to reconnect
     */
    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
            this.log('Max reconnection attempts reached');
            window.dispatchEvent(new CustomEvent('websocket:max_reconnect'));
            return;
        }

        this.isReconnecting = true;
        this.reconnectAttempts++;
        this.stats.reconnectAttempts = this.reconnectAttempts;

        const delay = this.config.reconnectInterval *
            Math.pow(this.config.reconnectBackoff, this.reconnectAttempts - 1);

        this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

        this.reconnectTimer = setTimeout(() => {
            this.connect().catch(error => {
                this.log('Reconnection failed:', error);
                this.isReconnecting = false;
                this.attemptReconnect();
            });
        }, delay);
    }

    /**
     * Start heartbeat
     */
    private startHeartbeat(): void {
        this.heartbeatTimer = setInterval(() => {
            if (this.isConnected()) {
                this.sendMessage({
                    type: 'ping',
                    timestamp: Date.now(),
                });
            }
        }, this.config.heartbeatInterval);
    }

    /**
     * Send message to server
     */
    private sendMessage(message: WebSocketMessage): void {
        if (!this.isConnected()) {
            this.log('Not connected, queueing message');
            this.messageQueue.push(message);
            return;
        }

        try {
            this.ws!.send(JSON.stringify(message));
            this.stats.messagesSent++;
            this.log('Sent message:', message);
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    }

    /**
     * Process queued messages
     */
    private processMessageQueue(): void {
        while (this.messageQueue.length > 0 && this.isConnected()) {
            const message = this.messageQueue.shift()!;
            this.sendMessage(message);
        }
    }

    /**
     * Resubscribe to channels after reconnection
     */
    private resubscribeChannels(): void {
        this.subscriptions.forEach((handlers, channel) => {
            this.sendMessage({
                type: 'subscribe',
                channel,
            });
        });
    }

    /**
     * Update subscription stats
     */
    private updateSubscriptionStats(): void {
        this.stats.subscriptions = Array.from(this.subscriptions.keys());
    }

    /**
     * Log message (if debug enabled)
     */
    private log(...args: any[]): void {
        if (this.config.debug) {
            console.log('[WebSocket]', ...args);
        }
    }
}

// Create singleton instance
const wsUrl = import.meta.env.DEV
    ? 'ws://localhost:8081'
    : 'wss://your-domain.com/ws'; // Change in production

export const websocketService = new WebSocketService({
    url: wsUrl,
    debug: import.meta.env.DEV,
});

export default websocketService;
