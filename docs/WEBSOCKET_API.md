# WebSocket API Documentation

## Overview

The My Vidyon WebSocket API provides real-time, bi-directional communication between clients and the server. It supports secure authentication, channel-based messaging, and role-based authorization.

---

## Connection

### Endpoint

```
Development: ws://localhost:8081
Production: wss://your-domain.com/ws
```

### Authentication

WebSocket connections require JWT authentication. Include the token in one of the following ways:

1. **Query Parameter** (Recommended for WebSocket)
```
ws://localhost:8081?token=YOUR_JWT_TOKEN
```

2. **Authorization Header**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

3. **Cookie**
```
Cookie: auth_token=YOUR_JWT_TOKEN
```

### Connection Example

```typescript
import { websocketService } from '@/services/websocket.service';

// Connect
await websocketService.connect();

// Check connection
if (websocketService.isConnected()) {
  console.log('Connected!');
}
```

---

## Message Format

All messages are JSON objects with the following structure:

```typescript
{
  type: string;          // Message type
  channel?: string;      // Channel name (for channel messages)
  data?: any;           // Message payload
  from?: string;        // Sender user ID
  timestamp?: number;   // Unix timestamp
  error?: string;       // Error message (for error responses)
}
```

---

## Message Types

### 1. Subscribe

Subscribe to a channel to receive messages.

**Request:**
```json
{
  "type": "subscribe",
  "channel": "notifications",
  "filters": {
    "userId": "123"
  }
}
```

**Response:**
```json
{
  "type": "subscribed",
  "success": true,
  "channel": "notifications",
  "subscriberCount": 42
}
```

**Example:**
```typescript
const unsubscribe = websocketService.subscribe('notifications', (data) => {
  console.log('Notification:', data);
});

// Later...
unsubscribe();
```

### 2. Unsubscribe

Unsubscribe from a channel.

**Request:**
```json
{
  "type": "unsubscribe",
  "channel": "notifications"
}
```

**Response:**
```json
{
  "type": "unsubscribed",
  "success": true,
  "channel": "notifications"
}
```

### 3. Message

Send a message to a channel.

**Request:**
```json
{
  "type": "message",
  "channel": "messages",
  "data": {
    "text": "Hello, world!",
    "attachments": []
  },
  "targetUserId": "user123"  // Optional: for targeted messages
}
```

**Response:**
```json
{
  "type": "message_sent",
  "success": true,
  "recipientCount": 1
}
```

**Example:**
```typescript
// Send to all subscribers
websocketService.send('messages', {
  text: 'Hello everyone!'
});

// Send to specific user
websocketService.send('messages', {
  text: 'Hello John!'
}, 'user123');
```

### 4. Broadcast

Broadcast a message to all subscribers of a channel (admin/institution only).

**Request:**
```json
{
  "type": "broadcast",
  "channel": "alerts",
  "data": {
    "title": "System Maintenance",
    "message": "Scheduled maintenance at 2 AM"
  }
}
```

**Response:**
```json
{
  "type": "broadcast_sent",
  "success": true,
  "recipientCount": 150
}
```

**Example:**
```typescript
websocketService.broadcast('alerts', {
  title: 'Important Update',
  message: 'Please update your profile'
});
```

### 5. Ping/Pong

Heartbeat mechanism to keep connection alive.

**Request:**
```json
{
  "type": "ping",
  "timestamp": 1705484400000
}
```

**Response:**
```json
{
  "type": "pong",
  "timestamp": 1705484400000
}
```

---

## Channels

### Available Channels

| Channel | Description | Who Can Send | Who Can Subscribe |
|---------|-------------|--------------|-------------------|
| `notifications` | System notifications | Admin, Institution | All |
| `messages` | Direct messages | All | All |
| `updates` | Data updates | Admin, Institution, Faculty | All |
| `alerts` | Important alerts | Admin, Institution | All |
| `analytics` | Analytics data | Admin | Admin |
| `events` | Event notifications | Admin, Institution, Faculty | All |

### Channel Permissions

```typescript
const permissions = {
  admin: ['notifications', 'messages', 'updates', 'alerts', 'analytics', 'events'],
  institution: ['notifications', 'messages', 'updates', 'alerts', 'events'],
  faculty: ['messages', 'updates', 'events'],
  student: ['messages'],
  parent: ['messages'],
};
```

---

## React Integration

### Using the Hook

```typescript
import { useWebSocket } from '@/hooks/useWebSocket';
import { useEffect } from 'react';

function MyComponent() {
  const { isConnected, subscribe, send } = useWebSocket({
    autoConnect: true,
    showToasts: true,
  });

  useEffect(() => {
    // Subscribe to notifications
    const unsubscribe = subscribe('notifications', (data) => {
      console.log('New notification:', data);
      // Update UI
    });

    return unsubscribe;
  }, [subscribe]);

  const sendMessage = () => {
    send('messages', {
      text: 'Hello!',
    });
  };

  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <button onClick={sendMessage}>Send Message</button>
    </div>
  );
}
```

### Manual Connection

```typescript
import { useWebSocket } from '@/hooks/useWebSocket';

function MyComponent() {
  const { isConnected, connect, disconnect } = useWebSocket({
    autoConnect: false,
  });

  return (
    <div>
      {!isConnected ? (
        <button onClick={connect}>Connect</button>
      ) : (
        <button onClick={disconnect}>Disconnect</button>
      )}
    </div>
  );
}
```

---

## Error Handling

### Error Types

1. **Connection Errors**
```json
{
  "type": "error",
  "error": "Connection failed"
}
```

2. **Authentication Errors**
```json
{
  "type": "auth_error",
  "error": "Session expired. Please reconnect."
}
```

3. **Validation Errors**
```json
{
  "type": "error",
  "error": "Message validation failed: Invalid channel"
}
```

4. **Rate Limit Errors**
```json
{
  "type": "error",
  "error": "Message rate limit exceeded",
  "retryAfter": 30000
}
```

### Handling Errors

```typescript
// Listen for auth errors
window.addEventListener('websocket:auth_error', () => {
  // Redirect to login
  window.location.href = '/login';
});

// Listen for max reconnect attempts
window.addEventListener('websocket:max_reconnect', () => {
  // Show error message
  alert('Unable to connect. Please refresh the page.');
});
```

---

## Security

### Rate Limiting

- **Messages**: 100 messages per minute per user
- **Connections**: 10 concurrent connections per user
- **IP Connections**: 50 connections per minute per IP

### Message Size Limits

- Maximum message size: 100KB

### Session Validation

- Sessions are revalidated every 5 minutes
- Expired sessions are automatically disconnected

### Banned Users

Users exceeding rate limits are temporarily banned for 15 minutes.

---

## Monitoring

### Health Check

```bash
curl http://localhost:8081/health
```

**Response:**
```json
{
  "status": "healthy",
  "uptime": 3600,
  "timestamp": "2026-01-17T10:00:00.000Z",
  "connections": 42
}
```

### Statistics

```bash
curl http://localhost:8081/stats
```

**Response:**
```json
{
  "totalChannels": 6,
  "totalSubscribers": 150,
  "channels": {
    "notifications": 120,
    "messages": 80,
    "updates": 100,
    "alerts": 150,
    "analytics": 5,
    "events": 90
  },
  "totalConnections": 150,
  "uptime": 3600
}
```

---

## Best Practices

### 1. Subscribe on Mount, Unsubscribe on Unmount

```typescript
useEffect(() => {
  const unsubscribe = subscribe('notifications', handleNotification);
  return unsubscribe;
}, []);
```

### 2. Handle Reconnection

The service automatically handles reconnection with exponential backoff. No manual intervention needed.

### 3. Validate Data

Always validate incoming data before using it:

```typescript
subscribe('messages', (data) => {
  if (!data || typeof data.text !== 'string') {
    console.error('Invalid message data');
    return;
  }
  
  // Use data
});
```

### 4. Use Filters

Filter messages on the server side to reduce bandwidth:

```typescript
subscribe('notifications', handleNotification, {
  type: 'urgent',
  userId: currentUserId,
});
```

### 5. Cleanup

Always cleanup subscriptions to prevent memory leaks:

```typescript
const unsubscribe = subscribe('channel', handler);

// Later...
unsubscribe();
```

---

## Troubleshooting

### Connection Fails

1. Check authentication token is valid
2. Verify WebSocket server is running
3. Check firewall/proxy settings
4. Ensure correct WebSocket URL

### Messages Not Received

1. Verify subscription is active
2. Check channel permissions
3. Verify message format
4. Check rate limits

### Frequent Disconnections

1. Check network stability
2. Verify token expiration
3. Check server logs for errors
4. Monitor rate limit violations

---

## Examples

### Real-time Notifications

```typescript
function NotificationBell() {
  const [count, setCount] = useState(0);
  const { subscribe } = useWebSocket();

  useEffect(() => {
    return subscribe('notifications', (notification) => {
      setCount(prev => prev + 1);
      toast.info(notification.message);
    });
  }, [subscribe]);

  return <Badge count={count}>🔔</Badge>;
}
```

### Live Chat

```typescript
function ChatRoom({ roomId }) {
  const [messages, setMessages] = useState([]);
  const { subscribe, send } = useWebSocket();

  useEffect(() => {
    return subscribe('messages', (message) => {
      setMessages(prev => [...prev, message]);
    }, { roomId });
  }, [subscribe, roomId]);

  const sendMessage = (text) => {
    send('messages', { text, roomId });
  };

  return (
    <div>
      {messages.map(msg => <div key={msg.id}>{msg.text}</div>)}
      <input onSubmit={sendMessage} />
    </div>
  );
}
```

### Real-time Dashboard

```typescript
function Dashboard() {
  const [stats, setStats] = useState({});
  const { subscribe } = useWebSocket();

  useEffect(() => {
    return subscribe('analytics', (data) => {
      setStats(data);
    });
  }, [subscribe]);

  return <StatsDisplay stats={stats} />;
}
```

---

## Support

For issues or questions:
- Check server logs: `websocket-server/logs/`
- Review security logs for auth/rate limit issues
- Contact backend team

---

**Last Updated**: 2026-01-17  
**Version**: 1.0.0
