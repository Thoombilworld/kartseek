import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { RedisService } from '@app/redis';
import { KafkaProducerService, KAFKA_TOPICS } from '@app/kafka';
import { JwtAuthGuard, ResourceOwnershipGuard, ResourceOwner } from '@app/security';
import { Public } from '../decorators/public.decorator';

/**
 * User and partner profiles.
 *
 * SECURITY — this controller was entirely unauthenticated.
 *
 * It imported `JwtAuthGuard`, `ResourceOwnershipGuard` and `ResourceOwner` and
 * applied them to exactly two routes at the bottom of the file (partner KYC).
 * The other thirteen had no guard at all, and there is no APP_GUARD in
 * `main.ts` — the gateway authenticates only where a guard is written. So:
 *
 *   GET    /users/<any id>/profile              read anyone's profile
 *   PUT    /users/<any id>/profile              overwrite anyone's profile
 *   GET    /users/<any id>/addresses            read anyone's home address
 *   POST   /users/<any id>/addresses            add an address to anyone
 *   PUT    /users/<any id>/addresses/<addr>     edit anyone's address
 *   DELETE /users/<any id>/addresses/<addr>     delete anyone's address
 *   GET    /users/partner/<any id>/profile      read any partner's profile
 *   PUT    /users/partner/<any id>/profile      overwrite any partner's profile
 *   GET    /users/partner/<any id>/wallet       read any partner's balance
 *
 * all with no credential of any kind — a textbook IDOR across every route the
 * controller has. `@ApiBearerAuth('JWT')` at class level is why it survived
 * review: it made Swagger render a padlock on all of them, but that decorator
 * is documentation and enforces nothing.
 *
 * Both guards now sit at class level. `ResourceOwnershipGuard` is a no-op on any
 * handler without `@ResourceOwner`, so it is safe there and cannot be forgotten
 * on a route added later; the three genuinely public routes say `@Public()`.
 */
@ApiTags('👤 Users & Partners')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, ResourceOwnershipGuard)
@Controller('users')
export class UserController {
  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
  ) {}

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'User service health check' })
  healthCheck() {
    return { service: 'user', status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get(':userId/profile')
  @ResourceOwner({ paramKey: 'userId' })
  @ApiOperation({ summary: 'Get user profile' })
  async getProfile(@Param('userId') userId: string) {
    const profile = await this.redis.getJson(`user:${userId}`);
    return profile ? { success: true, user: profile } : { success: false, reason: 'User not found' };
  }

  @Put(':userId/profile')
  @ResourceOwner({ paramKey: 'userId' })
  @ApiOperation({ summary: 'Update user profile' })
  @ApiBody({ schema: { properties: {
    name: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' },
    avatar: { type: 'string' }, address: { type: 'string' },
  }}})
  async updateProfile(@Param('userId') userId: string, @Body() body: Record<string, any>) {
    const existing = await this.redis.getJson<any>(`user:${userId}`) ?? {};
    const updated = { ...existing, ...body, updatedAt: new Date().toISOString() };
    await this.redis.setJson(`user:${userId}`, updated, 0);
    return { success: true, user: updated };
  }

  @Get(':userId/addresses')
  @ResourceOwner({ paramKey: 'userId' })
  @ApiOperation({ summary: 'Get user saved addresses' })
  async getAddresses(@Param('userId') userId: string) {
    const addresses = await this.redis.getJson(`addresses:${userId}`) ?? [];
    return { success: true, addresses };
  }

  @Post(':userId/addresses')
  @ResourceOwner({ paramKey: 'userId' })
  @ApiOperation({ summary: 'Add a saved address' })
  async addAddress(@Param('userId') userId: string, @Body() body: any) {
    const id = body?.id || `ADDR-${Date.now()}`;
    const addresses = (await this.redis.getJson<any[]>(`addresses:${userId}`)) ?? [];
    const entry = { ...body, id };
    // First address (or one explicitly flagged) becomes the default.
    if (entry.isDefault || addresses.length === 0) {
      addresses.forEach((a) => { a.isDefault = false; });
      entry.isDefault = true;
    }
    addresses.push(entry);
    await this.redis.setJson(`addresses:${userId}`, addresses, 0);
    return { success: true, addressId: id, address: entry };
  }

  @Put(':userId/addresses/:addressId')
  @ResourceOwner({ paramKey: 'userId' })
  @ApiOperation({ summary: 'Update a saved address' })
  async updateAddress(@Param('userId') userId: string, @Param('addressId') addressId: string, @Body() body: any) {
    const addresses = (await this.redis.getJson<any[]>(`addresses:${userId}`)) ?? [];
    let updated: any = null;
    const next = addresses.map((a) => {
      if (a.id !== addressId) return body?.isDefault ? { ...a, isDefault: false } : a;
      updated = { ...a, ...body, id: addressId };
      return updated;
    });
    if (!updated) return { success: false, message: `Address ${addressId} not found` };
    await this.redis.setJson(`addresses:${userId}`, next, 0);
    return { success: true, address: updated };
  }

  @Delete(':userId/addresses/:addressId')
  @ResourceOwner({ paramKey: 'userId' })
  @ApiOperation({ summary: 'Delete a saved address' })
  async deleteAddress(@Param('userId') userId: string, @Param('addressId') addressId: string) {
    const addresses = (await this.redis.getJson<any[]>(`addresses:${userId}`)) ?? [];
    const next = addresses.filter((a: any) => a.id !== addressId);
    await this.redis.setJson(`addresses:${userId}`, next, 0);
    return { success: true, message: `Address ${addressId} deleted` };
  }

  // ── Partner / Driver Endpoints ─────────────────────────────────────────────

  @Post('partner/register')
  @Public()
  @ApiOperation({ summary: 'Register as a delivery/taxi partner' })
  @ApiBody({ schema: { properties: {
    name: { type: 'string' }, phone: { type: 'string' }, email: { type: 'string' },
    role: { type: 'string', enum: ['delivery', 'taxi_driver'] },
    vehicleType: { type: 'string' }, vehicleNumber: { type: 'string' },
    licenseNumber: { type: 'string' },
  }}})
  async registerPartner(@Body() dto: any) {
    const partnerId = `PARTNER-${Date.now()}`;
    const partner = {
      id: partnerId, ...dto,
      status: 'PENDING_KYC', kycStatus: 'pending',
      createdAt: new Date().toISOString(),
    };
    await this.redis.setJson(`partner:${partnerId}`, partner, 0);
    await this.kafka.publish(KAFKA_TOPICS.PARTNER_REGISTERED, { partnerId, role: dto.role });
    return { success: true, partner };
  }

  @Get('partner/:partnerId/profile')
  @ResourceOwner({ paramKey: 'partnerId' })
  @ApiOperation({ summary: 'Get partner profile' })
  async getPartnerProfile(@Param('partnerId') partnerId: string) {
    const profile = await this.redis.getJson(`partner:${partnerId}`);
    return profile ? { success: true, partner: profile } : { success: false, reason: 'Partner not found' };
  }

  @Put('partner/:partnerId/profile')
  @ResourceOwner({ paramKey: 'partnerId' })
  @ApiOperation({ summary: 'Update partner profile' })
  async updatePartnerProfile(@Param('partnerId') partnerId: string, @Body() body: any) {
    const existing = await this.redis.getJson<any>(`partner:${partnerId}`) ?? {};
    const updated = { ...existing, ...body, updatedAt: new Date().toISOString() };
    await this.redis.setJson(`partner:${partnerId}`, updated, 0);
    return { success: true, partner: updated };
  }

  @Get('partner/:partnerId/earnings')
  @ResourceOwner({ paramKey: 'partnerId' })
  @ApiOperation({ summary: 'Get partner earnings summary' })
  @ApiQuery({ name: 'period', enum: ['today', 'week', 'month'], required: false })
  async getPartnerEarnings(@Param('partnerId') partnerId: string, @Query('period') period = 'today') {
    return {
      partnerId, period,
      earnings: { total: 0, trips: 0, tips: 0, bonus: 0, currency: 'INR' },
      history: [] as unknown[],
    };
  }

  @Get('partner/:partnerId/wallet')
  @ResourceOwner({ paramKey: 'partnerId' })
  @ApiOperation({ summary: 'Get partner wallet balance' })
  async getPartnerWallet(@Param('partnerId') partnerId: string) {
    const wallet = await this.redis.getJson(`wallet:partner:${partnerId}`) ?? { balance: 0 };
    return { success: true, partnerId, wallet };
  }

  @Get('partner/:partnerId/kyc')
  @UseGuards(JwtAuthGuard, ResourceOwnershipGuard)
  @ResourceOwner({ paramKey: 'partnerId' })
  @ApiOperation({ summary: 'Get partner KYC verification status' })
  async getPartnerKyc(@Param('partnerId') partnerId: string) {
    const partner = await this.redis.getJson<any>(`partner:${partnerId}`);
    return {
      partnerId,
      kycStatus: partner?.kycStatus ?? 'not_submitted',
      documents: partner?.documents ?? [],
    };
  }

  @Post('partner/:partnerId/kyc/submit')
  @UseGuards(JwtAuthGuard, ResourceOwnershipGuard)
  @ResourceOwner({ paramKey: 'partnerId' })
  @ApiOperation({ summary: 'Submit KYC documents' })
  @ApiBody({ schema: { properties: {
    documentType: { type: 'string', enum: ['national_id', 'drivers_license', 'vehicle_registration', 'insurance'] },
    documentUrl: { type: 'string' },
  }}})
  async submitKycDocument(
    @Param('partnerId') partnerId: string,
    @Body() body: { documentType: string; documentUrl: string },
  ) {
    const partner = await this.redis.getJson<any>(`partner:${partnerId}`) ?? {};
    const documents = partner.documents ?? [];
    documents.push({ ...body, submittedAt: new Date().toISOString(), status: 'pending' });
    partner.documents = documents;
    partner.kycStatus = 'under_review';
    await this.redis.setJson(`partner:${partnerId}`, partner, 0);
    await this.kafka.publish(KAFKA_TOPICS.ADMIN_KYC_SUBMITTED, { partnerId, documentType: body.documentType });
    return { success: true, kycStatus: 'under_review' };
  }

  @Get('partner/:partnerId/ratings')
  @ResourceOwner({ paramKey: 'partnerId' })
  @ApiOperation({ summary: 'Get partner ratings and reviews' })
  async getPartnerRatings(@Param('partnerId') partnerId: string) {
    return {
      partnerId,
      averageRating: 4.5,
      totalRatings: 0,
      breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      reviews: [] as unknown[],
    };
  }
}
