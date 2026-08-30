import { Controller, Get, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { RedisService } from '@app/redis';
import { KafkaProducerService, KAFKA_TOPICS } from '@app/kafka';
import { JwtAuthGuard } from '@app/security';
import { Public } from '../decorators/public.decorator';

@ApiTags('🚚 Delivery')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('delivery')
export class DeliveryController {
  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
  ) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Delivery service health check' })
  healthCheck() {
    return { service: 'delivery', status: 'ok', timestamp: new Date().toISOString() };
  }

  @Post('assign')
  @ApiOperation({ summary: 'Assign a delivery partner to an order' })
  @ApiBody({ schema: { properties: {
    orderId: { type: 'string' }, serviceType: { type: 'string', enum: ['food', 'grocery', 'pharmacy', 'marketplace'] },
  }}})
  async assignPartner(@Body() dto: { orderId: string; serviceType: string }) {
    const partnerId = `DP-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const assignment = {
      orderId: dto.orderId, partnerId, serviceType: dto.serviceType,
      status: 'ASSIGNED', assignedAt: new Date().toISOString(),
    };
    await this.redis.setJson(`delivery:assignment:${dto.orderId}`, assignment, 86400);
    await this.kafka.publish(KAFKA_TOPICS.DELIVERY_PARTNER_ASSIGNED, assignment);
    return { success: true, assignment };
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get delivery status for an order' })
  async getDeliveryStatus(@Param('orderId') orderId: string) {
    const status = await this.redis.getJson(`delivery:assignment:${orderId}`);
    return status ? { success: true, delivery: status } : { success: false, reason: 'No delivery found' };
  }

  @Put('order/:orderId/status')
  @ApiOperation({ summary: 'Update delivery status' })
  @ApiBody({ schema: { properties: {
    status: { type: 'string', enum: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'FAILED'] },
    partnerId: { type: 'string' },
    lat: { type: 'number' }, lng: { type: 'number' },
  }}})
  async updateStatus(
    @Param('orderId') orderId: string,
    @Body() body: { status: string; partnerId: string; lat?: number; lng?: number },
  ) {
    const existing = await this.redis.getJson<any>(`delivery:assignment:${orderId}`);
    const updated = { ...existing, status: body.status, updatedAt: new Date().toISOString() };
    if (body.lat && body.lng) {
      updated.lastLocation = { lat: body.lat, lng: body.lng };
    }
    await this.redis.setJson(`delivery:assignment:${orderId}`, updated, 86400);
    await this.kafka.publish(KAFKA_TOPICS.DELIVERY_STATUS_UPDATED, { orderId, status: body.status, partnerId: body.partnerId });
    return { success: true, orderId, status: body.status };
  }

  @Get('partner/:partnerId/active')
  @ApiOperation({ summary: 'Get active deliveries for a partner' })
  async getPartnerActive(@Param('partnerId') partnerId: string) {
    // Scan Redis for active assignments for this partner
    const activeStatuses = new Set(['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'OUT_FOR_DELIVERY']);
    const keys = await this.redis.keys('delivery:assignment:*');
    const deliveries: any[] = [];

    for (const key of keys) {
      const assignment = await this.redis.getJson<any>(key);
      if (assignment?.partnerId === partnerId && activeStatuses.has(assignment?.status)) {
        deliveries.push(assignment);
      }
    }

    // Sort by most recently assigned first
    deliveries.sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());

    return { partnerId, deliveries, total: deliveries.length };
  }

  @Get('partner/:partnerId/history')
  @ApiOperation({ summary: 'Get delivery history for a partner' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  async getPartnerHistory(
    @Param('partnerId') partnerId: string,
    @Query('page') page = 1, @Query('limit') limit = 20,
  ) {
    // Scan Redis for completed/failed deliveries for this partner
    const completedStatuses = new Set(['DELIVERED', 'FAILED', 'RETURNED', 'CANCELLED']);
    const keys = await this.redis.keys('delivery:assignment:*');
    const allHistory: any[] = [];

    for (const key of keys) {
      const assignment = await this.redis.getJson<any>(key);
      if (assignment?.partnerId === partnerId && completedStatuses.has(assignment?.status)) {
        allHistory.push(assignment);
      }
    }

    // Sort by most recent first
    allHistory.sort((a, b) => new Date(b.updatedAt || b.assignedAt).getTime() - new Date(a.updatedAt || a.assignedAt).getTime());

    // Paginate
    const start = (Number(page) - 1) * Number(limit);
    const data = allHistory.slice(start, start + Number(limit));

    return { partnerId, data, total: allHistory.length, page: Number(page), limit: Number(limit) };
  }

  @Post('estimate')
  @ApiOperation({ summary: 'Estimate delivery fee' })
  @ApiBody({ schema: { properties: {
    distanceKm: { type: 'number' }, weight: { type: 'number' },
    serviceType: { type: 'string' },
  }}})
  async estimateFee(@Body() dto: { distanceKm: number; weight?: number; serviceType?: string }) {
    // Service-specific rates aligned with delivery-service rateConfig
    const rateConfig: Record<string, { baseFee: number; perKm: number; freeDeliveryThreshold?: number }> = {
      marketplace: { baseFee: 60, perKm: 12, freeDeliveryThreshold: 2000 },
      grocery:     { baseFee: 40, perKm: 10, freeDeliveryThreshold: 1500 },
      restaurant:  { baseFee: 30, perKm: 15 },
      pharmacy:    { baseFee: 50, perKm: 10, freeDeliveryThreshold: 1000 },
    };
    const config = rateConfig[dto.serviceType ?? 'marketplace'] ?? rateConfig.marketplace;
    const weightSurcharge = dto.weight && dto.weight > 5 ? Math.ceil(dto.weight - 5) * 20 : 0;
    const distanceFee = Math.round(dto.distanceKm * config.perKm);
    const fee = Math.round(config.baseFee + distanceFee + weightSurcharge);
    return {
      distanceKm: dto.distanceKm, fee, currency: 'INR', serviceType: dto.serviceType ?? 'marketplace',
      freeDeliveryThreshold: config.freeDeliveryThreshold ?? null,
      breakdown: { base: config.baseFee, distance: distanceFee, weight: weightSurcharge },
    };
  }

  @Post('partner/:partnerId/location')
  @ApiOperation({ summary: 'Update delivery partner GPS location' })
  @ApiBody({ schema: { properties: { lat: { type: 'number' }, lng: { type: 'number' }, heading: { type: 'number' } } } })
  async updatePartnerLocation(
    @Param('partnerId') partnerId: string,
    @Body() body: { lat: number; lng: number; heading?: number },
  ) {
    await this.redis.geoadd('delivery:partners:locations', body.lng, body.lat, partnerId);
    return { success: true, partnerId };
  }
}
