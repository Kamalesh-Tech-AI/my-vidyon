/**
 * useWebSocket Hook
 * React hook for WebSocket functionality
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { websocketService } from '@/services/websocket.service';
import type { WebSocketChannel, WebSocketEventHandler, WebSocketStats } from '@/types/websocket.types';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface UseWebSocketOptions {
    autoConnect?: boolean;
    showToasts?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
    const { autoConnect = true, showToasts = false } = options;
    const { isAuthenticated } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [stats, setStats] = useState<WebSocketStats>(websocketService.getStats());
    const connectAttempted = useRef(false);

    /**
     * Connect to WebSocket
     */
    const connect = useCallback(async () => {
        if (!isAuthenticated) {
            console.warn('Cannot connect to WebSocket: Not authenticated');
            return;
        }

        try {
            await websocketService.connect();
            setIsConnected(true);
            setStats(websocketService.getStats());

            if (showToasts) {
                toast.success('Connected to real-time updates');
            }
        } catch (error: any) {
            console.error('WebSocket connection failed:', error);
            setIsConnected(false);

            if (showToasts) {
                toast.error('Failed to connect to real-time updates');
            }
        }
    }, [isAuthenticated, showToasts]);

    /**
     * Disconnect from WebSocket
     */
    const disconnect = useCallback(() => {
        websocketService.disconnect();
        setIsConnected(false);
        setStats(websocketService.getStats());

        if (showToasts) {
            toast.info('Disconnected from real-time updates');
        }
    }, [showToasts]);

    /**
     * Subscribe to channel
     */
    const subscribe = useCallback((
        channel: WebSocketChannel,
        callback: WebSocketEventHandler,
        filters?: Record<string, any>
    ) => {
        const unsubscribe = websocketService.subscribe(channel, callback, filters);
        setStats(websocketService.getStats());
        return unsubscribe;
    }, []);

    /**
     * Unsubscribe from channel
     */
    const unsubscribe = useCallback((channel: WebSocketChannel) => {
        websocketService.unsubscribe(channel);
        setStats(websocketService.getStats());
    }, []);

    /**
     * Send message to channel
     */
    const send = useCallback((
        channel: WebSocketChannel,
        data: any,
        targetUserId?: string
    ) => {
        websocketService.send(channel, data, targetUserId);
        setStats(websocketService.getStats());
    }, []);

    /**
     * Broadcast message
     */
    const broadcast = useCallback((channel: WebSocketChannel, data: any) => {
        websocketService.broadcast(channel, data);
        setStats(websocketService.getStats());
    }, []);

    /**
     * Auto-connect on mount
     */
    useEffect(() => {
        if (autoConnect && isAuthenticated && !connectAttempted.current) {
            connectAttempted.current = true;
            connect();
        }

        return () => {
            // Don't disconnect on unmount to maintain connection across components
        };
    }, [autoConnect, isAuthenticated, connect]);

    /**
     * Handle auth errors
     */
    useEffect(() => {
        const handleAuthError = () => {
            setIsConnected(false);
            if (showToasts) {
                toast.error('Session expired. Please login again.');
            }
        };

        window.addEventListener('websocket:auth_error', handleAuthError);

        return () => {
            window.removeEventListener('websocket:auth_error', handleAuthError);
        };
    }, [showToasts]);

    /**
     * Handle max reconnect attempts
     */
    useEffect(() => {
        const handleMaxReconnect = () => {
            setIsConnected(false);
            if (showToasts) {
                toast.error('Unable to connect to real-time updates. Please refresh the page.');
            }
        };

        window.addEventListener('websocket:max_reconnect', handleMaxReconnect);

        return () => {
            window.removeEventListener('websocket:max_reconnect', handleMaxReconnect);
        };
    }, [showToasts]);

    /**
     * Update connection status periodically
     */
    useEffect(() => {
        const interval = setInterval(() => {
            const connected = websocketService.isConnected();
            if (connected !== isConnected) {
                setIsConnected(connected);
            }
            setStats(websocketService.getStats());
        }, 1000);

        return () => clearInterval(interval);
    }, [isConnected]);

    return {
        isConnected,
        stats,
        connect,
        disconnect,
        subscribe,
        unsubscribe,
        send,
        broadcast,
    };
}

export default useWebSocket;
