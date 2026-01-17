# My Vidyon - Educational Management Platform

A comprehensive educational management platform with real-time WebSocket capabilities.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or bun package manager

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd my-vidyon

# Install dependencies (includes WebSocket server)
npm install

# Start development server
npm run dev
```

### Running with WebSocket

```bash
# Terminal 1: Start frontend
npm run dev

# Terminal 2: Start WebSocket server
npm run ws:dev

# Or start both together
npm run dev:all
```

## 📚 Project Structure

```
my-vidyon/
├── src/                          # Frontend source code
│   ├── components/               # React components
│   ├── hooks/                    # Custom React hooks
│   │   └── useWebSocket.ts      # WebSocket hook
│   ├── services/                 # Services
│   │   └── websocket.service.ts # WebSocket client
│   ├── types/                    # TypeScript types
│   └── ...
├── websocket-server/             # WebSocket server
│   ├── server.js                 # Main server
│   ├── auth.middleware.js        # Authentication
│   ├── rate-limiter.js           # Rate limiting
│   ├── message-validator.js      # Validation
│   ├── channel-manager.js        # Channel management
│   └── ...
├── docs/                         # Documentation
│   ├── WEBSOCKET_API.md          # API docs
│   ├── SECURITY_POLICY.md        # Security guidelines
│   ├── DEPLOYMENT_CHECKLIST.md   # Deployment guide
│   └── ARCHITECTURE_DIAGRAM.md   # System architecture
└── ...
```

## 🔌 WebSocket Features

### Real-Time Capabilities

- ✅ **Secure WebSocket Connections** (WSS)
- ✅ **JWT Authentication**
- ✅ **Automatic Reconnection**
- ✅ **Heartbeat Mechanism**
- ✅ **Channel-Based Messaging**
- ✅ **Broadcast & Targeted Messages**
- ✅ **Rate Limiting**
- ✅ **Message Validation**

### Available Channels

- `notifications` - System notifications
- `messages` - Direct messages
- `updates` - Data updates
- `alerts` - Important alerts
- `analytics` - Analytics data (admin only)
- `events` - Event notifications

### Usage Example

```typescript
import { useWebSocket } from '@/hooks/useWebSocket';

function MyComponent() {
  const { isConnected, subscribe, send } = useWebSocket();

  useEffect(() => {
    // Subscribe to notifications
    const unsubscribe = subscribe('notifications', (data) => {
      console.log('Notification:', data);
    });

    return unsubscribe;
  }, [subscribe]);

  const sendMessage = () => {
    send('messages', { text: 'Hello!' });
  };

  return <div>Connected: {isConnected ? 'Yes' : 'No'}</div>;
}
```

## 🔐 Security Features

### Transport Security
- TLS 1.2+ encryption
- HSTS enabled
- Strong cipher suites only

### Authentication & Authorization
- JWT token validation
- Session revalidation (every 5 minutes)
- Role-based access control (RBAC)

### Attack Prevention
- XSS protection
- SQL injection prevention
- CSRF protection
- DDoS protection
- Rate limiting (100 msg/min per user)
- Auto-ban for violations

### Logging & Monitoring
- Security event logging
- Sensitive data masking
- Real-time alerts
- Health check endpoint

## 🛠️ Technologies

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Supabase** - Backend & Auth

### Backend
- **Node.js** - Runtime
- **WebSocket (ws)** - Real-time communication
- **Express** - HTTP server
- **JWT** - Authentication
- **Joi** - Validation
- **Helmet** - Security headers

## 📖 Documentation

- **[WebSocket API](docs/WEBSOCKET_API.md)** - Complete API documentation
- **[Security Policy](docs/SECURITY_POLICY.md)** - Security guidelines
- **[Deployment Guide](docs/DEPLOYMENT_CHECKLIST.md)** - Production deployment
- **[Architecture](docs/ARCHITECTURE_DIAGRAM.md)** - System architecture
- **[Implementation Summary](WEBSOCKET_IMPLEMENTATION_COMPLETE.md)** - Feature overview

## 🚀 Deployment

### Development

```bash
npm run dev          # Start frontend
npm run ws:dev       # Start WebSocket server
```

### Production

```bash
npm run build        # Build frontend
npm run ws:start     # Start WebSocket server (production)
```

See [Deployment Checklist](docs/DEPLOYMENT_CHECKLIST.md) for complete guide.

## 📊 Scripts

```bash
# Frontend
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Run ESLint

# WebSocket Server
npm run ws:install       # Install WebSocket dependencies
npm run ws:dev           # Start WebSocket server (dev)
npm run ws:start         # Start WebSocket server (prod)
npm run ws:test          # Run WebSocket tests

# Combined
npm run dev:all          # Start both frontend and WebSocket
```

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# WebSocket Server (optional)
WS_PORT=8081
WS_HOST=0.0.0.0
LOG_LEVEL=info
```

## 🧪 Testing

```bash
# Run tests
npm test

# WebSocket tests
npm run ws:test
```

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please read the documentation before submitting PRs.

## 📞 Support

For issues or questions:
- Check the [documentation](docs/)
- Review [WebSocket API](docs/WEBSOCKET_API.md)
- Contact the development team

---

**Version:** 1.0.0  
**Last Updated:** 2026-01-17  
**Status:** Production Ready ✅
