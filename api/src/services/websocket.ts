import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: string;
  userId?: string;
}

export interface WebSocketClient extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

export class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<WebSocketClient, any> = new Map();
  private heartbeatInterval: NodeJS.Timeout;

  constructor(server: http.Server) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws'
    });

    this.setupWebSocketServer();
    this.startHeartbeat();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocketClient, req) => {
      console.log('New WebSocket connection established');

      // Add client to the clients map
      this.clients.set(ws, { lastPing: Date.now() });

      // Setup client event handlers
      ws.on('message', (data) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            data: { message: 'Invalid message format' }
          }));
        }
      });

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('close', () => {
        console.log('WebSocket connection closed');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        data: {
          message: 'Connected to NoteByPine WebSocket server',
          timestamp: new Date().toISOString()
        }
      }));
    });

    console.log('WebSocket server initialized on path: /ws');
  }

  private handleMessage(client: WebSocketClient, message: WebSocketMessage) {
    const clientData = this.clients.get(client);

    switch (message.type) {
      case 'ping':
        client.send(JSON.stringify({
          type: 'pong',
          data: { timestamp: new Date().toISOString() }
        }));
        break;

      case 'authenticate':
        // Handle WebSocket authentication
        if (message.data.token) {
          // In a real implementation, verify the JWT token
          client.userId = message.data.userId;
          this.clients.set(client, {
            ...clientData,
            userId: message.data.userId,
            authenticated: true
          });

          client.send(JSON.stringify({
            type: 'authenticated',
            data: { message: 'Successfully authenticated' }
          }));
        }
        break;

      case 'subscribe':
        // Handle subscription to specific events
        if (clientData && clientData.authenticated) {
          this.clients.set(client, {
            ...clientData,
            subscriptions: message.data.channels || []
          });

          client.send(JSON.stringify({
            type: 'subscribed',
            data: {
              channels: message.data.channels || [],
              message: 'Successfully subscribed to channels'
            }
          }));
        }
        break;

      case 'unsubscribe':
        // Handle unsubscription from specific events
        if (clientData && clientData.authenticated) {
          const currentSubs = clientData.subscriptions || [];
          const newSubs = currentSubs.filter((channel: string) =>
            !message.data.channels.includes(channel)
          );

          this.clients.set(client, {
            ...clientData,
            subscriptions: newSubs
          });

          client.send(JSON.stringify({
            type: 'unsubscribed',
            data: {
              channels: message.data.channels,
              message: 'Successfully unsubscribed from channels'
            }
          }));
        }
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((clientData, ws) => {
        if (!ws.isAlive) {
          console.log('Terminating inactive WebSocket connection');
          ws.terminate();
          this.clients.delete(ws);
          return;
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds
  }

  public broadcast(message: WebSocketMessage, filter?: (client: WebSocketClient, data: any) => boolean) {
    const messageString = JSON.stringify({
      ...message,
      timestamp: message.timestamp || new Date().toISOString()
    });

    let sentCount = 0;

    this.clients.forEach((clientData, ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        // Apply filter if provided
        if (filter && !filter(ws, clientData)) {
          return;
        }

        // Check if client is subscribed to this message type
        if (clientData.subscriptions &&
            clientData.subscriptions.length > 0 &&
            !clientData.subscriptions.includes(message.type)) {
          return;
        }

        try {
          ws.send(messageString);
          sentCount++;
        } catch (error) {
          console.error('Failed to send WebSocket message:', error);
          this.clients.delete(ws);
        }
      }
    });

    console.log(`Broadcasted message "${message.type}" to ${sentCount} clients`);
    return sentCount;
  }

  public sendToUser(userId: string, message: WebSocketMessage) {
    const messageString = JSON.stringify({
      ...message,
      timestamp: message.timestamp || new Date().toISOString()
    });

    let sentCount = 0;

    this.clients.forEach((clientData, ws) => {
      if (ws.readyState === WebSocket.OPEN && clientData.userId === userId) {
        try {
          ws.send(messageString);
          sentCount++;
        } catch (error) {
          console.error('Failed to send WebSocket message to user:', error);
          this.clients.delete(ws);
        }
      }
    });

    console.log(`Sent message "${message.type}" to user ${userId} (${sentCount} connections)`);
    return sentCount;
  }

  public getConnectedClients(): number {
    return this.clients.size;
  }

  public getAuthenticatedClients(): number {
    let count = 0;
    this.clients.forEach((clientData) => {
      if (clientData.authenticated) {
        count++;
      }
    });
    return count;
  }

  public close() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.clients.forEach((clientData, ws) => {
      ws.close();
    });

    this.wss.close();
    console.log('WebSocket server closed');
  }
}

// Convenience function to create and attach WebSocket service to Express app
export function setupWebSocket(app: any, server: http.Server) {
  const wsService = new WebSocketService(server);

  // Make WebSocket service available to routes
  app.locals.wsServer = {
    broadcast: (message: WebSocketMessage) => wsService.broadcast(message),
    sendToUser: (userId: string, message: WebSocketMessage) => wsService.sendToUser(userId, message),
    getStats: () => ({
      connected: wsService.getConnectedClients(),
      authenticated: wsService.getAuthenticatedClients()
    })
  };

  return wsService;
}