/**
 * WebSocket Types
 * TypeScript definitions for WebSocket communication
 */

export type WebSocketMessageType =
    | 'connected'
    | 'subscribe'
    | 'subscribed'
    | 'unsubscribe'
    | 'unsubscribed'
    | 'message'
    | 'message_sent'
    | 'broadcast'
    | 'broadcast_sent'
    | 'ping'
    | 'pong'
    | 'error'
    | 'auth_error';

export type WebSocketChannel =
    | 'notifications'
    | 'messages'
    | 'updates'
    | 'alerts'
    | 'analytics'
    | 'events';

export interface WebSocketMessage<T = any> {
    type: WebSocketMessageType;
    channel?: WebSocketChannel;
    data?: T;
    from?: string;
    timestamp?: number;
    error?: string;
    success?: boolean;
    recipientCount?: number;
    subscriberCount?: number;
}

export interface WebSocketConfig {
    url: string;
    reconnect?: boolean;
    reconnectInterval?: number;
    reconnectBackoff?: number;
    maxReconnectAttempts?: number;
    heartbeatInterval?: number;
    debug?: boolean;
}

export interface WebSocketSubscription {
    channel: WebSocketChannel;
    callback: (data: any) => void;
    filters?: Record<string, any>;
}

export interface WebSocketStats {
    connected: boolean;
    reconnectAttempts: number;
    lastConnected: number | null;
    lastDisconnected: number | null;
    messagesSent: number;
    messagesReceived: number;
    subscriptions: string[];
}

export type WebSocketEventHandler = (data: any) => void;

export interface WebSocketServiceInterface {
    connect(): Promise<void>;
    disconnect(): void;
    subscribe(channel: WebSocketChannel, callback: WebSocketEventHandler, filters?: Record<string, any>): () => void;
    unsubscribe(channel: WebSocketChannel): void;
    send(channel: WebSocketChannel, data: any, targetUserId?: string): void;
    broadcast(channel: WebSocketChannel, data: any): void;
    isConnected(): boolean;
    getStats(): WebSocketStats;
}
