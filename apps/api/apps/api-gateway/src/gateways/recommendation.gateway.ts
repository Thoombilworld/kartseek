/**
 * KARTSEEK — Recommendation WebSocket Gateway
 *
 * Real-time delivery of personalized recommendations.
 *
 * Namespace: /recommendations
 *
 * Client → Server:
 *  - subscribe_module   — Tell server which module page the user is viewing
 *  - track_view         — Client-side view event (scroll into viewport, time spent)
 *  - recommendation_clicked — Feedback when user clicks a recommendation
 *
 * Server → Client:
 *  - recommendations_update — Fresh personalized recommendations
 *  - trending_update        — Trending items in user's region
 *  - cross_module_picks     — "You might also like" from other modules
 *  - connected              — Connection acknowledgement
 */
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
import { RedisService } from '@app/redis';
import { authenticateWsClient } from './ws-auth.util';
import { RecommendationService } from '../services/recommendation.service';
import {
  type RecommendationModule,
  type WsSubscribeModule,
  type WsTrackView,
  type WsRecommendationClicked,
  type WsRecommendationUpdate,
  ALL_RECOMMENDATION_MODULES,
} from '../services/recommendation.types';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://*.kartseek.com',
    ],
    credentials: true,
  },
  namespace: '/recommendations',
  transports: ['websocket', 'polling'],
})
@UseGuards(WsDdosGuard)
export class RecommendationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RecommendationGateway.name);

  /** Track which module each socket is currently viewing */
  private readonly socketModules = new Map<string, RecommendationModule>();

  constructor(
    private readonly redis: RedisService,
    private readonly wsDdosGuard: WsDdosGuard,
    private readonly recommendationService: RecommendationService,
  ) {}

  // ── Connection Lifecycle ─────────────────────────────────────────────────

  async handleConnection(client: Socket) {
    // ── JWT Auth ──
    const user = authenticateWsClient(client, 'RecommendationGateway');
    if (!user) return;

    // ── DDoS check ──
    const allowed = await this.wsDdosGuard.validateConnection(client);
    if (!allowed) return;

    const userId = user.id;

    // Join personal recommendation room
    client.join(`reco:${userId}`);

    // Track session
    await this.redis.hset('ws:reco:sessions', client.id, JSON.stringify({
      userId,
      connectedAt: new Date().toISOString(),
    }));

    this.logger.log(`🧠 Recommendation WS connected: ${userId} [socket=${client.id}]`);

    client.emit('connected', {
      socketId: client.id,
      userId,
      message: 'Connected to KARTSEEK Recommendations',
    });
  }

  async handleDisconnect(client: Socket) {
    this.socketModules.delete(client.id);
    await this.redis.hdel('ws:reco:sessions', client.id);
    
    // 🔧 FIX: Clean up all event listeners to prevent memory leaks
    client.removeAllListeners();
    // Force disconnect to free socket resources
    client.disconnect(true);
    
    this.logger.debug(`Recommendation client disconnected: ${client.id}`);
  }

  // ── Client Events ────────────────────────────────────────────────────────

  @SubscribeMessage('subscribe_module')
  async handleSubscribeModule(
    @MessageBody() data: WsSubscribeModule,
    @ConnectedSocket() client: Socket,
  ) {
    const user = (client as any).user;
    if (!user) return;

    const module = data.module;
    if (!ALL_RECOMMENDATION_MODULES.includes(module)) {
      client.emit('error', { message: `Invalid module: ${module}` });
      return;
    }

    // Update current module tracking
    this.socketModules.set(client.id, module);

    // Leave old module room, join new
    for (const mod of ALL_RECOMMENDATION_MODULES) {
      client.leave(`reco:module:${mod}`);
    }
    client.join(`reco:module:${module}`);

    this.logger.debug(`📱 ${user.id} subscribed to recommendations for: ${module}`);

    // Immediately push recommendations for the subscribed module
    try {
      const recoSet = await this.recommendationService.getRecommendations(user.id, module, 10);

      if (recoSet.forYou.length > 0) {
        client.emit('recommendations_update', {
          module,
          recommendations: recoSet.forYou,
          type: 'for_you',
          generatedAt: recoSet.generatedAt,
        } as WsRecommendationUpdate);
      }

      if (recoSet.trending.length > 0) {
        client.emit('trending_update', {
          module,
          recommendations: recoSet.trending,
          type: 'trending',
          generatedAt: recoSet.generatedAt,
        } as WsRecommendationUpdate);
      }

      if (recoSet.crossModule.length > 0) {
        client.emit('cross_module_picks', {
          module,
          recommendations: recoSet.crossModule,
          type: 'cross_module',
          generatedAt: recoSet.generatedAt,
        } as WsRecommendationUpdate);
      }
    } catch (err) {
      this.logger.warn(`Failed to generate recommendations: ${(err as Error).message}`);
    }
  }

  @SubscribeMessage('track_view')
  async handleTrackView(
    @MessageBody() data: WsTrackView,
    @ConnectedSocket() client: Socket,
  ) {
    const user = (client as any).user;
    if (!user) return;

    // Track the view event
    await this.recommendationService.trackActivity({
      userId: user.id,
      module: data.module,
      action: 'view',
      entityType: data.entityType,
      entityId: data.entityId,
      category: data.category,
      metadata: { durationMs: data.durationMs, source: 'websocket' },
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('recommendation_clicked')
  async handleRecommendationClicked(
    @MessageBody() data: WsRecommendationClicked,
    @ConnectedSocket() client: Socket,
  ) {
    const user = (client as any).user;
    if (!user) return;

    await this.recommendationService.trackRecommendationClick(
      user.id,
      data.recommendationId,
      data.module,
      data.entityId,
      data.position,
    );
  }

  // ── Server-Side Push (called by RecommendationService) ───────────────────

  /**
   * Push updated recommendations to a specific user.
   * Called after processing a significant activity event.
   */
  async pushRecommendationsToUser(userId: string, module: RecommendationModule) {
    try {
      const recoSet = await this.recommendationService.getRecommendations(userId, module, 10);
      const room = `reco:${userId}`;

      if (recoSet.forYou.length > 0) {
        this.server.to(room).emit('recommendations_update', {
          module,
          recommendations: recoSet.forYou,
          type: 'for_you',
          generatedAt: recoSet.generatedAt,
        } as WsRecommendationUpdate);
      }
    } catch (err) {
      this.logger.debug(`Push recommendation failed for ${userId}: ${(err as Error).message}`);
    }
  }

  /**
   * Broadcast trending updates to all clients viewing a specific module.
   */
  async broadcastTrendingUpdate(module: RecommendationModule, region: string) {
    try {
      const trending = await this.recommendationService.getTrendingRecommendations(module, region, 10);

      if (trending.length > 0) {
        this.server.to(`reco:module:${module}`).emit('trending_update', {
          module,
          recommendations: trending,
          type: 'trending',
          generatedAt: new Date().toISOString(),
        } as WsRecommendationUpdate);
      }
    } catch (err) {
      this.logger.debug(`Trending broadcast failed: ${(err as Error).message}`);
    }
  }
}
