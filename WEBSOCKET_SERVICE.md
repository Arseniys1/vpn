# WebSocket Notification Service

This service provides real-time notifications to frontend users via WebSocket connections, with messages delivered through RabbitMQ. The service is designed to work in a Swarm cluster with multiple replicas.

## Architecture

```
┌─────────────┐    ┌──────────────┐    ┌────────────────┐    ┌──────────────┐
│   Backend   │───▶│  RabbitMQ    │───▶│ WebSocket      │───▶│   Frontend   │
│   Services  │    │  (Queue)     │    │  Service       │    │   (React)    │
└─────────────┘    └──────────────┘    └────────────────┘    └──────────────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │   Clients    │
                                   │ (WebSocket   │
                                   │  Connections)│
                                   └──────────────┘
```

## How It Works

1. Backend services publish notification tasks to RabbitMQ with the type `websocket_notification`
2. The WebSocket service consumes these tasks from the `websocket_notifications` queue
3. Messages are routed to specific users or broadcast to all connected clients
4. Frontend clients connect via WebSocket and receive real-time notifications

## Publishing Notifications

### To a Specific User

```go
// In your service
err := queue.PublishWebSocketNotification(
    userID,           // Target user ID
    "welcome",        // Message type
    map[string]interface{}{
        "message": "Welcome to our service!",
        "user_id": userID.String(),
    }
)
```

### To All Users (Broadcast)

```go
// In your service
err := queue.PublishWebSocketBroadcast(
    "announcement",   // Message type
    map[string]interface{}{
        "message": "System maintenance scheduled",
        "severity": "info",
    }
)
```

## Frontend Integration

### Connecting to WebSocket

```typescript
import webSocketService from './services/websocketService';

// Connect with user ID
webSocketService.connect(userId);

// Subscribe to message types
webSocketService.subscribe('welcome', (data) => {
  console.log('Welcome message:', data);
});

webSocketService.subscribe('balance_update', (data) => {
  console.log('Balance updated:', data);
});
```

### Handling Reconnections

The WebSocket service automatically handles reconnections with exponential backoff:
- Max reconnect attempts: 5
- Initial delay: 1 second
- Exponential backoff factor: 2

## Docker Swarm Deployment

The WebSocket service is configured in `docker-compose.swarm.yml` with:
- 3 replicas by default (configurable with `WEBSOCKET_REPLICAS`)
- Automatic load balancing via Traefik
- Health checks
- Resource limits

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `WEBSOCKET_REPLICAS` | Number of service replicas | `3` |
| `SERVER_PORT` | WebSocket server port | `8081` |

## Message Format

Messages sent over WebSocket follow this format:

```json
{
  "type": "message_type",
  "user_id": "optional_user_id",
  "timestamp": "ISO_timestamp",
  "data": {
    // Custom message data
  }
}
```

## Supported Message Types

1. `welcome` - Sent when user logs in
2. `balance_update` - Sent when user balance changes
3. `notification` - General purpose notifications

Additional message types can be added as needed.

## Scaling Considerations

- The service uses in-memory storage for active connections
- In a multi-replica setup, messages are delivered to clients connected to that specific replica
- For broadcast messages, you need to publish to all replicas or use a shared messaging system