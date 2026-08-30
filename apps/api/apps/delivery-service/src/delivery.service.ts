import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@app/redis';
import { KafkaProducerService, KAFKA_TOPICS } from '@app/kafka';

// ─── Delivery Partner Status ─────────────────────────────────────────────────
export enum PartnerStatus {
  IDLE = 'IDLE',
  EN_ROUTE_PICKUP = 'EN_ROUTE_PICKUP',
  AT_PICKUP = 'AT_PICKUP',
  EN_ROUTE_DROP = 'EN_ROUTE_DROP',
  AT_DROP = 'AT_DROP',
  OFFLINE = 'OFFLINE',
}

export enum DeliveryStatus {
  ASSIGNED = 'ASSIGNED',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  ARRIVED = 'ARRIVED',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
  ) {}

  async healthCheck() {
    return { service: 'delivery-service', status: 'ok', timestamp: new Date().toISOString() };
  }

  // ── Partner Matching — Redis Geospatial Search ──────────────────────────────
  async assignDeliveryPartner(orderId: string, serviceType: string, pickupLat?: number, pickupLng?: number) {
    const radius = 10; // km
    let partnerId: string | null = null;
    let partnerDistance: number | null = null;

    // 1. Try geospatial match if coordinates provided
    if (pickupLat && pickupLng) {
      try {
        const nearbyPartners = await this.redis.georadius(
          'delivery:partners:locations',
          pickupLng,
          pickupLat,
          radius,
        );
        // Find the first IDLE partner
        if (nearbyPartners && nearbyPartners.length > 0) {
          for (const partner of nearbyPartners) {
            const status = await this.redis.get(`delivery:partner:status:${partner.member}`);
            if (!status || status === PartnerStatus.IDLE) {
              partnerId = partner.member as string;
              partnerDistance = partner.dist ?? null;
              break;
            }
          }
        }
      } catch (err) {
        this.logger.warn(`Geo search failed for order ${orderId}: ${(err as Error).message}`);
      }
    }

    // 2. Fallback: generate a partner ID if geo-match unavailable
    if (!partnerId) {
      partnerId = `DP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      this.logger.warn(`No nearby partner found for order ${orderId}, assigned fallback: ${partnerId}`);
    }

    // 3. Build assignment record
    const assignment = {
      orderId,
      partnerId,
      serviceType,
      status: DeliveryStatus.ASSIGNED,
      assignedAt: new Date().toISOString(),
      pickupLat: pickupLat ?? null,
      pickupLng: pickupLng ?? null,
      distanceKm: partnerDistance,
      estimatedPickupMin: partnerDistance ? Math.ceil(partnerDistance * 2 + 3) : null,
      statusHistory: [
        { status: DeliveryStatus.ASSIGNED, timestamp: new Date().toISOString() },
      ],
    };

    // 4. Persist in Redis with 24h TTL
    await this.redis.setJson(`delivery:assignment:${orderId}`, assignment, 86400);

    // 5. Add to partner's active deliveries set
    await this.redis.setJson(`delivery:partner:active:${partnerId}:${orderId}`, assignment, 86400);
    await this.redis.set(`delivery:partner:status:${partnerId}`, PartnerStatus.EN_ROUTE_PICKUP, 86400);

    // 6. Publish Kafka event
    await this.kafka.publish('delivery.partner.assigned', {
      orderId,
      partnerId,
      serviceType,
      distanceKm: partnerDistance,
    });

    this.logger.log(`Partner ${partnerId} assigned to order ${orderId} (${partnerDistance?.toFixed(1) ?? '?'} km)`);
    return { success: true, assignment };
  }

  // ── Delivery Status Tracking ─────────────────────────────────────────────────
  async getDeliveryStatus(orderId: string) {
    const assignment = await this.redis.getJson<any>(`delivery:assignment:${orderId}`);
    if (!assignment) {
      return { success: false, reason: 'No delivery assignment found for this order' };
    }
    return { success: true, ...assignment };
  }

  async updateDeliveryStatus(orderId: string, status: string, partnerId: string, location?: { lat: number; lng: number }) {
    const assignment = await this.redis.getJson<any>(`delivery:assignment:${orderId}`);
    if (!assignment) {
      return { success: false, reason: 'Delivery assignment not found' };
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      [DeliveryStatus.ASSIGNED]: [DeliveryStatus.PICKED_UP, DeliveryStatus.CANCELLED],
      [DeliveryStatus.PICKED_UP]: [DeliveryStatus.IN_TRANSIT, DeliveryStatus.CANCELLED],
      [DeliveryStatus.IN_TRANSIT]: [DeliveryStatus.ARRIVED, DeliveryStatus.FAILED],
      [DeliveryStatus.ARRIVED]: [DeliveryStatus.DELIVERED, DeliveryStatus.FAILED],
    };

    const allowed = validTransitions[assignment.status] || [];
    if (!allowed.includes(status)) {
      return { success: false, reason: `Cannot transition from ${assignment.status} to ${status}` };
    }

    const historyEntry = {
      status,
      timestamp: new Date().toISOString(),
      ...(location ? { lat: location.lat, lng: location.lng } : {}),
    };

    const updated = {
      ...assignment,
      status,
      updatedAt: new Date().toISOString(),
      lastLocation: location ?? assignment.lastLocation ?? null,
      statusHistory: [...(assignment.statusHistory ?? []), historyEntry],
    };

    await this.redis.setJson(`delivery:assignment:${orderId}`, updated, 86400);

    // Update partner status based on delivery status
    const partnerStatusMap: Record<string, PartnerStatus> = {
      [DeliveryStatus.PICKED_UP]: PartnerStatus.EN_ROUTE_DROP,
      [DeliveryStatus.IN_TRANSIT]: PartnerStatus.EN_ROUTE_DROP,
      [DeliveryStatus.ARRIVED]: PartnerStatus.AT_DROP,
      [DeliveryStatus.DELIVERED]: PartnerStatus.IDLE,
      [DeliveryStatus.FAILED]: PartnerStatus.IDLE,
      [DeliveryStatus.CANCELLED]: PartnerStatus.IDLE,
    };

    if (partnerStatusMap[status]) {
      await this.redis.set(`delivery:partner:status:${partnerId}`, partnerStatusMap[status], 86400);
    }

    // Clean up active delivery on terminal states
    if ([DeliveryStatus.DELIVERED, DeliveryStatus.FAILED, DeliveryStatus.CANCELLED].includes(status as DeliveryStatus)) {
      await this.redis.del(`delivery:partner:active:${partnerId}:${orderId}`);
    }

    await this.kafka.publish('delivery.status.updated', { orderId, status, partnerId, location });
    this.logger.log(`Delivery ${orderId} status → ${status} by partner ${partnerId}`);
    return { success: true, orderId, status, updated };
  }

  // ── Partner Active Deliveries ────────────────────────────────────────────────
  async getPartnerActiveDeliveries(partnerId: string) {
    const keys = await this.redis.keys(`delivery:partner:active:${partnerId}:*`);
    const deliveries: any[] = [];

    for (const key of keys) {
      const data = await this.redis.getJson<any>(key);
      if (data && ![DeliveryStatus.DELIVERED, DeliveryStatus.FAILED, DeliveryStatus.CANCELLED].includes(data.status)) {
        deliveries.push(data);
      }
    }

    const status = await this.redis.get(`delivery:partner:status:${partnerId}`) || PartnerStatus.OFFLINE;
    return { partnerId, status, activeCount: deliveries.length, deliveries };
  }

  // ── Partner Delivery History ─────────────────────────────────────────────────
  async getPartnerDeliveryHistory(partnerId: string, page = 1, limit = 20) {
    // Scan all completed deliveries for this partner from Redis
    const keys = await this.redis.keys(`delivery:partner:active:${partnerId}:*`);
    const allDeliveries: any[] = [];

    for (const key of keys) {
      const data = await this.redis.getJson<any>(key);
      if (data) allDeliveries.push(data);
    }

    // Also check the main assignment keys
    const assignmentKeys = await this.redis.keys('delivery:assignment:*');
    for (const key of assignmentKeys) {
      const data = await this.redis.getJson<any>(key);
      if (data && data.partnerId === partnerId && !allDeliveries.some(d => d.orderId === data.orderId)) {
        allDeliveries.push(data);
      }
    }

    // Sort by most recent first
    allDeliveries.sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());

    const start = (page - 1) * limit;
    return {
      partnerId,
      data: allDeliveries.slice(start, start + limit),
      total: allDeliveries.length,
      page,
      limit,
      hasMore: allDeliveries.length > start + limit,
    };
  }

  // ── Delivery Fee Estimation ──────────────────────────────────────────────────
  async estimateDeliveryFee(distanceKm: number, weight?: number, serviceType?: string) {
    // Service-specific base fees and per-km rates
    const rateConfig: Record<string, { baseFee: number; perKm: number; freeDeliveryThreshold?: number }> = {
      marketplace: { baseFee: 60, perKm: 12, freeDeliveryThreshold: 2000 },
      grocery: { baseFee: 40, perKm: 10, freeDeliveryThreshold: 1500 },
      restaurant: { baseFee: 30, perKm: 15 },
      pharmacy: { baseFee: 50, perKm: 10, freeDeliveryThreshold: 1000 },
    };

    const config = rateConfig[serviceType ?? 'marketplace'] ?? rateConfig.marketplace;
    const weightSurcharge = weight && weight > 5 ? Math.ceil(weight - 5) * 20 : 0;
    const distanceFee = Math.round(distanceKm * config.perKm);
    const fee = Math.round(config.baseFee + distanceFee + weightSurcharge);

    return {
      distanceKm: Math.round(distanceKm * 100) / 100,
      fee,
      serviceType: serviceType ?? 'marketplace',
      freeDeliveryThreshold: config.freeDeliveryThreshold ?? null,
      breakdown: {
        base: config.baseFee,
        distance: distanceFee,
        weight: weightSurcharge,
      },
      estimatedTimeMin: Math.ceil(distanceKm * 2 + 5),
    };
  }

  // ── Partner Location Update ──────────────────────────────────────────────────
  async updatePartnerLocation(partnerId: string, lat: number, lng: number) {
    await this.redis.geoadd('delivery:partners:locations', lng, lat, partnerId);
    await this.redis.setJson(`delivery:partner:lastpos:${partnerId}`, {
      lat, lng, updatedAt: new Date().toISOString(),
    }, 3600);
    return { success: true, partnerId, lat, lng };
  }

  // ── Partner Status Management ────────────────────────────────────────────────
  async setPartnerStatus(partnerId: string, status: PartnerStatus) {
    await this.redis.set(`delivery:partner:status:${partnerId}`, status, 86400);

    if (status === PartnerStatus.OFFLINE) {
      await this.redis.geodel('delivery:partners:locations', partnerId);
    }

    await this.kafka.publish('delivery.partner.status_changed', { partnerId, status });
    return { success: true, partnerId, status };
  }

  // ── Delivery Metrics (Admin Dashboard) ──────────────────────────────────────
  async getDeliveryMetrics() {
    const allKeys = await this.redis.keys('delivery:assignment:*');
    let total = 0;
    let delivered = 0;
    let inProgress = 0;
    let failed = 0;

    for (const key of allKeys) {
      const data = await this.redis.getJson<any>(key);
      if (!data) continue;
      total++;
      if (data.status === DeliveryStatus.DELIVERED) delivered++;
      else if (data.status === DeliveryStatus.FAILED) failed++;
      else if (![DeliveryStatus.CANCELLED].includes(data.status)) inProgress++;
    }

    const onlinePartners = await this.redis.keys('delivery:partner:status:*');
    let onlineCount = 0;
    for (const key of onlinePartners) {
      const status = await this.redis.get(key);
      if (status && status !== PartnerStatus.OFFLINE) onlineCount++;
    }

    return {
      totalDeliveries: total,
      delivered,
      inProgress,
      failed,
      successRate: total > 0 ? Math.round((delivered / total) * 100) : 0,
      onlinePartners: onlineCount,
      timestamp: new Date().toISOString(),
    };
  }
}
