import {
  Controller, Post, Get, Param, Body, Inject, Req, UseGuards,
  UnauthorizedException, ForbiddenException, ServiceUnavailableException, HttpException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, lastValueFrom, timeout } from 'rxjs';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/security';

/**
 * Seller business registration — `POST /sellers/register`.
 *
 * Creates the `marketplace.sellers` row for the signed-in user. The user account
 * itself is created earlier by `POST /auth/seller/register`; this is the second
 * half, where the business details and KYC are submitted for admin approval.
 *
 * SECURITY — this route used to be unauthenticated and took `ownerId` straight
 * from the request body, which it forwarded to marketplace-service. That service
 * refuses to register a seller without an owner precisely so a seller row is
 * always bound to a real user, but the check was trivially satisfied by naming
 * any user id in the JSON. An unauthenticated caller could therefore mint seller
 * accounts owned by anybody — verified against a running gateway, which returned
 * 201 and persisted the row. `SellerOwnershipGuard` authorises every other seller
 * route on exactly that `owner_id`, so this was the one place the whole seller
 * authorisation model could be written to from outside.
 *
 * The owner is now taken from the verified JWT subject and a body-supplied
 * `ownerId` is discarded rather than trusted.
 */
@ApiTags('🏪 Seller Registration')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('sellers')
export class PublicSellersController {
  private static readonly REGISTER_TIMEOUT_MS = 8000;

  constructor(
    @Inject('SELLER_SERVICE') private readonly sellerClient: ClientProxy,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register the signed-in user as a marketplace seller' })
  async register(@Req() req: any, @Body() dto: any) {
    const ownerId = req?.user?.id ?? req?.user?.userId ?? req?.user?.sub;
    if (!ownerId) {
      throw new UnauthorizedException(
        'Sign in before registering a seller account — the seller is bound to your user id.',
      );
    }

    // Whatever the client sent under `ownerId` is dropped on the floor.
    const { ownerId: _ignored, ...payload } = dto ?? {};

    try {
      return await lastValueFrom(
        this.sellerClient
          .send({ cmd: 'register_seller' }, { ...payload, ownerId })
          .pipe(timeout(PublicSellersController.REGISTER_TIMEOUT_MS)),
      );
    } catch (err: any) {
      // A validation failure downstream (missing owner name, an account this
      // user already has) is the applicant's problem to fix and must reach them
      // as such. Collapsing everything into 503 "service unavailable" is what
      // made a correctly filled-in registration form look like an outage.
      //
      // `statusCode` is read FIRST because that is the field
      // `RpcAwareExceptionsFilter` actually emits across the TCP hop. This read
      // `err.status`, which on an RPC error is the *string* `'error'` — never a
      // number — so the numeric check below could never pass and every 400 and
      // 409 was still reported as a 503. `sendToMarketplace` in the marketplace
      // controller already had this right; the fix had not been applied here.
      const status = err?.statusCode ?? err?.status ?? err?.error?.statusCode;
      const message = err?.message ?? err?.error?.message;
      if (typeof status === 'number' && status >= 400 && status < 500) {
        throw new HttpException(
          { success: false, message: message ?? 'Seller registration was rejected.' },
          status,
        );
      }
      throw new ServiceUnavailableException(
        'Seller registration is temporarily unavailable. Please try again.',
      );
    }
  }

  /**
   * The signed-in user's own seller application.
   *
   * Declared BEFORE `:sellerId/application-status` on purpose: Nest matches in
   * declaration order, so a `:sellerId` route registered first would capture
   * the literal `me` and look up a seller whose id is the string "me".
   *
   * Sign-in sends an unapproved seller here, and it cannot pass an id — the JWT
   * carries the *user* id, and a seller's own id is a different value. So the
   * seller is resolved from `owner_id`, the same column every other seller route
   * authorises on.
   */
  @Get('me/application-status')
  @ApiOperation({ summary: "The signed-in user's own seller application" })
  async myApplicationStatus(@Req() req: any) {
    const userId = req?.user?.id ?? req?.user?.userId ?? req?.user?.sub;
    if (!userId) throw new UnauthorizedException('Sign in to view your application.');

    let seller: any;
    try {
      seller = await firstValueFrom(
        this.sellerClient.send({ cmd: 'get_seller_by_owner' }, { ownerId: userId })
          .pipe(timeout(PublicSellersController.REGISTER_TIMEOUT_MS)),
      );
    } catch {
      throw new ServiceUnavailableException('Application status is temporarily unavailable.');
    }

    // No seller row is a real answer, not an error: this account has signed up
    // but not yet registered a business.
    if (!seller?.id) return { application: null };

    return {
      application: {
        id: seller.id,
        businessName: seller.businessName ?? null,
        storeSlug: seller.storeSlug ?? null,
        countryCode: seller.countryCode ?? null,
        verificationStatus: seller.status ?? null,
        kycStatus: seller.kycStatus ?? null,
        submittedAt: seller.joinedAt ?? null,
      },
    };
  }

  /**
   * The applicant's own approval status.
   *
   * Every other `/sellers/:sellerId/*` route lives on `SellerMarketplaceController`
   * behind `SellerApprovalGuard`, which refuses anyone whose `verificationStatus`
   * is not APPROVED. That is right for trading routes and wrong for this one: a
   * PENDING applicant is exactly who needs to read their own application, and
   * `GET /sellers/:id/profile` answered them 403.
   *
   * The web approval page called that route, caught the 403, and rendered
   * invented content in its place — a business name it had hard-coded, a
   * document checklist with items marked "verified", and a submission
   * timestamp. Applicants were shown a convincing status page about an
   * application nobody had looked at.
   *
   * So this is a deliberately narrow read: lifecycle fields only, nothing
   * tradeable, and only for the owner (or an admin). It does not sit behind the
   * approval guard because being un-approved is the state it exists to report.
   */
  @Get(':sellerId/application-status')
  @ApiOperation({ summary: "Lifecycle status of the caller's own seller application" })
  async applicationStatus(@Req() req: any, @Param('sellerId') sellerId: string) {
    const userId = req?.user?.id ?? req?.user?.userId ?? req?.user?.sub;
    if (!userId) throw new UnauthorizedException('Sign in to view your application.');

    const role = String(req?.user?.role ?? '').toUpperCase();
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

    if (!isAdmin) {
      // Ownership is checked against the same `owner_id` every other seller
      // route authorises on, so this cannot be used to read someone else's
      // application by naming its id.
      let ownerId: string | null;
      try {
        const res: any = await firstValueFrom(
          this.sellerClient.send({ cmd: 'get_seller_owner' }, { sellerId })
            .pipe(timeout(PublicSellersController.REGISTER_TIMEOUT_MS)),
        );
        ownerId = res?.ownerId ?? null;
      } catch {
        throw new ServiceUnavailableException('Application status is temporarily unavailable.');
      }
      if (!ownerId || ownerId !== userId) {
        throw new ForbiddenException('This application does not belong to you.');
      }
    }

    let profile: any;
    try {
      profile = await firstValueFrom(
        this.sellerClient.send({ cmd: 'get_seller_profile' }, { sellerId })
          .pipe(timeout(PublicSellersController.REGISTER_TIMEOUT_MS)),
      );
    } catch {
      throw new ServiceUnavailableException('Application status is temporarily unavailable.');
    }
    if (!profile?.id) throw new ForbiddenException('This application does not belong to you.');

    // Only what a status page needs. No listings, payouts or bank details.
    return {
      id: profile.id,
      businessName: profile.businessName ?? null,
      storeSlug: profile.storeSlug ?? null,
      countryCode: profile.countryCode ?? null,
      verificationStatus: profile.status ?? profile.verificationStatus ?? null,
      kycStatus: profile.kycStatus ?? null,
      submittedAt: profile.joinedAt ?? profile.createdAt ?? null,
    };
  }
}
