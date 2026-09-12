import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { applyMarketFilter, assertInMarket, normaliseMarket, requireMarket } from '@app/common';

/** Who is asking, as forwarded by the gateway from the verified token. */
export interface HotelRequester {
  requesterId?: string;
  requesterRole?: string;
}
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In, Between, MoreThanOrEqual, LessThanOrEqual, ILike } from 'typeorm';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';

import { Hotel } from './entities/hotel.entity';
import { HotelRoom } from './entities/hotel-room.entity';
import { HotelBooking } from './entities/hotel-booking.entity';
import { HotelReview } from './entities/hotel-review.entity';
import { HotelOwner } from './entities/hotel-owner.entity';
import { HotelGuest } from './entities/hotel-guest.entity';
import { HotelPayout } from './entities/hotel-payout.entity';
import { HotelStaff } from './entities/hotel-staff.entity';
import { HotelSeasonalPricing } from './entities/hotel-seasonal-pricing.entity';

import { CreateBookingDto } from './dto/create-booking.dto';
import { ModifyBookingDto } from './dto/modify-booking.dto';
import { SearchHotelsDto, HotelSortBy } from './dto/search-hotels.dto';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { RegisterOwnerDto } from './dto/register-owner.dto';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdatePricingDto } from './dto/update-pricing.dto';
import {
  WebhookPaymentDto,
  WebhookRefundDto,
  PaymentWebhookStatus,
} from './dto/webhook-payment.dto';

@Injectable()
export class HotelService {
  private readonly logger = new Logger(HotelService.name);

  constructor(
    @InjectRepository(Hotel) private readonly hotelRepo: Repository<Hotel>,
    @InjectRepository(HotelRoom) private readonly roomRepo: Repository<HotelRoom>,
    @InjectRepository(HotelBooking) private readonly bookingRepo: Repository<HotelBooking>,
    @InjectRepository(HotelReview) private readonly reviewRepo: Repository<HotelReview>,
    @InjectRepository(HotelOwner) private readonly ownerRepo: Repository<HotelOwner>,
    @InjectRepository(HotelGuest) private readonly guestRepo: Repository<HotelGuest>,
    @InjectRepository(HotelPayout) private readonly payoutRepo: Repository<HotelPayout>,
    @InjectRepository(HotelStaff) private readonly staffRepo: Repository<HotelStaff>,
    @InjectRepository(HotelSeasonalPricing)
    private readonly seasonalRepo: Repository<HotelSeasonalPricing>,
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
  ) {}

  async healthCheck() {
    const dbOk = await this.hotelRepo
      .query('SELECT 1')
      .then(() => true)
      .catch(() => false);
    return {
      service: 'hotel-service',
      status: dbOk ? 'ok' : 'degraded',
      db: dbOk,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Search & Discovery ────────────────────────────────────────────────────

  async searchHotels(dto: SearchHotelsDto) {
    const qb = this.hotelRepo
      .createQueryBuilder('hotel')
      .leftJoinAndSelect('hotel.rooms', 'room')
      .where('hotel.isAcceptingBookings = :active', { active: true });

    if (dto.q) {
      qb.andWhere('(hotel.name ILIKE :q OR hotel.city ILIKE :q OR hotel.address ILIKE :q)', {
        q: `%${dto.q}%`,
      });
    }
    if (dto.city) {
      qb.andWhere('hotel.city ILIKE :city', { city: `%${dto.city}%` });
    }
    if (dto.starRating) {
      const stars = dto.starRating
        .split(',')
        .map(Number)
        .filter((n) => !isNaN(n));
      if (stars.length) qb.andWhere('hotel.starRating IN (:...stars)', { stars });
    }
    if (dto.amenities) {
      const amenityList = dto.amenities.split(',').map((a) => a.trim());
      amenityList.forEach((a, i) => {
        qb.andWhere(`hotel.amenities @> :amenity_${i}`, { [`amenity_${i}`]: JSON.stringify([a]) });
      });
    }
    if (dto.minGuestRating) {
      qb.andWhere('hotel.rating >= :minRating', { minRating: dto.minGuestRating });
    }
    if (dto.minPrice != null) {
      qb.andWhere('room.pricePerNight >= :minPrice', { minPrice: dto.minPrice });
    }
    if (dto.maxPrice != null) {
      qb.andWhere('room.pricePerNight <= :maxPrice', { maxPrice: dto.maxPrice });
    }
    if (dto.lat && dto.lng && dto.radius) {
      // PostGIS distance filter (simplified — requires geography column for production)
      const radiusDeg = dto.radius / 111.32; // rough km-to-degree conversion
      qb.andWhere('hotel.latitude BETWEEN :latMin AND :latMax', {
        latMin: dto.lat - radiusDeg,
        latMax: dto.lat + radiusDeg,
      });
      qb.andWhere('hotel.longitude BETWEEN :lngMin AND :lngMax', {
        lngMin: dto.lng - radiusDeg,
        lngMax: dto.lng + radiusDeg,
      });
    }

    // Sort
    switch (dto.sort) {
      case HotelSortBy.PRICE_ASC:
        qb.orderBy('room.pricePerNight', 'ASC');
        break;
      case HotelSortBy.PRICE_DESC:
        qb.orderBy('room.pricePerNight', 'DESC');
        break;
      case HotelSortBy.RATING_DESC:
        qb.orderBy('hotel.rating', 'DESC');
        break;
      case HotelSortBy.STARS_DESC:
        qb.orderBy('hotel.starRating', 'DESC');
        break;
      case HotelSortBy.REVIEWS_DESC:
        qb.orderBy('hotel.reviewCount', 'DESC');
        break;
      default:
        qb.orderBy('hotel.rating', 'DESC').addOrderBy('hotel.reviewCount', 'DESC');
        break;
    }

    const page = dto.page || 1;
    const limit = dto.limit || 20;
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    // Cache the search results
    const cacheKey = `hotel:search:${JSON.stringify(dto)}`;
    await this.redis.setJson(cacheKey, { data, total }, 300); // 5-min cache

    return { data, total, page, limit };
  }

  /**
   * `scope` is set only for a market-locked administrator; the public detail
   * page passes nothing and `assertInMarket` returns early on an undefined
   * scope, so that path is unchanged.
   *
   * The assertion sits on **both** exits. Guarding only the repository query
   * would leave the cached copy readable across markets: any request — the
   * public page included — warms `hotel:detail:<id>`, and a locked admin asking
   * for another market's hotel would then be served the whole record, rooms and
   * reviews included, without the query ever running.
   */
  async getHotelById(id: string, scope?: string) {
    // Cache-first
    const cached = await this.redis.getJson<Hotel>(`hotel:detail:${id}`);
    if (cached) {
      assertInMarket(cached.countryCode, scope, 'hotel', this.logger);
      return cached;
    }

    const hotel = await this.hotelRepo.findOne({
      where: { id },
      relations: { rooms: true, reviews: true },
    });
    if (!hotel) throw new NotFoundException(`Hotel ${id} not found`);
    assertInMarket(hotel.countryCode, scope, 'hotel', this.logger);

    await this.redis.setJson(`hotel:detail:${id}`, hotel, 600); // 10-min cache
    return hotel;
  }

  async getRoomAvailability(hotelId: string, checkin: string, checkout: string, guests: number) {
    const rooms = await this.roomRepo.find({
      where: { hotelId, status: 'ACTIVE' as any },
      order: { pricePerNight: 'ASC' },
    });

    // Check existing bookings for date overlap
    const overlappingBookings = await this.bookingRepo
      .createQueryBuilder('b')
      .select('b.roomId, COUNT(*) as booked')
      .where('b.hotelId = :hotelId', { hotelId })
      .andWhere('b.status IN (:...activeStatuses)', {
        activeStatuses: ['CONFIRMED', 'CHECKED_IN', 'MODIFIED'],
      })
      .andWhere('b."checkinDate" < :checkout AND b."checkoutDate" > :checkin', {
        checkin,
        checkout,
      })
      .groupBy('b.roomId')
      .getRawMany();

    const bookedMap = new Map(overlappingBookings.map((b) => [b.roomId, parseInt(b.booked)]));

    // Apply seasonal pricing
    const seasonalRules = await this.seasonalRepo.find({
      where: { hotelId, isActive: true },
      order: { priority: 'DESC' },
    });

    const nights = Math.ceil(
      (new Date(checkout).getTime() - new Date(checkin).getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      hotelId,
      checkin,
      checkout,
      guests,
      nights,
      rooms: rooms
        .filter((r) => r.maxGuests >= guests)
        .map((r) => {
          const booked = bookedMap.get(r.id) || 0;
          const available = r.totalInventory - booked;
          const effectivePrice = this.calculateSeasonalPrice(
            Number(r.pricePerNight),
            r.id,
            checkin,
            checkout,
            seasonalRules,
          );
          return {
            id: r.id,
            name: r.name,
            type: r.type,
            bedType: r.bedType,
            maxGuests: r.maxGuests,
            available: Math.max(0, available),
            pricePerNight: effectivePrice,
            totalPrice: effectivePrice * nights,
            currency: r.currency || 'AED',
            taxesAndFees: Math.round(effectivePrice * nights * 0.15),
            amenities: r.amenities,
            images: r.images,
          };
        }),
    };
  }

  private calculateSeasonalPrice(
    basePrice: number,
    roomId: string,
    checkin: string,
    checkout: string,
    rules: HotelSeasonalPricing[],
  ): number {
    const rule = rules.find(
      (r) =>
        (!r.roomId || r.roomId === roomId) &&
        new Date(r.startDate) <= new Date(checkin) &&
        new Date(r.endDate) >= new Date(checkout),
    );
    if (!rule) return basePrice;
    if (rule.fixedPrice) return rule.fixedPrice;
    if (rule.multiplier) return Math.round(basePrice * rule.multiplier);
    return basePrice;
  }

  // ── Booking ───────────────────────────────────────────────────────────────

  async createBooking(hotelId: string, dto: CreateBookingDto) {
    const hotel = await this.hotelRepo.findOne({ where: { id: hotelId } });
    if (!hotel) throw new NotFoundException(`Hotel ${hotelId} not found`);

    const room = await this.roomRepo.findOne({ where: { id: dto.roomId } });
    if (!room) throw new NotFoundException(`Room ${dto.roomId} not found`);

    const nights = Math.ceil(
      (new Date(dto.checkout).getTime() - new Date(dto.checkin).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (nights <= 0) throw new BadRequestException('Checkout must be after checkin');

    const nightlyRate = Number(room.pricePerNight);
    const subtotal = nightlyRate * nights * (dto.rooms || 1);
    const taxesAndFees = Math.round(subtotal * 0.15);
    const walletDiscount = dto.walletAmount || 0;
    const loyaltyDiscount = dto.loyaltyPoints ? Math.round(dto.loyaltyPoints * 0.01) : 0;
    const grandTotal = subtotal + taxesAndFees - walletDiscount - loyaltyDiscount;
    const bookingNumber = `HBK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const confirmationCode = `KS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const booking = this.bookingRepo.create({
      hotelId,
      customerId: dto.customerId,
      roomId: dto.roomId,
      bookingNumber,
      confirmationCode,
      checkinDate: dto.checkin,
      checkoutDate: dto.checkout,
      nights,
      adults: dto.guests || 2,
      roomCount: dto.rooms || 1,
      pricePerNight: nightlyRate,
      roomTotal: subtotal,
      taxAmount: taxesAndFees,
      serviceFee: 0,
      discount: walletDiscount + loyaltyDiscount,
      walletAmountUsed: walletDiscount,
      pointsRedeemed: dto.loyaltyPoints || 0,
      pointsDiscount: loyaltyDiscount,
      grandTotal,
      currency: room.currency || hotel.currency || 'AED',
      status: 'CONFIRMED',
      paymentMethod: dto.paymentMethod,
      specialRequests: dto.specialRequests,
      primaryGuest: {
        firstName: dto.guestName || '',
        lastName: '',
        email: dto.guestEmail || '',
        phone: dto.guestPhone || '',
      },
      hotelName: hotel.name,
      roomName: room.name,
      hotelCity: hotel.city,
      hotelCountryCode: hotel.countryCode,
    } as any);

    const saved = await this.bookingRepo.save(booking);
    const savedId = (saved as any).id;

    // Cache + Kafka
    await this.redis.setJson(`hotel:booking:${savedId}`, saved, 86400 * 30);
    await this.kafka.publish('hotel.booking.created', {
      id: savedId,
      customerId: dto.customerId,
      hotelId,
    });
    this.logger.log(`Booking created: ${savedId} — ${hotel.name} — ${nights} nights`);

    return { success: true, booking: saved };
  }

  async getBookingById(id: string, requester?: HotelRequester) {
    return this.findBookingFor(id, requester);
  }

  async getUserBookings(userId: string, page = 1, limit = 10) {
    const [data, total] = await this.bookingRepo.findAndCount({
      where: { customerId: userId },
      relations: { hotel: true, room: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { userId, data, total, page, limit };
  }

  /**
   * Load a booking on behalf of a requester.
   *
   * Ownership is part of the query rather than a check afterwards, so somebody
   * else's booking is indistinguishable from one that does not exist. Hotel
   * staff and admins legitimately act on bookings they did not make.
   */
  private async findBookingFor(id: string, requester?: HotelRequester) {
    const privileged = ['admin', 'super_admin', 'seller', 'hotel_owner'].includes(
      String(requester?.requesterRole ?? '').toLowerCase(),
    );
    if (!privileged && !requester?.requesterId) {
      throw new BadRequestException('A requester is required to read a booking');
    }
    const where = privileged ? { id } : { id, customerId: requester!.requesterId };
    const booking = await this.bookingRepo.findOne({
      where,
      relations: { hotel: true, room: true },
    });
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);
    return booking;
  }

  async cancelBooking(id: string, reason: string, requester?: HotelRequester) {
    const booking = await this.findBookingFor(id, requester);
    if (['CANCELLED', 'REFUNDED', 'CHECKED_OUT'].includes(booking.status)) {
      throw new BadRequestException(
        `Booking ${id} cannot be cancelled (status: ${booking.status})`,
      );
    }

    const refundAmount = this.calculateRefund(booking);
    booking.status = 'CANCELLED' as any;
    booking.cancelReason = reason;
    booking.cancelledAt = new Date();
    await this.bookingRepo.save(booking);

    // Invalidate cache
    await this.redis.del(`hotel:booking:${id}`);
    await this.kafka.publish('hotel.booking.cancelled', { id, reason, refundAmount });
    this.logger.log(`Booking cancelled: ${id} — refund: ${refundAmount}`);

    return {
      success: true,
      bookingId: id,
      status: 'CANCELLED',
      refundAmount,
      currency: booking.currency,
      refundStatus: 'PROCESSING',
    };
  }

  private calculateRefund(booking: any): number {
    const hoursUntilCheckin =
      (new Date(booking.checkinDate).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilCheckin >= 48) return Number(booking.grandTotal); // Full refund
    if (hoursUntilCheckin >= 24) return Math.round(Number(booking.grandTotal) * 0.75); // 75%
    if (hoursUntilCheckin >= 12) return Math.round(Number(booking.grandTotal) * 0.5); // 50%
    return 0; // No refund
  }

  async modifyBooking(id: string, dto: ModifyBookingDto, requester?: HotelRequester) {
    const booking = await this.findBookingFor(id, requester);
    if (!['CONFIRMED', 'MODIFIED'].includes(booking.status)) {
      throw new BadRequestException(`Booking ${id} cannot be modified (status: ${booking.status})`);
    }

    const modifications: Array<{
      field: string;
      oldValue: string;
      newValue: string;
      modifiedAt: string;
      modifiedBy: string;
    }> = [];

    if (dto.checkin && dto.checkin !== booking.checkinDate) {
      modifications.push({
        field: 'checkinDate',
        oldValue: booking.checkinDate,
        newValue: dto.checkin,
        modifiedAt: new Date().toISOString(),
        modifiedBy: 'customer',
      });
      booking.checkinDate = dto.checkin;
    }
    if (dto.checkout && dto.checkout !== booking.checkoutDate) {
      modifications.push({
        field: 'checkoutDate',
        oldValue: booking.checkoutDate,
        newValue: dto.checkout,
        modifiedAt: new Date().toISOString(),
        modifiedBy: 'customer',
      });
      booking.checkoutDate = dto.checkout;
    }
    if (dto.guests) booking.adults = dto.guests;
    if (dto.rooms) booking.roomCount = dto.rooms;
    if (dto.specialRequests !== undefined) booking.specialRequests = dto.specialRequests;

    booking.status = 'MODIFIED' as any;
    booking.modifications = [...(booking.modifications || []), ...modifications];

    await this.bookingRepo.save(booking);
    await this.redis.del(`hotel:booking:${id}`);
    await this.kafka.publish('hotel.booking.modified', { id, modifications });
    this.logger.log(`Booking modified: ${id} — ${modifications.length} change(s)`);

    return { success: true, booking };
  }

  // ── Reviews ───────────────────────────────────────────────────────────────

  async submitReview(hotelId: string, dto: SubmitReviewDto) {
    // Validate rating range (DTO validation bypassed via TCP transport)
    if (!dto.rating || dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const hotel = await this.hotelRepo.findOne({ where: { id: hotelId } });
    if (!hotel) throw new NotFoundException(`Hotel ${hotelId} not found`);

    const review = this.reviewRepo.create({
      hotelId,
      customerId: dto.userId,
      customerName: 'Guest',
      bookingId: dto.bookingId,
      rating: dto.rating,
      comment: dto.comment,
      cleanlinessRating: dto.cleanliness,
      serviceRating: dto.service,
      valueRating: dto.value,
      locationRating: dto.location,
      amenitiesRating: dto.facilities,
      stayType: dto.stayType,
      isVisible: true,
    } as any);

    const saved = await this.reviewRepo.save(review);
    const savedReviewId = (saved as any).id;

    // Recalculate hotel average rating
    const { avg, count } = await this.reviewRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(*)', 'count')
      .where('r.hotelId = :hotelId AND r.isVisible = true', { hotelId })
      .getRawOne();

    await this.hotelRepo.update(hotelId, {
      rating: parseFloat(avg) || 0,
      reviewCount: parseInt(count) || 0,
    });
    await this.redis.del(`hotel:detail:${hotelId}`);
    await this.kafka.publish('hotel.review.submitted', { id: savedReviewId, hotelId });

    return { success: true, review: saved };
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  /**
   * `countryCode` is the caller's market, forwarded by the gateway as `scope`
   * for a region-locked administrator and left undefined for a global one.
   * Without it the Qatar admin's hotel list was the whole platform's.
   */
  async getAllHotels(page = 1, limit = 20, status?: string, countryCode?: string) {
    const where: any = {};
    if (status) where.status = status;
    // `requireMarket`: a truthiness gate on a `where`-object assignment DROPS
    // the key for a market it cannot read, and a `findAndCount` with no market
    // key returns every market. Same class as the five R2-1 sites, found by the
    // uniqueness spec's new where-object test rather than by review.
    const market = requireMarket(countryCode, 'hotels', this.logger);
    if (market) where.countryCode = market;

    const [data, total] = await this.hotelRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: { rooms: true },
    });
    return { data, total, page, limit };
  }

  async approveHotel(id: string, scope?: string) {
    const hotel = await this.hotelRepo.findOne({ where: { id } });
    if (!hotel) throw new NotFoundException(`Hotel ${id} not found`);
    assertInMarket(hotel.countryCode, scope, 'hotel', this.logger);

    hotel.status = 'ACTIVE' as any;
    hotel.isAcceptingBookings = true;
    await this.hotelRepo.save(hotel);
    await this.redis.del(`hotel:detail:${id}`);
    await this.kafka.publish('hotel.approved', { id });

    return { success: true, hotelId: id, status: 'ACTIVE' };
  }

  /**
   * The hotel is loaded before the update rather than suspended blind: a
   * decision has to be checked against the hotel's own market, and an `update`
   * by id alone cannot be. A suspension of a hotel that does not exist now says
   * so instead of reporting success.
   */
  async suspendHotel(id: string, reason?: string, scope?: string) {
    const hotel = await this.hotelRepo.findOne({
      where: { id },
      select: { id: true, countryCode: true },
    });
    if (!hotel) throw new NotFoundException(`Hotel ${id} not found`);
    assertInMarket(hotel.countryCode, scope, 'hotel', this.logger);

    await this.hotelRepo.update(id, { status: 'SUSPENDED' as any, isAcceptingBookings: false });
    await this.redis.del(`hotel:detail:${id}`);
    return { success: true, hotelId: id, status: 'SUSPENDED', reason };
  }

  async blockHotel(id: string) {
    await this.hotelRepo.update(id, { status: 'BLOCKED' as any, isAcceptingBookings: false });
    await this.redis.del(`hotel:detail:${id}`);
    return { success: true, hotelId: id, status: 'BLOCKED' };
  }

  async setCommission(hotelId: string, rate: number) {
    await this.hotelRepo.update(hotelId, { commissionRate: rate });
    await this.redis.del(`hotel:detail:${hotelId}`);
    return { success: true, hotelId, commissionRate: rate };
  }

  /**
   * Platform statistics for one market, or all of them.
   *
   * This refused every scoped caller because `hotel_reviews` carries only
   * `hotelId` and a half-scoped report is worse than none (audit F-30). The
   * join is one hop: `hotel_reviews -> hotels.countryCode`. Bookings need no
   * join at all — `hotel_bookings.hotelCountryCode` is a snapshot written at
   * booking time precisely so reports can be attributed without one.
   *
   * `undefined` means every market, exactly as `scope` does everywhere else.
   * Every leg carries the predicate: a report where one counter is the
   * platform's and the rest are the market's is the failure this replaces.
   */
  async getAdminAnalytics(market?: string) {
    // `requireMarket`, not `normaliseMarket`: this field carries the market the
    // gateway resolved for the caller, which for a region-locked admin IS their
    // lock. `normaliseMarket` returns `undefined` for a code it cannot read, and
    // every predicate below then disappears — the platform's numbers under one
    // market's heading (R3-1).
    const m = requireMarket(market, 'hotel analytics', this.logger);
    const hotelWhere = m ? { countryCode: m } : {};
    const totalHotels = await this.hotelRepo.count({ where: hotelWhere });
    const activeHotels = await this.hotelRepo.count({
      where: { ...hotelWhere, isAcceptingBookings: true },
    });

    const bookingQb = this.bookingRepo.createQueryBuilder('b');
    applyMarketFilter(bookingQb, 'b.hotelCountryCode', m);
    const totalBookings = await bookingQb.getCount();

    const cancelledQb = this.bookingRepo
      .createQueryBuilder('b')
      .where('b.status = :status', { status: 'CANCELLED' });
    applyMarketFilter(cancelledQb, 'b.hotelCountryCode', m);
    const cancelledBookings = await cancelledQb.getCount();

    const revenueQb = this.bookingRepo
      .createQueryBuilder('b')
      .select('COALESCE(SUM(b.grandTotal), 0)', 'total')
      .where('b.status IN (:...statuses)', {
        statuses: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'COMPLETED'],
      });
    applyMarketFilter(revenueQb, 'b.hotelCountryCode', m);
    const revenueResult = await revenueQb.getRawOne<{ total: string }>();

    // Reviews reach a market through their hotel. Counted and averaged in one
    // query over that join rather than loaded and reduced: `avgRating` was a
    // hard-coded 0 with a comment promising it would be computed, which reads
    // on screen as "every hotel in this market is unrated".
    const reviewQb = this.reviewRepo
      .createQueryBuilder('r')
      .leftJoin(Hotel, 'h', 'h.id = r.hotelId');
    applyMarketFilter(reviewQb, 'h.countryCode', m);
    const totalReviews = await reviewQb.getCount();
    const ratingRow = await this.reviewRepo
      .createQueryBuilder('r')
      .leftJoin(Hotel, 'h', 'h.id = r.hotelId')
      .select('AVG(r.rating)', 'average');
    applyMarketFilter(ratingRow, 'h.countryCode', m);
    const rating = await ratingRow.getRawOne<{ average: string | null }>();

    return {
      market: m ?? null,
      totalHotels,
      activeHotels,
      pendingApprovals: totalHotels - activeHotels,
      totalBookings,
      cancelledBookings,
      cancelRate:
        totalBookings > 0 ? `${((cancelledBookings / totalBookings) * 100).toFixed(1)}%` : '0%',
      totalRevenue: Number(revenueResult?.total ?? 0) || 0,
      totalReviews,
      avgRating:
        rating?.average == null ? null : Math.round((Number(rating.average) || 0) * 10) / 10,
    };
  }

  /**
   * Scoped on the booking's own `hotelCountryCode` snapshot rather than through
   * a join: the column is written at booking time precisely so reports like
   * this one can be attributed to a market without one.
   */
  async getAdminFraudAnalytics(countryCode?: string) {
    // Flag suspicious patterns
    const cancellationsQb = this.bookingRepo
      .createQueryBuilder('b')
      .select('b.customerId, COUNT(*) as cancelCount')
      .where('b.status = :status', { status: 'CANCELLED' })
      .andWhere('b.cancelledAt >= :since', {
        since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      });
    if (countryCode) cancellationsQb.andWhere('b.hotelCountryCode = :cc', { cc: countryCode });
    const sameDayCancellations = await cancellationsQb
      .groupBy('b.customerId')
      .having('COUNT(*) > 3')
      .getRawMany();

    const noShowsQb = this.bookingRepo
      .createQueryBuilder('b')
      .where('b.status = :status AND b.grandTotal > :threshold', {
        status: 'NO_SHOW',
        threshold: 5000,
      });
    if (countryCode) noShowsQb.andWhere('b.hotelCountryCode = :cc', { cc: countryCode });
    const highValueNoShows = await noShowsQb.getCount();

    return {
      flaggedCustomers: sameDayCancellations.length,
      highValueNoShows,
      sameDayCancellations,
      riskScore:
        sameDayCancellations.length > 5
          ? 'HIGH'
          : sameDayCancellations.length > 2
            ? 'MEDIUM'
            : 'LOW',
    };
  }

  async getComplianceData(countryCode?: string) {
    const hotels = await this.hotelRepo.find({
      where: countryCode ? { countryCode } : {},
      select: {
        id: true,
        name: true,
        city: true,
        countryCode: true,
        licenseNumber: true,
        licenseExpiry: true,
        isAcceptingBookings: true,
      },
    });
    const expiringLicenses = hotels.filter((h) => {
      if (!h.licenseExpiry) return true;
      const daysUntilExpiry =
        (new Date(h.licenseExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysUntilExpiry < 90;
    });
    return {
      totalHotels: hotels.length,
      expiringLicenses: expiringLicenses.length,
      hotels: expiringLicenses,
    };
  }

  // ── Hotel Owner ───────────────────────────────────────────────────────────

  async registerHotelOwner(dto: RegisterOwnerDto) {
    const owner = this.ownerRepo.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      businessName: dto.businessName,
      countryCode: dto.country,
      taxNumber: dto.taxId,
      status: 'PENDING_VERIFICATION',
    } as any);

    const saved = await this.ownerRepo.save(owner);
    const savedOwnerId = (saved as any).id;
    await this.kafka.publish('hotel.owner.registered', { id: savedOwnerId });
    return { success: true, owner: saved };
  }

  async createHotel(ownerId: string, dto: CreateHotelDto) {
    const hotel = this.hotelRepo.create({
      ...dto,
      ownerId,
      status: 'PENDING_APPROVAL',
      isAcceptingBookings: false,
      latitude: dto.location?.lat,
      longitude: dto.location?.lng,
    } as any);
    const saved = await this.hotelRepo.save(hotel);
    return { success: true, hotel: saved };
  }

  async updateHotel(id: string, dto: Partial<CreateHotelDto>) {
    await this.hotelRepo.update(id, dto as any);
    await this.redis.del(`hotel:detail:${id}`);
    return { success: true, hotelId: id };
  }

  async addRoom(hotelId: string, dto: any) {
    const room = this.roomRepo.create({ ...dto, hotelId } as any);
    const saved = await this.roomRepo.save(room);
    await this.redis.del(`hotel:detail:${hotelId}`);
    return { success: true, room: saved };
  }

  async updateRoomPricing(roomId: string, dto: UpdatePricingDto) {
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) throw new NotFoundException(`Room ${roomId} not found`);

    if (dto.basePrice != null) room.pricePerNight = dto.basePrice;
    if (dto.rackPrice != null) room.rackRate = dto.rackPrice;
    await this.roomRepo.save(room);

    // Handle seasonal rules
    if (dto.seasonalRules?.length) {
      for (const rule of dto.seasonalRules) {
        const seasonalPricing = this.seasonalRepo.create({
          hotelId: room.hotelId,
          roomId: room.id,
          name: rule.name,
          startDate: rule.startDate,
          endDate: rule.endDate,
          multiplier: rule.multiplier,
          fixedPrice: rule.fixedPrice,
          isActive: true,
        } as any);
        await this.seasonalRepo.save(seasonalPricing);
      }
    }

    await this.redis.del(`hotel:detail:${room.hotelId}`);
    return { success: true, roomId, basePrice: room.pricePerNight, rackPrice: room.rackRate };
  }

  async bulkUpdatePricing(hotelId: string, roomIds: string[], dto: UpdatePricingDto) {
    const results: any[] = [];
    for (const roomId of roomIds) {
      const result = await this.updateRoomPricing(roomId, dto);
      results.push(result);
    }
    return { success: true, updated: results.length, results };
  }

  async updateRoomAvailability(roomId: string, dto: { date: string; available: number }) {
    // Store daily availability overrides in Redis for fast lookup
    const cacheKey = `hotel:room:avail:${roomId}:${dto.date}`;
    await this.redis.setJson(cacheKey, { available: dto.available }, 86400 * 90);
    return { success: true, roomId, date: dto.date, available: dto.available };
  }

  async getOwnerDashboard(ownerId: string) {
    const hotels = await this.hotelRepo.find({ where: { ownerId } });
    const hotelIds = hotels.map((h) => h.id);

    if (hotelIds.length === 0) {
      return { ownerId, hotels: [] as unknown[], totalBookings: 0, revenue: 0 };
    }

    const todayBookings = await this.bookingRepo.count({
      where: { hotelId: In(hotelIds), status: In(['CONFIRMED', 'CHECKED_IN'] as any) },
    });

    const revenueResult = await this.bookingRepo
      .createQueryBuilder('b')
      .select('SUM(b.grandTotal)', 'total')
      .where('b.hotelId IN (:...ids)', { ids: hotelIds })
      .andWhere('b.status IN (:...statuses)', {
        statuses: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'COMPLETED'],
      })
      .getRawOne();

    const reviewStats = await this.reviewRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(*)', 'count')
      .where('r.hotelId IN (:...ids)', { ids: hotelIds })
      .getRawOne();

    const payoutResult = await this.payoutRepo
      .createQueryBuilder('p')
      .select('SUM(p.netAmount)', 'pending')
      .where('p.hotelId IN (:...ids) AND p.status = :status', {
        ids: hotelIds,
        status: 'PROCESSING',
      })
      .getRawOne();

    return {
      ownerId,
      hotelCount: hotels.length,
      todayBookings,
      revenue: revenueResult?.total || 0,
      averageRating: parseFloat(reviewStats?.avg) || 0,
      totalReviews: parseInt(reviewStats?.count) || 0,
      pendingPayouts: payoutResult?.pending || 0,
    };
  }

  async getOwnerPayouts(ownerId: string, page = 1, limit = 10) {
    const hotels = await this.hotelRepo.find({ where: { ownerId }, select: { id: true } });
    const hotelIds = hotels.map((h) => h.id);

    if (hotelIds.length === 0) return { ownerId, data: [], total: 0, page, limit };

    const [data, total] = await this.payoutRepo.findAndCount({
      where: { hotelId: In(hotelIds) },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { ownerId, data, total, page, limit };
  }

  async getOwnerBookings(ownerId: string, page = 1, limit = 20) {
    const hotels = await this.hotelRepo.find({ where: { ownerId }, select: { id: true } });
    const hotelIds = hotels.map((h) => h.id);

    if (hotelIds.length === 0) return { data: [], total: 0, page, limit };

    const [data, total] = await this.bookingRepo.findAndCount({
      where: { hotelId: In(hotelIds) },
      relations: { hotel: true, room: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async getOwnerReviews(ownerId: string) {
    const hotels = await this.hotelRepo.find({ where: { ownerId }, select: { id: true } });
    const hotelIds = hotels.map((h) => h.id);
    if (hotelIds.length === 0) return { data: [], total: 0 };

    const [data, total] = await this.reviewRepo.findAndCount({
      where: { hotelId: In(hotelIds) },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return { data, total };
  }

  async replyToReview(reviewId: string, reply: string) {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException(`Review ${reviewId} not found`);

    review.hotelReply = reply;
    review.repliedAt = new Date();
    await this.reviewRepo.save(review);
    return { success: true, reviewId };
  }

  // ── No-Show Management ────────────────────────────────────────────────────

  async markNoShow(bookingId: string) {
    const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException(`Booking ${bookingId} not found`);

    booking.status = 'NO_SHOW' as any;
    await this.bookingRepo.save(booking);
    await this.redis.del(`hotel:booking:${bookingId}`);
    await this.kafka.publish('hotel.booking.noshow', { id: bookingId, hotelId: booking.hotelId });

    return { success: true, bookingId, status: 'NO_SHOW' };
  }

  // ── Webhook Processing ────────────────────────────────────────────────────

  async processPaymentWebhook(dto: WebhookPaymentDto) {
    const booking = await this.bookingRepo.findOne({ where: { id: dto.bookingId } });
    if (!booking) {
      this.logger.warn(`Payment webhook for unknown booking: ${dto.bookingId}`);
      return { success: false, message: 'Booking not found' };
    }

    if (dto.status === PaymentWebhookStatus.SUCCESS) {
      booking.paymentStatus = 'PAID' as any;
      booking.paymentTransactionId = dto.transactionId;
    } else if (dto.status === PaymentWebhookStatus.FAILED) {
      booking.paymentStatus = 'FAILED' as any;
      booking.status = 'PAYMENT_FAILED' as any;
    }

    await this.bookingRepo.save(booking);
    await this.redis.del(`hotel:booking:${dto.bookingId}`);
    await this.kafka.publish('hotel.payment.processed', {
      bookingId: dto.bookingId,
      status: dto.status,
      transactionId: dto.transactionId,
    });

    this.logger.log(`Payment processed: ${dto.bookingId} — ${dto.status}`);
    return { success: true, bookingId: dto.bookingId, paymentStatus: dto.status };
  }

  async processRefundWebhook(dto: WebhookRefundDto) {
    const booking = await this.bookingRepo.findOne({ where: { id: dto.bookingId } });
    if (!booking) {
      this.logger.warn(`Refund webhook for unknown booking: ${dto.bookingId}`);
      return { success: false, message: 'Booking not found' };
    }

    if (dto.status === PaymentWebhookStatus.REFUNDED) {
      booking.status = 'REFUNDED' as any;
      booking.refundAmount = dto.refundAmount;
    }

    await this.bookingRepo.save(booking);
    await this.redis.del(`hotel:booking:${dto.bookingId}`);
    await this.kafka.publish('hotel.refund.processed', {
      bookingId: dto.bookingId,
      refundAmount: dto.refundAmount,
    });

    return { success: true, bookingId: dto.bookingId, refundStatus: dto.status };
  }

  // ── Get Hotel Reviews ───────────────────────────────────────────────────

  async getHotelReviews(hotelId: string, page = 1, limit = 10) {
    const cacheKey = `hotel:reviews:${hotelId}:${page}:${limit}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [reviews, total] = await this.reviewRepo.findAndCount({
      where: { hotel: { id: hotelId } },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: {},
    });

    const result = { reviews, total, page, limit, pages: Math.ceil(total / limit) };
    await this.redis.set(cacheKey, JSON.stringify(result), 300); // 5m cache
    return result;
  }
}
