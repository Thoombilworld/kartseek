import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UsePipes,
  ValidationPipe,
  UseFilters,
  ForbiddenException,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { HotelService } from '../hotel.service';
import { RegisterOwnerDto } from '../dto/register-owner.dto';
import { CreateHotelDto } from '../dto/create-hotel.dto';
import { UpdatePricingDto } from '../dto/update-pricing.dto';
import { type EmptyMessage, RpcAwareExceptionsFilter } from '@app/common';

/**
 * The hotel owner portal's backend.
 *
 * ── The TCP patterns are the real surface; the HTTP routes refuse ───────────
 *
 * Every `@MessagePattern` below is reached through the gateway, which
 * authenticates the caller, checks `@Roles(UserRole.SELLER)` +
 * `@SellerModule('hotel')` and stamps the VERIFIED JWT SUBJECT as `ownerId`
 * after the body spread, so a client-supplied value cannot survive (round 1b
 * and 1c).
 *
 * The `@Get`/`@Post`/`@Put` routes in this class are a different surface
 * entirely: hotel-service's own HTTP port (`:3035`), which binds no guard of any
 * kind. They took `ownerId` from a query parameter or a body — so anyone who
 * could reach the port could read any owner's payouts and bookings, reprice any
 * property's rooms, void any booking and answer any guest's review by naming the
 * owner they wanted to be. That is the same hole round 1c closed at the gateway,
 * one layer underneath it, and leaving these acting would have made the fix a
 * formality.
 *
 * They now REFUSE (`noVerifiedOwner`) rather than act. The routes stay
 * registered so M8's surface pass still sees them when it closes the port, and
 * because deleting a route is a different decision from disarming one — but
 * nothing on this surface can establish who is calling, and after this round
 * every owner action requires a subject that only the gateway can supply.
 *
 * Nothing called them: a repository-wide search for `:3035/owner` and for these
 * paths outside this file found no caller in `apps/`, `packages/`, `modules/` or
 * `scripts/`.
 */
@UseFilters(RpcAwareExceptionsFilter)
@Controller('owner')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class HotelOwnerController {
  constructor(private readonly svc: HotelService) {}

  /**
   * This surface has no authenticated caller, so it has no owner — and an owner
   * action without a verified owner is the defect, not the request.
   */
  private noVerifiedOwner(): never {
    throw new ForbiddenException(
      'Hotel owner actions must be made through the API gateway, which verifies who is calling.',
    );
  }

  @Post('register')
  register(@Body() _dto: RegisterOwnerDto) {
    return this.noVerifiedOwner();
  }

  @Post('hotels')
  createHotel(@Body() _dto: CreateHotelDto) {
    return this.noVerifiedOwner();
  }

  @Put('hotels/:id')
  updateHotel(@Param('id') _id: string, @Body() _dto: Partial<CreateHotelDto>) {
    return this.noVerifiedOwner();
  }

  @Post('hotels/:id/rooms')
  addRoom(@Param('id') _hotelId: string, @Body() _dto: unknown) {
    return this.noVerifiedOwner();
  }

  @Put('rooms/:id/pricing')
  updatePricing(@Param('id') _roomId: string, @Body() _dto: UpdatePricingDto) {
    return this.noVerifiedOwner();
  }

  @Put('rooms/:id/availability')
  updateAvailability(@Param('id') _roomId: string, @Body() _dto: unknown) {
    return this.noVerifiedOwner();
  }

  @Put('hotels/:id/bulk-pricing')
  bulkPricing(@Param('id') _hotelId: string, @Body() _dto: unknown) {
    return this.noVerifiedOwner();
  }

  @Get('dashboard')
  getDashboard(@Query('ownerId') _ownerId: string) {
    return this.noVerifiedOwner();
  }

  @Get('bookings')
  getBookings(@Query('ownerId') _ownerId: string) {
    return this.noVerifiedOwner();
  }

  @Get('payouts')
  getPayouts(@Query('ownerId') _ownerId: string) {
    return this.noVerifiedOwner();
  }

  @Get('reviews')
  getReviews(@Query('ownerId') _ownerId: string) {
    return this.noVerifiedOwner();
  }

  @Post('reviews/:id/reply')
  replyToReview(@Param('id') _reviewId: string, @Body('reply') _reply: string) {
    return this.noVerifiedOwner();
  }

  @Put('bookings/:id/no-show')
  markNoShow(@Param('id') _bookingId: string) {
    return this.noVerifiedOwner();
  }

  // ── Microservice MessagePatterns (Owner) ──────────────────────────────────
  //
  // `ownerId` on every payload below is the VERIFIED JWT SUBJECT, stamped by the
  // gateway after the spread so a client-supplied value cannot survive
  // (`hotel.controller.ts`, round 1c). It is never a query parameter: it used to
  // be, and `?ownerId=<someone else>` was all it took to read another owner's
  // payouts, bookings and reviews.
  //
  // The five by-id writes take it too, because a filter cannot help them — each
  // addresses one record, and `HotelService.hotelOwnedBy` proves the record's
  // property belongs to the caller before anything is written.
  @MessagePattern({ cmd: 'register_hotel_owner' })
  msgRegister(@Payload() d: EmptyMessage) {
    return this.svc.registerHotelOwner(d, d?.ownerId);
  }

  @MessagePattern({ cmd: 'create_hotel' })
  msgCreateHotel(@Payload() d: EmptyMessage) {
    return this.svc.createHotel(d.ownerId, d);
  }

  @MessagePattern({ cmd: 'update_hotel' })
  msgUpdateHotel(@Payload() d: EmptyMessage) {
    return this.svc.updateHotel(d.hotelId, d, d?.ownerId);
  }

  @MessagePattern({ cmd: 'get_owner_dashboard' })
  msgDashboard(@Payload() d: EmptyMessage) {
    return this.svc.getOwnerDashboard(d.ownerId);
  }

  @MessagePattern({ cmd: 'get_owner_bookings' })
  msgOwnerBookings(@Payload() d: EmptyMessage) {
    return this.svc.getOwnerBookings(d.ownerId, d.page, d.limit);
  }

  @MessagePattern({ cmd: 'update_room_pricing' })
  msgPricing(@Payload() d: EmptyMessage) {
    return this.svc.updateRoomPricing(d.roomId, d, d?.ownerId);
  }

  @MessagePattern({ cmd: 'bulk_update_pricing' })
  msgBulkPricing(@Payload() d: EmptyMessage) {
    return this.svc.bulkUpdatePricing(d.hotelId, d.roomIds, d.pricing, d?.ownerId);
  }

  @MessagePattern({ cmd: 'mark_no_show' })
  msgNoShow(@Payload() d: EmptyMessage) {
    return this.svc.markNoShow(d.bookingId, d?.ownerId);
  }

  @MessagePattern({ cmd: 'get_owner_payouts' })
  msgPayouts(@Payload() d: EmptyMessage) {
    return this.svc.getOwnerPayouts(d.ownerId, d.page, d.limit);
  }

  @MessagePattern({ cmd: 'get_owner_reviews' })
  msgReviews(@Payload() d: EmptyMessage) {
    return this.svc.getOwnerReviews(d.ownerId);
  }

  @MessagePattern({ cmd: 'reply_to_review' })
  msgReply(@Payload() d: EmptyMessage) {
    return this.svc.replyToReview(d.reviewId, d.reply, d?.ownerId);
  }
}
