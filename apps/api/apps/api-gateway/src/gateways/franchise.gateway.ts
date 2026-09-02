import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WsDdosGuard } from '@app/security';
import { authenticateWsClient } from './ws-auth.util';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://*.kartseek.com',
    ],
    credentials: true,
  },
  namespace: '/franchise',
  transports: ['websocket', 'polling'],
  pingInterval: 10000,
  pingTimeout: 5000,
})
@UseGuards(WsDdosGuard)
export class FranchiseGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(FranchiseGateway.name);

  handleConnection(client: Socket) {
    // ── JWT Auth ──
    const user = authenticateWsClient(client, 'FranchiseGateway');
    if (!user) return;

    const franchiseId = client.handshake.query.franchiseId as string;
    if (franchiseId) {
      client.join(`franchise:${franchiseId}`);
      this.logger.debug(`Franchise client connected to room: franchise:${franchiseId} (Socket: ${client.id})`);
    } else {
      this.logger.debug(`Franchise client connected without franchiseId (Socket: ${client.id})`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Franchise client disconnected (Socket: ${client.id})`);

    // Clean up all event listeners to prevent memory leaks
    client.removeAllListeners();
    // Force disconnect to free socket resources
    client.disconnect(true);
  }

  @SubscribeMessage('join_franchise_room')
  handleJoinRoom(
    @MessageBody() data: { franchiseId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data && data.franchiseId) {
      const room = `franchise:${data.franchiseId}`;
      client.join(room);
      this.logger.debug(`Client explicitly joined room: ${room}`);
      return { success: true, room };
    }
    return { success: false, message: 'franchiseId missing' };
  }

  @SubscribeMessage('ping_latency')
  async handlePingLatency(
    @MessageBody() data: { clientTimestamp: number },
    @ConnectedSocket() client: Socket,
  ) {
    const serverTimestamp = Date.now();
    const serverProcessingMs = serverTimestamp - (data?.clientTimestamp || serverTimestamp);

    client.emit('pong_latency', {
      clientTimestamp: data?.clientTimestamp,
      serverTimestamp,
      serverProcessingMs,
    });

    const today = new Date().toISOString().slice(0, 10);
    const latencyKey = `stats:ws:latency:${today}`;
    try {
      if ((this as any).redis) {
        const raw = await (this as any).redis.get(latencyKey);
        const stats = raw ? JSON.parse(raw) : { count: 0, totalMs: 0, minMs: Infinity, maxMs: 0 };
        stats.count++;
        stats.totalMs += serverProcessingMs;
        stats.minMs = Math.min(stats.minMs, serverProcessingMs);
        stats.maxMs = Math.max(stats.maxMs, serverProcessingMs);
        await (this as any).redis.set(latencyKey, JSON.stringify(stats), 86400 * 2);
      }
    } catch {
      // ignore
    }
  }

}
