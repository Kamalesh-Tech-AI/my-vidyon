/**
 * WebSocket Example Component
 * Demonstrates how to use WebSocket for real-time features
 */

import { useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, MessageSquare, Activity } from 'lucide-react';

export function WebSocketExample() {
    const { isConnected, stats, subscribe, send } = useWebSocket({
        autoConnect: true,
        showToasts: true,
    });

    const [notifications, setNotifications] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);

    // Subscribe to notifications
    useEffect(() => {
        const unsubscribe = subscribe('notifications', (data) => {
            console.log('Notification received:', data);
            setNotifications(prev => [data, ...prev].slice(0, 10));
        });

        return unsubscribe;
    }, [subscribe]);

    // Subscribe to messages
    useEffect(() => {
        const unsubscribe = subscribe('messages', (data) => {
            console.log('Message received:', data);
            setMessages(prev => [data, ...prev].slice(0, 10));
        });

        return unsubscribe;
    }, [subscribe]);

    const sendTestNotification = () => {
        send('notifications', {
            title: 'Test Notification',
            message: 'This is a test notification',
            timestamp: Date.now(),
        });
    };

    const sendTestMessage = () => {
        send('messages', {
            text: 'Hello from WebSocket!',
            timestamp: Date.now(),
        });
    };

    return (
        <div className="space-y-6">
            {/* Connection Status */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        WebSocket Status
                    </CardTitle>
                    <CardDescription>
                        Real-time connection status and statistics
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Connection Status</span>
                        <Badge variant={isConnected ? 'default' : 'destructive'}>
                            {isConnected ? 'Connected' : 'Disconnected'}
                        </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Messages Sent</p>
                            <p className="text-2xl font-bold">{stats.messagesSent}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Messages Received</p>
                            <p className="text-2xl font-bold">{stats.messagesReceived}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Subscriptions</p>
                            <p className="text-2xl font-bold">{stats.subscriptions.length}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Reconnect Attempts</p>
                            <p className="text-2xl font-bold">{stats.reconnectAttempts}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-sm font-medium">Active Subscriptions</p>
                        <div className="flex flex-wrap gap-2">
                            {stats.subscriptions.map(channel => (
                                <Badge key={channel} variant="outline">
                                    {channel}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Test Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Test WebSocket</CardTitle>
                    <CardDescription>
                        Send test messages to verify WebSocket functionality
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Button onClick={sendTestNotification} className="w-full">
                        <Bell className="mr-2 h-4 w-4" />
                        Send Test Notification
                    </Button>
                    <Button onClick={sendTestMessage} variant="outline" className="w-full">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Send Test Message
                    </Button>
                </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Recent Notifications
                    </CardTitle>
                    <CardDescription>
                        Last 10 notifications received via WebSocket
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {notifications.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No notifications yet
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {notifications.map((notification, index) => (
                                <div
                                    key={index}
                                    className="p-3 border rounded-lg bg-muted/50"
                                >
                                    <p className="font-medium">{notification.title}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {notification.message}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {new Date(notification.timestamp).toLocaleTimeString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Messages */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Recent Messages
                    </CardTitle>
                    <CardDescription>
                        Last 10 messages received via WebSocket
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {messages.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No messages yet
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {messages.map((message, index) => (
                                <div
                                    key={index}
                                    className="p-3 border rounded-lg"
                                >
                                    <p className="text-sm">{message.text}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {new Date(message.timestamp).toLocaleTimeString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default WebSocketExample;
