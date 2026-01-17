# WebSocket Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MY VIDYON PLATFORM                                  │
│                      WebSocket Real-Time Architecture                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                   │
│  │   React      │   │   React      │   │   React      │                   │
│  │  Component   │   │  Component   │   │  Component   │                   │
│  │              │   │              │   │              │                   │
│  │  - Student   │   │  - Faculty   │   │  - Admin     │                   │
│  │  - Parent    │   │  - Inst.     │   │  Dashboard   │                   │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘                   │
│         │                  │                  │                            │
│         └──────────────────┼──────────────────┘                            │
│                            │                                                │
│                    ┌───────▼────────┐                                       │
│                    │  useWebSocket  │  ◄─── React Hook                     │
│                    │     Hook       │                                       │
│                    └───────┬────────┘                                       │
│                            │                                                │
│                    ┌───────▼────────┐                                       │
│                    │   WebSocket    │  ◄─── Service Layer                  │
│                    │    Service     │                                       │
│                    │                │                                       │
│                    │  - Auto Connect│                                       │
│                    │  - Reconnect   │                                       │
│                    │  - Queue Msgs  │                                       │
│                    └───────┬────────┘                                       │
│                            │                                                │
└────────────────────────────┼────────────────────────────────────────────────┘
                             │
                             │ WSS:// (Secure WebSocket)
                             │ + JWT Token
                             │
┌────────────────────────────▼────────────────────────────────────────────────┐
│                         SECURITY LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                      Reverse Proxy (Nginx)                          │    │
│  │                                                                      │    │
│  │  ✓ SSL/TLS Termination (TLS 1.2+)                                  │    │
│  │  ✓ HSTS Headers                                                     │    │
│  │  ✓ CSP Headers                                                      │    │
│  │  ✓ WebSocket Upgrade                                                │    │
│  │  ✓ Load Balancing                                                   │    │
│  └────────────────────────┬───────────────────────────────────────────┘    │
│                           │                                                  │
└───────────────────────────┼──────────────────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────────────────┐
│                      WEBSOCKET SERVER LAYER                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Connection Handler                                │   │
│  │                                                                       │   │
│  │  1. Verify Client ──► Auth Middleware ──► JWT Validation            │   │
│  │                           │                                           │   │
│  │                           ▼                                           │   │
│  │                    Rate Limiter ──► Check Limits                     │   │
│  │                           │                                           │   │
│  │                           ▼                                           │   │
│  │                    Accept/Reject Connection                          │   │
│  └─────────────────────────┬─────────────────────────────────────────────┘   │
│                            │                                                  │
│  ┌─────────────────────────▼─────────────────────────────────────────────┐   │
│  │                    Message Handler                                    │   │
│  │                                                                       │   │
│  │  Incoming Message ──► Message Validator ──► Schema Check            │   │
│  │                           │                                           │   │
│  │                           ▼                                           │   │
│  │                    Security Scanner ──► XSS/SQL Detection            │   │
│  │                           │                                           │   │
│  │                           ▼                                           │   │
│  │                    Sanitize Data                                     │   │
│  │                           │                                           │   │
│  │                           ▼                                           │   │
│  │                    Authorization Check ──► RBAC                      │   │
│  │                           │                                           │   │
│  │                           ▼                                           │   │
│  │                    Process Message                                   │   │
│  └─────────────────────────┬─────────────────────────────────────────────┘   │
│                            │                                                  │
│  ┌─────────────────────────▼─────────────────────────────────────────────┐   │
│  │                    Channel Manager                                    │   │
│  │                                                                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │   │
│  │  │notifications│  │  messages   │  │   updates   │  ...            │   │
│  │  │             │  │             │  │             │                  │   │
│  │  │ • User 1    │  │ • User 3    │  │ • User 1    │                 │   │
│  │  │ • User 2    │  │ • User 4    │  │ • User 5    │                 │   │
│  │  │ • User 5    │  │             │  │             │                  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                 │   │
│  │                                                                       │   │
│  │  Actions:                                                            │   │
│  │  • Subscribe/Unsubscribe                                            │   │
│  │  • Broadcast to Channel                                             │   │
│  │  • Send to Specific User                                            │   │
│  │  • Apply Filters                                                    │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │                    Heartbeat Manager                                  │   │
│  │                                                                       │   │
│  │  Every 30 seconds:                                                   │   │
│  │  • Send PING to all clients                                          │   │
│  │  • Check for PONG responses                                          │   │
│  │  • Terminate dead connections                                        │   │
│  │  • Check idle timeouts (5 min)                                       │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │                    Security Logger                                    │   │
│  │                                                                       │   │
│  │  Logs:                                                               │   │
│  │  • Connections/Disconnections                                        │   │
│  │  • Authentication Events                                             │   │
│  │  • Rate Limit Violations                                             │   │
│  │  • Suspicious Activity                                               │   │
│  │  • Validation Failures                                               │   │
│  │                                                                       │   │
│  │  Features:                                                           │   │
│  │  • Sensitive Data Masking                                            │   │
│  │  • Structured JSON Logs                                              │   │
│  │  • Real-time Alerts                                                  │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │
┌───────────────────────────────────▼───────────────────────────────────────────┐
│                          PERSISTENCE LAYER                                     │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                         Supabase                                        │  │
│  │                                                                         │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │  │
│  │  │   Auth       │  │   Database   │  │   Storage    │                │  │
│  │  │              │  │              │  │              │                │  │
│  │  │ • Users      │  │ • Profiles   │  │ • Files      │                │  │
│  │  │ • Sessions   │  │ • Messages   │  │ • Assets     │                │  │
│  │  │ • Tokens     │  │ • Logs       │  │              │                │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │  │
│  │                                                                         │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════════
                              MESSAGE FLOW DIAGRAM
═══════════════════════════════════════════════════════════════════════════════

┌──────────┐                                                        ┌──────────┐
│ Client A │                                                        │ Client B │
└────┬─────┘                                                        └────┬─────┘
     │                                                                   │
     │ 1. Subscribe to "notifications"                                  │
     ├──────────────────────────────────────────┐                       │
     │                                          │                       │
     │                                    ┌─────▼──────┐                │
     │                                    │  Channel   │                │
     │                                    │  Manager   │                │
     │                                    └─────┬──────┘                │
     │                                          │                       │
     │ 2. Subscribed confirmation               │                       │
     │◄─────────────────────────────────────────┤                       │
     │                                          │                       │
     │                                          │ 3. Subscribe to       │
     │                                          │    "notifications"    │
     │                                          │◄──────────────────────┤
     │                                          │                       │
     │                                          │ 4. Subscribed         │
     │                                          ├──────────────────────►│
     │                                          │                       │
     │ 5. Send notification                     │                       │
     ├──────────────────────────────────────────►                       │
     │                                          │                       │
     │                                    ┌─────▼──────┐                │
     │                                    │  Validate  │                │
     │                                    │  Authorize │                │
     │                                    └─────┬──────┘                │
     │                                          │                       │
     │                                    ┌─────▼──────┐                │
     │                                    │ Broadcast  │                │
     │                                    │ to Channel │                │
     │                                    └─────┬──────┘                │
     │                                          │                       │
     │ 6. Notification received                 │                       │
     │◄─────────────────────────────────────────┤                       │
     │                                          │                       │
     │                                          │ 7. Notification       │
     │                                          │    received           │
     │                                          ├──────────────────────►│
     │                                          │                       │
     ▼                                          ▼                       ▼


═══════════════════════════════════════════════════════════════════════════════
                           SECURITY CONTROLS DIAGRAM
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY LAYERS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Layer 1: Transport Security                                                │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ • TLS 1.2+ Encryption                                               │    │
│  │ • Strong Cipher Suites Only                                         │    │
│  │ • HSTS Enabled                                                      │    │
│  │ • Certificate Validation                                            │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Layer 2: Authentication                                                    │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ • JWT Token Validation                                              │    │
│  │ • Session Revalidation (5 min)                                      │    │
│  │ • Token Expiration Check                                            │    │
│  │ • Secure Cookie Attributes                                          │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Layer 3: Authorization                                                     │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ • Role-Based Access Control (RBAC)                                  │    │
│  │ • Channel Permissions                                               │    │
│  │ • Server-Side Validation                                            │    │
│  │ • Action Authorization                                              │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Layer 4: Input Validation                                                  │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ • Schema Validation (Joi)                                           │    │
│  │ • XSS Pattern Detection                                             │    │
│  │ • SQL Injection Detection                                           │    │
│  │ • Data Sanitization                                                 │    │
│  │ • Message Size Limits                                               │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Layer 5: Rate Limiting                                                     │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ • Per-User Message Limits                                           │    │
│  │ • Per-User Connection Limits                                        │    │
│  │ • Per-IP Connection Limits                                          │    │
│  │ • Auto-Ban Mechanism                                                │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Layer 6: Monitoring & Logging                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ • Security Event Logging                                            │    │
│  │ • Sensitive Data Masking                                            │    │
│  │ • Real-time Alerts                                                  │    │
│  │ • Audit Trail                                                       │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Components

### Client Side
- **React Components**: UI components that need real-time updates
- **useWebSocket Hook**: Easy-to-use React hook for WebSocket functionality
- **WebSocket Service**: Core service handling connection, reconnection, and messaging

### Server Side
- **Connection Handler**: Manages WebSocket connections with authentication
- **Auth Middleware**: Validates JWT tokens and manages sessions
- **Rate Limiter**: Prevents abuse with message and connection limits
- **Message Validator**: Validates and sanitizes all incoming messages
- **Channel Manager**: Manages subscriptions and message routing
- **Security Logger**: Logs all security events with data masking

### Security
- **6 Layers of Security**: Transport, Auth, Authorization, Validation, Rate Limiting, Monitoring
- **Defense in Depth**: Multiple security controls at each layer
- **Zero Trust**: Every message and action is validated

## Data Flow

1. **Client connects** → Auth validation → Rate limit check → Connection accepted
2. **Client subscribes** → Channel validation → Permission check → Subscription confirmed
3. **Client sends message** → Validation → Sanitization → Authorization → Routing
4. **Server broadcasts** → Channel lookup → Filter application → Delivery to subscribers
5. **Heartbeat** → Ping every 30s → Pong response → Connection health check

## Security Flow

1. **Connection**: TLS encryption + JWT validation
2. **Message**: Schema validation + XSS/SQL detection + Sanitization
3. **Authorization**: RBAC check + Channel permissions
4. **Rate Limiting**: User limits + IP limits + Auto-ban
5. **Logging**: Event logging + Data masking + Alerts
