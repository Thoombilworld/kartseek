import {
  Controller,
  Post,
  Req,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  UseGuards,
  Inject,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiPayloadTooLargeResponse,
  ApiBadGatewayResponse,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole, rpcCatch } from '@app/common';
import { KycUploadResponseDto, ProfileImageUploadDto, ErrorResponseDto } from '../dto/gateway.dto';
import { generateFileKey, JwtAuthGuard } from '@app/security';
import { StorageService } from '@app/storage';
import { resolveScope } from '../guards/market-scope';

@ApiTags('📁 Uploads')
@ApiBearerAuth('JWT')
@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(
    private readonly storage: StorageService,
    // The KYC queue is admin-service's (Redis keys `admin:kyc:pending:*`), so
    // the record this upload writes goes through admin-service rather than the
    // gateway reaching into another service's keyspace. Not optional: a
    // missing client must fail at boot, not as an upload that stores a document
    // no queue can see.
    @Inject('ADMIN_SERVICE') private readonly adminClient: ClientProxy,
  ) {}

  /** @see resolveScope — the shared implementation. */
  private scopeOf(req: any, requested?: string, what = 'that market') {
    return resolveScope(req, requested, what);
  }

  /**
   * A storage failure is a 502, named.
   *
   * Every provider inside `StorageService` used to `catch` a failed write and
   * return a plausible CDN URL, so this controller's `await` resolved whatever
   * happened and every upload here reported success for an object that did not
   * exist (re-review RF-1). The providers throw now, which makes mapping the
   * failure this controller's job: the seam is named, nothing is recorded, and
   * the client is told to retry rather than handed a key that resolves to
   * nothing.
   */
  private storageFailure(what: string, error: unknown): HttpException {
    const detail = (error as Error)?.message ?? 'unknown storage error';
    this.logger.error(`[storage-write-failed] what="${what}" error="${detail}"`);
    return new HttpException(
      `The document store did not accept ${what} (${detail}). Nothing was recorded — please retry.`,
      HttpStatus.BAD_GATEWAY,
    );
  }

  /**
   * The public seam, with the failure mapped. Used by the five image uploads —
   * a product photo that did not store is a 502 too, not a URL to an object
   * that was never written.
   */
  private async storePublic(
    folder: string,
    key: string,
    body: Buffer,
    contentType: string,
    what: string,
  ): Promise<string> {
    try {
      return await this.storage.upload(folder, key, body, contentType);
    } catch (error) {
      throw this.storageFailure(what, error);
    }
  }

  @Post('kyc-document')
  @Roles(UserRole.SELLER, UserRole.DRIVER)
  @UseInterceptors(FileInterceptor('document'))
  @ApiOperation({
    summary: 'Upload KYC document',
    description:
      'Accepts PDF, PNG, JPG, or JPEG files up to 5 MB. ' +
      'The file is stored on the PRIVATE storage seam (`StorageService.storePrivate`) under ' +
      '`kyc/<user>/<uuid>.<ext>`: no public ACL, no CDN, no caching. The response carries that ' +
      'opaque object key and never a URL — the only way back to the bytes is ' +
      '`GET /admin/kyc/documents/:key`, which requires an admin role, `kyc.view`, and the ' +
      "applicant's own market. " +
      'The upload also records the pending review row the approval queue reads ' +
      '(`admin:kyc:pending:<entityType>:<userId>`), carrying the key, owner, market, MIME type ' +
      'and size. A failed store or a failed queue write answers 502/503 and records nothing. ' +
      '**Requires role: SELLER or DRIVER.**',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'KYC document file (PDF / JPG / PNG, max 5 MB)',
    schema: {
      type: 'object',
      required: ['document'],
      properties: {
        document: {
          type: 'string',
          format: 'binary',
          description: 'Government-issued ID, business registration, or license scan',
        },
      },
    },
  })
  @ApiCreatedResponse({
    type: KycUploadResponseDto,
    description: 'Document uploaded and queued for review',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Invalid file type (only PDF/PNG/JPG allowed)',
  })
  @ApiPayloadTooLargeResponse({ description: 'File exceeds 5 MB limit' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Role SELLER or DRIVER required' })
  @ApiBadGatewayResponse({
    type: ErrorResponseDto,
    description: 'The private document store rejected the write — nothing was stored or queued',
  })
  @ApiServiceUnavailableResponse({
    type: ErrorResponseDto,
    description:
      'The document was stored but the review queue could not be written; the object is removed ' +
      'again, so the submission is not half-recorded',
  })
  async uploadKycDocument(
    @Req() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }),
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|pdf)' }),
        ],
      }),
    )
    file: any,
  ): Promise<KycUploadResponseDto> {
    // An identity document is PRIVATE, and the store either happens or the
    // request fails.
    //
    // History, because two fixes landed here and the first one was wrong. The
    // original handler validated the file, minted an opaque reference,
    // discarded `file.buffer` and answered "KYC Document securely uploaded to
    // object storage." — nothing was uploaded, nothing recorded it, and the
    // applicant whose identity document it was had been told otherwise on a
    // compliance path (whole-branch review, MUST FIX 9). The fix wave then
    // routed it through `StorageService.upload`, which is the platform's
    // PUBLIC seam: GCS saves those objects with `public: true`, S3 and R2 stamp
    // a public immutable `CacheControl` for the CDN in front of them, and every
    // provider caught a failed write and returned a plausible CDN URL anyway —
    // so the false success survived one layer down and a government ID was now
    // on a CDN-fronted bucket (re-review RF-1).
    //
    // `storePrivate` is the seam for this: a private bucket/prefix (or, for the
    // `local` provider, a private directory whose bytes are really written),
    // no ACL, no CDN, `private, no-store`, an opaque KEY back and never a URL.
    //
    // The KEY carries no market segment. `kyc/<market>/…` was unreachable —
    // `marketScopeOf` reports `locked` only for `regionLocked: true`, which
    // nothing writes for a seller or a driver, so the segment was always absent
    // in production while Swagger advertised `kyc/QA/…` (RF-2). The market is
    // still resolved, and it is recorded on the queue ROW, where a region-locked
    // reviewer's scope check can actually use it.
    const { market } = this.scopeOf(req, undefined, 'that upload');
    const userId = req.user?.userId ?? 'anonymous';
    const fileKey = generateFileKey(userId, file.originalname);
    const uploadedAt = new Date().toISOString();

    let key: string;
    try {
      key = await this.storage.storePrivate('kyc', fileKey, file.buffer, file.mimetype);
    } catch (error) {
      throw this.storageFailure('the identity document', error);
    }

    // The queue row is what makes the document reviewable: `admin/kyc/pending`
    // reads `admin:kyc:pending:*` and the fix wave left that unwritten, so a
    // stored document was invisible to the approval queue. If this write fails
    // the object is removed again and the request fails — a document in the
    // bucket that no queue can see is the same false success in a new place.
    const entityType =
      String(req.user?.role ?? '').toUpperCase() === 'DRIVER' ? 'driver' : 'seller';
    try {
      await lastValueFrom(
        this.adminClient
          .send(
            { cmd: 'admin_kyc_document_submitted' },
            {
              key,
              owner: userId,
              entityType,
              market: market ?? null,
              mime: file.mimetype,
              size: file.size,
              uploadedAt,
            },
          )
          .pipe(timeout(5000), catchError(rpcCatch('KYC review queue unavailable'))),
      );
    } catch (error) {
      const detail = (error as Error)?.message ?? 'unknown error';
      this.logger.error(`[kyc-queue-write-failed] key="${key}" owner=${userId} error="${detail}"`);
      try {
        await this.storage.deletePrivate(key);
      } catch (cleanup) {
        // Logged, not swallowed into a success: the object is orphaned and an
        // operator needs the key to remove it by hand.
        this.logger.error(
          `[kyc-orphaned-object] key="${key}" could not be removed after the queue write failed: ` +
            `${(cleanup as Error)?.message}`,
        );
      }
      throw new HttpException(
        `The document could not be queued for review (${detail}). Nothing was recorded — please retry.`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return {
      message: 'KYC document stored and queued for admin review.',
      filename: key,
      size: file.size,
      status: 'PENDING_ADMIN_APPROVAL',
    };
  }

  @Post('profile-image')
  @Roles(UserRole.CUSTOMER, UserRole.SELLER, UserRole.DRIVER, UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: 'Upload profile image',
    description:
      'Accepts PNG or JPEG images up to 2 MB. ' +
      'Image is resized to 400×400, compressed, and stored on CDN. ' +
      'Returns the public CDN URL.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Profile image file (PNG / JPG, max 2 MB)',
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiCreatedResponse({ type: ProfileImageUploadDto, description: 'Profile image updated' })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Invalid file type or size' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  async uploadProfileImage(
    @Req() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 2 }),
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg)' }),
        ],
      }),
    )
    file: any,
  ): Promise<ProfileImageUploadDto> {
    // A profile photo has no market of its own, but the audit trail of who
    // uploaded it, from which market, does — stamped on the storage path so a
    // region-locked admin's own uploads are distinguishable from the platform's.
    //
    // The file is actually STORED, which it was not: this handler built the same
    // CDN string as a literal and discarded `file.buffer`, so R12 stamped a
    // market onto the path of an object that never existed and the probe that
    // read the URL back looked like proof of a working upload (review I7).
    // `this.storage.upload` is the same call the other four uploads make, and
    // the market is a real path segment in the bucket rather than decoration on
    // a fabricated string.
    const { market } = this.scopeOf(req, undefined, 'that upload');
    const userId = req.user?.userId ?? 'anonymous';
    const fileKey = generateFileKey(userId, file.originalname);
    const cdnUrl = await this.storePublic(
      market ? `profiles/${market}` : 'profiles',
      fileKey,
      file.buffer,
      file.mimetype,
      'the profile image',
    );
    return { message: 'Profile image uploaded successfully.', url: cdnUrl };
  }

  // ── Marketplace Image Uploads ─────────────────────────────────────────────

  @Post('product-image')
  @Roles(UserRole.SELLER, UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: 'Upload product image',
    description:
      'Accepts PNG, JPG, or WebP images up to 5 MB. ' +
      'Image is optimized and stored on CDN. Returns the public URL.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Product image file (PNG / JPG / WebP, max 5 MB)',
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: { type: 'string', format: 'binary' },
        productId: { type: 'string', description: 'Product UUID to associate the image with' },
        isPrimary: { type: 'boolean', description: 'Whether this is the primary display image' },
        sortOrder: { type: 'number', description: 'Display order (lower = first)' },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Product image uploaded' })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Invalid file type or size' })
  async uploadProductImage(
    @Req() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }),
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
        ],
      }),
    )
    file: any,
  ) {
    // Same as /upload/profile-image — stamp the resolved market on the object
    // metadata (the storage path) rather than the audit trail losing it.
    const { market } = this.scopeOf(req, undefined, 'that upload');
    const userId = req.user?.userId ?? 'anonymous';
    const fileKey = generateFileKey(userId, file.originalname);
    const cdnUrl = await this.storePublic(
      market ? `products/${market}` : 'products',
      fileKey,
      file.buffer,
      file.mimetype,
      'the product image',
    );
    return { message: 'Product image uploaded successfully.', url: cdnUrl, size: file.size };
  }

  @Post('review-image')
  // Deliberately not role-restricted beyond authentication: the reviewer is an
  // ordinary customer, and every other route here is scoped to sellers, drivers
  // or admins. That gap is why the review form's photo picker had no endpoint to
  // call and was left as a button with no handler, while `addProductReview`
  // has always accepted an `imageUrls` array it never received.
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: 'Upload a photo to attach to a product review',
    description:
      'Accepts PNG, JPG or WebP up to 5 MB. Returns the public URL to pass in the review’s `imageUrls`.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Review photo (PNG / JPG / WebP, max 5 MB)',
    schema: {
      type: 'object',
      required: ['image'],
      properties: { image: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ description: 'Review image uploaded' })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Invalid file type or size' })
  async uploadReviewImage(
    @Req() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }),
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
        ],
      }),
    )
    file: any,
  ) {
    const userId = req.user?.userId ?? 'anonymous';
    const fileKey = generateFileKey(userId, file.originalname);
    const cdnUrl = await this.storePublic(
      'reviews',
      fileKey,
      file.buffer,
      file.mimetype,
      'the review photo',
    );
    return { message: 'Review image uploaded successfully.', url: cdnUrl, size: file.size };
  }

  @Post('delivery-proof')
  @Roles(UserRole.DRIVER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: 'Upload a proof-of-delivery photograph',
    description:
      'Accepts PNG, JPG or WebP up to 5 MB. Returns the stored URL, which the ' +
      'partner app attaches to POST /marketplace/delivery-assignments/:id/proof.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Proof photo (PNG / JPG / WebP, max 5 MB)',
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: { type: 'string', format: 'binary' },
        assignmentId: { type: 'string', description: 'Delivery assignment UUID' },
        slot: {
          type: 'string',
          enum: ['doorstep', 'customer', 'location', 'damage'],
          description: 'Which required photo this is',
        },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Proof photo uploaded' })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Invalid file type or size' })
  async uploadDeliveryProof(
    @Req() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }),
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
        ],
      }),
    )
    file: any,
  ) {
    // Scoped to DRIVER because the existing image routes are SELLER-only, which
    // is why the partner app had nowhere to send a photograph: its proof screen
    // tracked four booleans and uploaded nothing, so a delivery dispute had no
    // evidence behind it.
    //
    // REACHABLE by a region-locked ADMIN (@Roles DRIVER, ADMIN, SUPER_ADMIN) —
    // the resolved market is stamped on the storage path, same as the other
    // four upload routes.
    const { market } = this.scopeOf(req, undefined, 'that upload');
    const userId = req.user?.userId ?? 'anonymous';
    const fileKey = generateFileKey(userId, file.originalname);
    const cdnUrl = await this.storePublic(
      market ? `delivery-proof/${market}` : 'delivery-proof',
      fileKey,
      file.buffer,
      file.mimetype,
      'the proof photo',
    );
    return { message: 'Proof photo uploaded successfully.', url: cdnUrl, size: file.size };
  }

  @Post('brand-image')
  @Roles(UserRole.SELLER, UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: 'Upload brand logo or banner',
    description:
      'Accepts PNG, JPG, WebP, or SVG images up to 3 MB. ' +
      'Returns the CDN URL for use as brand logo or banner.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Brand image file (PNG / JPG / WebP / SVG, max 3 MB)',
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: { type: 'string', format: 'binary' },
        brandId: { type: 'string', description: 'Brand UUID' },
        type: { type: 'string', enum: ['logo', 'banner'], description: 'Image type' },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Brand image uploaded' })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Invalid file type or size' })
  async uploadBrandImage(
    @Req() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 3 }),
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp|svg)' }),
        ],
      }),
    )
    file: any,
  ) {
    // Same as /upload/profile-image — stamp the resolved market on the object
    // metadata (the storage path).
    const { market } = this.scopeOf(req, undefined, 'that upload');
    const userId = req.user?.userId ?? 'anonymous';
    const fileKey = generateFileKey(userId, file.originalname);
    const cdnUrl = await this.storePublic(
      market ? `brands/${market}` : 'brands',
      fileKey,
      file.buffer,
      file.mimetype,
      'the brand image',
    );
    return { message: 'Brand image uploaded successfully.', url: cdnUrl, size: file.size };
  }

  @Post('category-image')
  @Roles(UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: 'Upload category thumbnail',
    description:
      'Accepts PNG, JPG, or WebP images up to 3 MB. ' +
      'Used for category grid thumbnails on the marketplace homepage.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Category image file (PNG / JPG / WebP, max 3 MB)',
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: { type: 'string', format: 'binary' },
        categoryId: { type: 'string', description: 'Category UUID' },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Category image uploaded' })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Invalid file type or size' })
  async uploadCategoryImage(
    @Req() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 3 }),
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
        ],
      }),
    )
    file: any,
  ) {
    // Same as /upload/profile-image — stamp the resolved market on the object
    // metadata (the storage path).
    const { market } = this.scopeOf(req, undefined, 'that upload');
    const userId = req.user?.userId ?? 'anonymous';
    const fileKey = generateFileKey(userId, file.originalname);
    const cdnUrl = await this.storePublic(
      market ? `categories/${market}` : 'categories',
      fileKey,
      file.buffer,
      file.mimetype,
      'the category image',
    );
    return { message: 'Category image uploaded successfully.', url: cdnUrl, size: file.size };
  }
}
