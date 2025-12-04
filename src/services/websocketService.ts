// WebSocket Service for handling real-time notifications
class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // 1 second
  private userId: string | null = null;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();
  private isConnected = false;

  // Connect to WebSocket server
  connect(userId: string) {
    if (this.socket && this.userId === userId && this.isConnected) {
      console.log('WebSocket already connected for user:', userId);
      return;
    }

    this.userId = userId;
    const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8081';
    
    try {
      // Close existing connection if any
      this.disconnect();
      
      // Create new WebSocket connection
      this.socket = new WebSocket(`${WS_BASE_URL}/ws?user_id=${userId}`);
      
      this.socket.onopen = () => {
        console.log('WebSocket connected for user:', userId);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected', { userId });
      };
      
      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket message received:', message);
          this.emit(message.type, message.data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.socket.onclose = (event) => {
        console.log('WebSocket disconnected for user:', userId, 'Code:', event.code);
        this.isConnected = false;
        this.emit('disconnected', { userId, code: event.code });
        
        // Attempt to reconnect if not manually disconnected
        if (event.code !== 1000) { // 1000 = Normal closure
          this.attemptReconnect();
        }
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error for user:', userId, error);
        this.emit('error', { userId, error });
      };
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
      this.attemptReconnect();
    }
  }

  // Disconnect from WebSocket server
  disconnect() {
    if (this.socket) {
      this.socket.close(1000, 'Manual disconnect');
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Attempt to reconnect with exponential backoff
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max WebSocket reconnection attempts reached');
      this.emit('reconnect_failed', { userId: this.userId });
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      if (this.userId) {
        this.connect(this.userId);
      }
    }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)); // Exponential backoff
  }

  // Subscribe to message types
  subscribe(type: string, callback: (data: any) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)?.push(callback);
  }

  // Unsubscribe from message types
  unsubscribe(type: string, callback: (data: any) => void) {
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Emit events to subscribers
  private emit(type: string, data: any) {
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in WebSocket listener:', error);
        }
      });
    }
  }

  // Check if connected
  isConnectedStatus(): boolean {
    return this.isConnected;
  }
}

// Export singleton instance
const webSocketService = new WebSocketService();
export default webSocketService;