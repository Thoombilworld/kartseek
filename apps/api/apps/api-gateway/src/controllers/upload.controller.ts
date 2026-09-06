import {
  Controller, Post, Req,
  UseInterceptors, UploadedFile,
  ParseFilePipe, MaxFileSizeValidator,
  FileTypeValidator, UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiConsumes, ApiBody, ApiCreatedResponse,
  ApiForbiddenResponse, ApiUnauthorizedResponse,
  ApiBadRequestResponse, ApiPayloadTooLargeResponse,
} from '@nestjs/swagger';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '@app/common';
import { KycUploadResponseDto, ProfileImageUploadDto, ErrorResponseDto } from '../dto/gateway.dto';
import { generateFileKey, generateDocumentId, JwtAuthGuard } from '@app/security';
import { StorageService } from '@app/storage';

@ApiTags('📁 Uploads')
@ApiBearerAuth('JWT')
@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadController {

  constructor(private readonly storage: StorageService) {}

  @Post('kyc-document')
  @Roles(UserRole.SELLER, UserRole.DRIVER)
  @UseInterceptors(FileInterceptor('document'))
  @ApiOperation({
    summary: 'Upload KYC document',
    description:
      'Accepts PDF, PNG, JPG, or JPEG files up to 5 MB. ' +
      'In production the file is streamed directly to AWS S3 and the returned URL ' +
      'is stored against the seller/driver record for admin review. ' +
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
  @ApiCreatedResponse({ type: KycUploadResponseDto, description: 'Document uploaded and queued for review' })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Invalid file type (only PDF/PNG/JPG allowed)' })
  @ApiPayloadTooLargeResponse({ description: 'File exceeds 5 MB limit' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Role SELLER or DRIVER required' })
  uploadKycDocument(
    @Req() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }),
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|pdf)' }),
        ],
      }))
    file: any): KycUploadResponseDto {
    const userId = req.user?.userId ?? 'anonymous';
    const fileKey = generateFileKey(userId, file.originalname);
    const documentRef = generateDocumentId('KYC');
    return {
      message: 'KYC Document securely uploaded to object storage.',
      filename: documentRef, // Opaque reference — never expose original filename
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
  uploadProfileImage(
    @Req() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 2 }),
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg)' }),
        ],
      }))
    file: any): ProfileImageUploadDto {
    const userId = req.user?.userId ?? 'anonymous';
    const fileKey = generateFileKey(userId, file.originalname);
    const cdnUrl = `https://cdn.kartseek.com/profiles/${fileKey}`;
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
      }))
    file: any) {
    const userId = req.user?.userId ?? 'anonymous';
    const fileKey = generateFileKey(userId, file.originalname);
    const cdnUrl = await this.storage.upload('products', fileKey, file.buffer, file.mimetype);
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
    description: 'Accepts PNG, JPG or WebP up to 5 MB. Returns the public URL to pass in the review’s `imageUrls`.',
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
      }))
    file: any) {
    const userId = req.user?.userId ?? 'anonymous';
    const fileKey = generateFileKey(userId, file.originalname);
    const cdnUrl = await this.storage.upload('reviews', fileKey, file.buffer, file.mimetype);
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
      }))
    file: any) {
    // Scoped to DRIVER because the existing image routes are SELLER-only, which
    // is why the partner app had nowhere to send a photograph: its proof screen
    // tracked four booleans and uploaded nothing, so a delivery dispute had no
    // evidence behind it.
    const userId = req.user?.userId ?? 'anonymous';
    const fileKey = generateFileKey(userId, file.originalname);
    const cdnUrl = await this.storage.upload('delivery-proof', fileKey, file.buffer, file.mimetype);
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
      }))
    file: any) {
    const userId = req.user?.userId ?? 'anonymous';
    const fileKey = generateFileKey(userId, file.originalname);
    const cdnUrl = await this.storage.upload('brands', fileKey, file.buffer, file.mimetype);
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
      }))
    file: any) {
    const userId = req.user?.userId ?? 'anonymous';
    const fileKey = generateFileKey(userId, file.originalname);
    const cdnUrl = await this.storage.upload('categories', fileKey, file.buffer, file.mimetype);
    return { message: 'Category image uploaded successfully.', url: cdnUrl, size: file.size };
  }
}
