import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import type { WebSocketMessage, OAuthTokens } from './types.js';

export class WebSocketManager {
  private connections = new Map<string, WebSocket>();
  private sessionConnections = new Map<string, string>(); // sessionId -> connectionId

  constructor(private fastify: FastifyInstance) {
    this.setupWebSocketRoutes();
  }

  private setupWebSocketRoutes() {
    this.fastify.register(async  (fastify: FastifyInstance) => {
      fastify.get('/ws', { websocket: true }, (connection, req) => {
        const connectionId = Math.random().toString(36).substring(2, 15);
        
        console.log(`[WebSocket] New connection: ${connectionId}`);
        
        // Store connection
        this.connections.set(connectionId, connection);
        
        // Handle incoming messages
        connection.on('message', (data: Buffer) => {
          try {
            const message: WebSocketMessage = JSON.parse(data.toString());
            this.handleMessage(connectionId, message);
          } catch (error) {
            console.error('[WebSocket] Invalid message format:', error);
            this.sendMessage(connectionId, {
              type: 'auth_error',
              error: 'Invalid message format'
            });
          }
        });

        // Handle connection close
        connection.on('close', () => {
          console.log(`[WebSocket] Connection closed: ${connectionId}`);
          this.connections.delete(connectionId);
          
          // Clean up session mapping
          for (const [sessionId, connId] of this.sessionConnections.entries()) {
            if (connId === connectionId) {
              this.sessionConnections.delete(sessionId);
              break;
            }
          }
        });

        // Send welcome message
        this.sendMessage(connectionId, {
          type: 'ping'
        });
      });
    });
  }

  private handleMessage(connectionId: string, message: WebSocketMessage) {
    console.log(`[WebSocket] Received message from ${connectionId}:`, message);

    switch (message.type) {
      case 'pong':
        // Client responded to ping
        break;
      
      case 'auth_request':
        if (message.sessionId) {
          // Map session to connection
          this.sessionConnections.set(message.sessionId, connectionId);
          console.log(`[WebSocket] Mapped session ${message.sessionId} to connection ${connectionId}`);
        }
        break;
        
      default:
        console.warn(`[WebSocket] Unknown message type: ${message.type}`);
    }
  }

  sendMessage(connectionId: string, message: WebSocketMessage) {
    const connection = this.connections.get(connectionId);
    if (connection && connection.readyState === connection.OPEN) {
      connection.send(JSON.stringify(message));
    }
  }

  notifyAuthComplete(sessionId: string, tokens: OAuthTokens, platform: string) {
    const connectionId = this.sessionConnections.get(sessionId);
    if (connectionId) {
      console.log(`[WebSocket] Notifying auth complete for session ${sessionId}`);
      this.sendMessage(connectionId, {
        type: 'auth_complete',
        platform: platform as any,
        sessionId,
        tokens
      });
      
      // Clean up session mapping
      this.sessionConnections.delete(sessionId);
    } else {
      console.warn(`[WebSocket] No connection found for session ${sessionId}`);
    }
  }

  notifyAuthError(sessionId: string, error: string, platform: string) {
    const connectionId = this.sessionConnections.get(sessionId);
    if (connectionId) {
      console.log(`[WebSocket] Notifying auth error for session ${sessionId}:`, error);
      this.sendMessage(connectionId, {
        type: 'auth_error',
        platform: platform as any,
        sessionId,
        error
      });
      
      // Clean up session mapping
      this.sessionConnections.delete(sessionId);
    }
  }

  sendAuthUrl(sessionId: string, authUrl: string, platform: string) {
    const connectionId = this.sessionConnections.get(sessionId);
    if (connectionId) {
      console.log(`[WebSocket] Sending auth URL for session ${sessionId}`);
      this.sendMessage(connectionId, {
        type: 'auth_request',
        platform: platform as any,
        sessionId,
        authUrl
      });
    }
  }

  // Ping all connections to keep them alive
  pingConnections() {
    for (const [connectionId, connection] of this.connections.entries()) {
      if (connection.readyState === connection.OPEN) {
        this.sendMessage(connectionId, { type: 'ping' });
      } else {
        this.connections.delete(connectionId);
      }
    }
  }
}
