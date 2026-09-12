/**
 * KARTSEEK API Gateway — Swagger DTOs & Response Schemas
 *
 * All classes decorated with @ApiProperty for automatic OpenAPI schema generation.
 * Import in controllers for @ApiBody / @ApiResponse decorators.
 *
 * Modules covered:
 *  Auth · Order · Marketplace · Restaurant · Wallet · Notification ·
 *  Delivery · Upload · Partner · Search · Region · Security
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
  IsIn,
  IsPositive,
  IsUUID,
  IsArray,
  IsIP,
} from 'class-validator';
import { ForwardedBody } from '../decorators/forwarded-body.decorator';
import { SELLER_TYPES } from '@app/common';

/**
 * Password complexity regex:
 *  - At least 1 uppercase letter
 *  - At least 1 lowercase letter
 *  - At least 1 digit
 *  - At least 1 special character (@$!%*?&^#)
 */
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#])[A-Za-z\d@$!%*?&^#]{8,128}$/;

// ─── Shared / Primitives ──────────────────────────────────────────────────────

export class PaginationDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number (1-based)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Results per page (max 100)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class SuccessResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Operation completed successfully' })
  message: string;
}

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Bad Request' })
  message: string;

  @ApiProperty({ example: 'Bad Request' })
  error: string;
}

export class PaginatedResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 120, description: 'Total items matching the query' })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 6, description: 'Total number of pages' })
  totalPages: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export class LoginDto {
  @ApiProperty({ example: 'user@kartseek.com', description: 'Registered email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  email: string;

  @ApiProperty({
    example: 'P@ssw0rd!',
    description:
      'Account password (min 8 chars, requires uppercase, lowercase, digit, special char)',
  })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'Amara Okonkwo' })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'amara@example.com' })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  email: string;

  @ApiProperty({ example: '+91700000001' })
  @IsOptional()
  @IsString()
  phone: string;

  @ApiProperty({
    example: 'P@ssw0rd!',
    description: 'Min 8 chars, must include uppercase, lowercase, digit, and special character',
  })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(PASSWORD_REGEX, {
    message:
      'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 digit, and 1 special character (@$!%*?&^#)',
  })
  password: string;

  @ApiPropertyOptional({
    example: 'CUSTOMER',
    enum: ['CUSTOMER', 'SELLER', 'DRIVER', 'SUPER_ADMIN'],
  })
  @IsOptional()
  role?: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token (from email link)' })
  @IsNotEmpty({ message: 'Reset token is required' })
  @IsString()
  token: string;

  @ApiProperty({
    example: 'N3wP@ssw0rd!',
    description: 'New password (same complexity requirements as registration)',
  })
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(PASSWORD_REGEX, {
    message:
      'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 digit, and 1 special character (@$!%*?&^#)',
  })
  newPassword: string;
}

export class AuthTokenDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken: string;

  @ApiProperty({ example: 900, description: 'Access token TTL in seconds' })
  expiresIn: number;
}

export class RefreshTokenDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsNotEmpty({ message: 'Refresh token is required' })
  @IsString()
  refreshToken: string;
}

/** Completes a staff sign-in: the challenge from /auth/login plus the code. */
export class MfaVerifyDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsNotEmpty({ message: 'Challenge token is required' })
  @IsString()
  challengeToken: string;

  @ApiProperty({ example: '482910' })
  @IsNotEmpty({ message: 'Verification code is required' })
  @Matches(/^\d{6}$/, { message: 'code must be 6 digits' })
  code: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@kartseek.com' })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  email: string;
}

export class SellerRegisterDto {
  @ApiProperty({ example: 'Amara Okonkwo' })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'amara@pharmacy.com' })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  email: string;

  @ApiProperty({ example: '+91700000001' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Okonkwo Pharmacy' })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiProperty({
    example: 'pharmacy',
    description: 'Which seller portal this account is registering for',
    enum: SELLER_TYPES,
  })
  @IsNotEmpty({ message: 'Seller type is required' })
  @IsIn(SELLER_TYPES as unknown as string[], { message: 'Unknown seller type' })
  sellerType: string;

  @ApiProperty({ example: 'P@ssw0rd!', description: 'Same complexity as customer registration' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(PASSWORD_REGEX, {
    message:
      'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 digit, and 1 special character (@$!%*?&^#)',
  })
  password: string;
}

export class OtpSendDto {
  @ApiProperty({ example: '+91700000001', description: 'E.164 phone number' })
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  // Constrained so the SMS provider is not handed arbitrary strings, and so the
  // Redis key derived from this value cannot be used to smuggle separators.
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: 'Enter a valid phone number in international format' })
  phone: string;
}

export class OtpVerifyDto {
  @ApiProperty({ example: '+91700000001' })
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  phone: string;

  @ApiProperty({ example: '482910', description: '6-digit OTP code' })
  @IsNotEmpty({ message: 'OTP code is required' })
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'OTP must be 4–6 digits' })
  otp: string;
}

// ─── Order ────────────────────────────────────────────────────────────────────

export class OrderItemDto {
  @ApiProperty({ example: 'PRD-001' })
  productId: string;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 499.0 })
  price: number;

  @ApiPropertyOptional({ example: 'VAR-RED-L', description: 'Product variant ID' })
  variantId?: string;
}

@ForwardedBody()
export class PlaceOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  items: OrderItemDto[];

  @ApiProperty({ example: '14 MG Road, Mumbai Central, India' })
  deliveryAddress: string;

  @ApiProperty({
    example: 'marketplace',
    enum: ['marketplace', 'grocery', 'restaurant', 'pharmacy'],
  })
  serviceType: string;

  @ApiProperty({ example: 'razorpay', enum: ['razorpay', 'stripe', 'wallet', 'cash_on_delivery'] })
  paymentMethod: string;

  @ApiPropertyOptional({ example: 'KARTSEEK20' })
  couponCode?: string;

  @ApiPropertyOptional({ example: 100, description: 'Amount to deduct from wallet (INR)' })
  walletAmount?: number;

  @ApiPropertyOptional({ example: 'Leave at reception' })
  notes?: string;

  @ApiPropertyOptional({ description: 'Alias for couponCode, as the mobile client sends it' })
  promoCode?: string;

  @ApiPropertyOptional({
    description: 'Structured delivery address; deliveryAddress may carry it as a string instead',
  })
  shippingAddress?: unknown;

  @ApiPropertyOptional()
  giftCardCode?: string;

  @ApiPropertyOptional({
    description: 'Present on restaurant orders, which are placed by restaurant-service',
  })
  restaurantId?: string;
}

export class PlaceOrderResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({
    example: {
      id: 'ORD-1685451234-4291',
      status: 'PENDING',
      subtotal: 998,
      deliveryFee: 50,
      discount: 99.8,
      totalAmount: 948.2,
      estimatedDeliveryAt: '2026-05-31T14:30:00.000Z',
    },
  })
  order: Record<string, unknown>;
}

export class UpdateOrderStatusDto {
  @ApiProperty({
    example: 'CONFIRMED',
    enum: [
      'PENDING',
      'CONFIRMED',
      'PREPARING',
      'READY',
      'PICKED_UP',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
    ],
  })
  status: string;

  @ApiProperty({ example: 'seller-001', description: 'ID of user performing the update' })
  updatedBy: string;
}

export class OrderTrackingResponseDto {
  @ApiProperty({ example: 'ORD-1685451234-4291' })
  orderId: string;

  @ApiProperty({ example: 'OUT_FOR_DELIVERY' })
  status: string;

  @ApiProperty({ example: '2026-05-31T14:30:00.000Z' })
  estimatedDeliveryAt: string;

  @ApiPropertyOptional({
    example: {
      name: 'Rahul Kumar',
      phone: '+91 700 000 001',
      lat: -1.286,
      lng: 36.817,
      heading: 90,
      speed: 42,
    },
  })
  driver?: Record<string, unknown>;

  @ApiProperty({
    example: [
      { status: 'CONFIRMED', done: true },
      { status: 'PREPARING', done: true },
      { status: 'OUT_FOR_DELIVERY', done: true },
      { status: 'DELIVERED', done: false },
    ],
  })
  timeline: Record<string, unknown>[];
}

// ─── Marketplace ──────────────────────────────────────────────────────────────

export class AddToCartDto {
  @ApiProperty({ example: 'PRD-001', description: 'Product ID to add to cart' })
  @IsNotEmpty()
  @IsString()
  productId: string;

  @ApiProperty({ example: 2, minimum: 1, maximum: 99 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number;

  @ApiPropertyOptional({ example: 'VAR-RED-L' })
  @IsOptional()
  @IsString()
  variantId?: string;
}

export class ProductFilterDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'iPhone' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ example: 'electronics' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'Nike' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  minPrice?: number;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  maxPrice?: number;

  @ApiPropertyOptional({
    example: 'price_asc',
    enum: ['price_asc', 'price_desc', 'rating', 'newest', 'popular'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string;
}

// ─── Restaurant ───────────────────────────────────────────────────────────────

export class AddMenuItemDto {
  @ApiProperty({ example: 'RST-001', description: 'Restaurant ID' })
  restaurantId: string;

  @ApiProperty({ example: 'Chicken Dum Biryani' })
  name: string;

  @ApiProperty({ example: 320, description: 'Price in INR' })
  price: number;

  @ApiPropertyOptional({ example: 'Aromatic basmati rice with tender chicken' })
  description?: string;

  @ApiPropertyOptional({ example: false })
  isVeg?: boolean;

  @ApiPropertyOptional({ example: 'https://cdn.kartseek.com/menu/biryani.jpg' })
  imageUrl?: string;

  @ApiPropertyOptional({ example: ['bestseller', 'spicy'] })
  tags?: string[];
}

export class BookTableDto {
  @ApiProperty({ example: 'RST-001' })
  restaurantId: string;

  @ApiProperty({ example: 'USR-001' })
  userId: string;

  @ApiProperty({ example: '2026-06-10', description: 'Reservation date (YYYY-MM-DD)' })
  date: string;

  @ApiProperty({ example: '19:30', description: 'Reservation time (HH:MM, 24-hour)' })
  time: string;

  @ApiProperty({ example: 4, minimum: 1, maximum: 20, description: 'Number of guests' })
  guests: number;

  @ApiPropertyOptional({ example: 'Window table preferred' })
  notes?: string;
}

export class RestaurantStatusDto {
  @ApiProperty({ example: 'RST-001' })
  restaurantId: string;

  @ApiProperty({ example: true, description: 'true = Online, false = Offline' })
  isOnline: boolean;
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

export class WalletBalanceResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'USR-001' })
  userId: string;

  @ApiProperty({ example: 2450.5, description: 'Wallet balance in local currency' })
  balance: number;

  @ApiProperty({ example: 'INR' })
  currency: string;

  @ApiProperty({ example: '2026-06-09T12:00:00.000Z' })
  lastUpdated: string;
}

export class WalletTopUpDto {
  @ApiProperty({ example: 1000, minimum: 10, description: 'Amount to add to wallet (INR)' })
  amount: number;

  @ApiProperty({ example: 'upi', enum: ['stripe', 'razorpay', 'bank_transfer'] })
  paymentMethod: string;

  @ApiPropertyOptional({ example: 'UPI-REF-12345', description: 'External payment reference' })
  reference?: string;
}

export class WalletTransactionDto {
  @ApiProperty({ example: 'TXN-1685451234', description: 'Transaction ID' })
  id: string;

  @ApiProperty({ example: 'credit', enum: ['credit', 'debit'] })
  type: string;

  @ApiProperty({ example: 500.0 })
  amount: number;

  @ApiProperty({ example: 'INR' })
  currency: string;

  @ApiProperty({ example: 'Order ORD-1685451234 payment' })
  description: string;

  @ApiProperty({ example: '2026-06-09T12:00:00.000Z' })
  createdAt: string;
}

// ─── Notification ─────────────────────────────────────────────────────────────

export class SendNotificationDto {
  @ApiProperty({ example: 'USR-001', description: 'Target user ID' })
  userId: string;

  @ApiProperty({ example: 'Order Delivered!' })
  title: string;

  @ApiProperty({ example: 'Your order ORD-001 has been delivered.' })
  body: string;

  @ApiProperty({ example: 'order', enum: ['order', 'payment', 'promo', 'system', 'chat'] })
  type: string;

  @ApiPropertyOptional({ example: { orderId: 'ORD-001' } })
  data?: Record<string, any>;
}

export class NotificationPreferencesDto {
  @ApiPropertyOptional({ example: true, description: 'Enable/disable push notifications' })
  push?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Enable/disable SMS' })
  sms?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Enable/disable email' })
  email?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Enable/disable promotions' })
  promotions?: boolean;
}

// ─── Delivery ─────────────────────────────────────────────────────────────────

export class AssignDeliveryDto {
  @ApiProperty({ example: 'ORD-001' })
  orderId: string;

  @ApiProperty({ example: 'food', enum: ['food', 'grocery', 'pharmacy', 'marketplace'] })
  serviceType: string;
}

export class UpdateDeliveryStatusDto {
  @ApiProperty({
    example: 'IN_TRANSIT',
    enum: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'FAILED'],
  })
  status: string;

  @ApiProperty({ example: 'DP-0001' })
  partnerId: string;

  @ApiPropertyOptional({ example: -1.2869 })
  lat?: number;

  @ApiPropertyOptional({ example: 72.8777 })
  lng?: number;
}

export class DeliveryFeeEstimateDto {
  @ApiProperty({ example: 5.4, description: 'Distance from pickup to delivery in km' })
  distanceKm: number;

  @ApiPropertyOptional({ example: 2.5, description: 'Package weight in kg' })
  weight?: number;

  @ApiPropertyOptional({ example: 'grocery', enum: ['food', 'grocery', 'pharmacy', 'marketplace'] })
  serviceType?: string;
}

export class DeliveryFeeResponseDto {
  @ApiProperty({ example: 5.4 })
  distanceKm: number;

  @ApiProperty({ example: 131, description: 'Estimated fee in INR' })
  fee: number;

  @ApiProperty({ example: 'INR' })
  currency: string;

  @ApiProperty({ example: { base: 50, distance: 81, weight: 0 } })
  breakdown: Record<string, number>;
}

// ─── Search ───────────────────────────────────────────────────────────────────

export class SearchQueryDto extends PaginationDto {
  @ApiProperty({ example: 'biryani', description: 'Search keyword or phrase' })
  q: string;

  @ApiPropertyOptional({
    example: 'restaurant',
    enum: ['all', 'marketplace', 'restaurant', 'grocery', 'pharmacy', 'doctor'],
  })
  category?: string;

  @ApiPropertyOptional({ example: -1.2869 })
  lat?: number;

  @ApiPropertyOptional({ example: 72.8777 })
  lng?: number;
}

export class SearchResultDto {
  @ApiProperty({ example: 'RST-001' })
  id: string;

  @ApiProperty({ example: 'Biryani House' })
  name: string;

  @ApiProperty({
    example: 'restaurant',
    enum: ['marketplace', 'restaurant', 'grocery', 'pharmacy', 'doctor'],
  })
  type: string;

  @ApiPropertyOptional({ example: 4.7 })
  rating?: number;

  @ApiPropertyOptional({ example: 2.1, description: 'Distance from user in km' })
  distanceKm?: number;

  @ApiPropertyOptional({ example: 'https://cdn.kartseek.com/restaurants/biryani-house.jpg' })
  imageUrl?: string;
}

// ─── Region ───────────────────────────────────────────────────────────────────

export class RegionDetectDto {
  @ApiProperty({ example: -1.2869, description: 'User GPS latitude' })
  lat: number;

  @ApiProperty({ example: 72.8777, description: 'User GPS longitude' })
  lng: number;
}

export class RegionResponseDto {
  @ApiProperty({ example: 'africa-east' })
  regionId: string;

  @ApiProperty({ example: 'Mumbai, India' })
  name: string;

  @ApiProperty({ example: 'IN', description: 'ISO 3166-1 alpha-2 country code' })
  countryCode: string;

  @ApiProperty({ example: 'INR' })
  currency: string;

  @ApiProperty({ example: 'en' })
  locale: string;

  @ApiProperty({ example: 'Asia/Kolkata', description: 'IANA timezone' })
  timezone: string;
}

// ─── Partner ──────────────────────────────────────────────────────────────────

export class PartnerRegisterDto {
  @ApiProperty({ example: 'John Kamau' })
  name: string;

  @ApiProperty({ example: '+91700000001' })
  phone: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @ApiProperty({ example: 'taxi_driver', enum: ['delivery', 'taxi_driver'] })
  role: string;

  @ApiPropertyOptional({ example: 'sedan', enum: ['bicycle', 'motorcycle', 'sedan', 'suv', 'van'] })
  vehicleType?: string;

  @ApiPropertyOptional({ example: 'MH 01 AB 1234' })
  vehicleNumber?: string;

  @ApiPropertyOptional({ example: 'DL-MH-20245678' })
  licenseNumber?: string;
}

export class KycSubmitDto {
  @ApiProperty({
    example: 'national_id',
    enum: ['national_id', 'drivers_license', 'vehicle_registration', 'insurance'],
  })
  documentType: string;

  @ApiProperty({ example: 'https://cdn.kartseek.com/kyc/doc.pdf' })
  documentUrl: string;
}

// ─── Security (DDoS Admin) ────────────────────────────────────────────────────

/**
 * `POST /admin/security/bans`.
 *
 * Every field carried `@ApiProperty` and nothing else, so the gateway's pipe —
 * which runs `whitelist: true` with `forbidNonWhitelisted: true` — stripped all
 * three as unknown properties and answered
 * `property ip should not exist; property durationSeconds should not exist;
 * property reason should not exist` to the DTO's own documented body. The route
 * had never worked; Swagger described a request the server refused.
 *
 * `@IsIP()` and not a CIDR range: `DdosProtectionMiddleware` tests membership
 * with `sismember('ddos:whitelist', clientIp)` and bans are keyed
 * `ddos:banned:<ip>`, both exact. A `10.0.0.0/8` accepted here would be stored,
 * listed on the security page, and match nothing — a control that looks applied
 * and is inert.
 */
export class BanIpRequestDto {
  @ApiProperty({ example: '192.168.1.100', description: 'IPv4 or IPv6 address to ban' })
  @IsString()
  @IsNotEmpty()
  @IsIP()
  ip: string;

  /**
   * Optional, with the hour the console offers as its default. Floors at a
   * minute (anything shorter expires before the attacker notices) and caps at
   * 30 days — Redis holds the ban as a key TTL, so a longer one is really a
   * permanent block and should be a firewall rule, not a cache entry.
   */
  @ApiPropertyOptional({
    example: 3600,
    minimum: 60,
    maximum: 2592000,
    default: 3600,
    description: 'Ban duration in seconds',
  })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(2592000)
  durationSeconds: number = 3600;

  /** Stored with the ban and shown in the console's ban table, so it is bounded. */
  @ApiPropertyOptional({
    example: 'Manual ban — repeated credential stuffing',
    maxLength: 200,
    default: 'Manual ban from the admin console',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  reason: string = 'Manual ban from the admin console';
}

/** `POST /admin/security/whitelist` — see `BanIpRequestDto` for why this was a 400, and why not CIDR. */
export class WhitelistIpRequestDto {
  @ApiProperty({ example: '10.0.0.1', description: 'IPv4 or IPv6 address to whitelist' })
  @IsString()
  @IsNotEmpty()
  @IsIP()
  ip: string;
}

export class ThreatStatusResponseDto {
  @ApiProperty({ example: 'elevated', enum: ['normal', 'elevated', 'critical'] })
  level: string;

  @ApiProperty({ example: 34 })
  httpBansToday: number;

  @ApiProperty({ example: 12 })
  wsBansToday: number;

  @ApiProperty({ example: 8 })
  activeBans: number;

  @ApiProperty({ example: true })
  isHttpAttackMode: boolean;

  @ApiProperty({ example: false })
  isWsAttackMode: boolean;

  @ApiProperty({ example: '2026-06-09T10:00:00.000Z' })
  timestamp: string;
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export class KycUploadResponseDto {
  @ApiProperty({ example: 'KYC document stored and queued for admin review.' })
  message: string;

  /**
   * The STORED KEY on the private storage seam — not a public URL, and not the
   * name the applicant's file had.
   *
   * The example used to be `national_id.pdf`, and the handler used to answer
   * with an opaque id for an object it had never written. It then read
   * `kyc/<market>/<userId>/<uuid>.<ext>`, a shape production never produced:
   * the market segment needed `regionLocked: true`, which nothing writes for a
   * seller or a driver (re-review RF-2). The key is `kyc/<userId>/<uuid>.<ext>`,
   * the market lives on the review row, and `GET /admin/kyc/documents/:key`
   * (base64url of this key) is the only way back to the bytes.
   */
  @ApiProperty({ example: 'kyc/usr_ab12/8f1c0c1e-5b3a-4f0e-9a1d-6a2b7c8d9e0f.pdf' })
  filename: string;

  @ApiProperty({ example: 245760, description: 'File size in bytes' })
  size: number;

  @ApiProperty({ example: 'PENDING_ADMIN_APPROVAL' })
  status: string;
}

export class ProfileImageUploadDto {
  @ApiProperty({ example: 'Profile image uploaded successfully.' })
  message: string;

  @ApiProperty({ example: 'https://cdn.kartseek.com/profiles/USR-001.jpg' })
  url: string;
}

// ── Restaurant DTOs ──────────────────────────────────────────────────────────

export class SubmitReviewDto {
  @ApiProperty({ example: 5, description: 'Rating 1-5' })
  rating: number;

  @ApiProperty({ example: 'Amazing food and fast delivery!', description: 'Review text' })
  comment: string;

  @ApiProperty({ example: 'ORD-1234', description: 'Associated order ID', required: false })
  orderId?: string;
}

export class UpdateMenuItemDto {
  @ApiProperty({ example: 'Chicken Dum Biryani', required: false })
  name?: string;

  @ApiProperty({ example: 350, required: false })
  price?: number;

  @ApiProperty({ example: 'Aromatic basmati rice with tender chicken', required: false })
  description?: string;

  @ApiProperty({ example: true, required: false })
  isAvailable?: boolean;

  @ApiProperty({ example: false, required: false })
  isVeg?: boolean;

  @ApiProperty({ example: 'Biryani', required: false })
  category?: string;
}

export class UpdateRestaurantProfileDto {
  @ApiProperty({ example: 'The Grand Biryani House', required: false })
  name?: string;

  @ApiProperty({ example: 'Best biryani in town since 1995', required: false })
  description?: string;

  @ApiProperty({ example: '10:00 AM – 11:00 PM', required: false })
  openHours?: string;

  @ApiProperty({ example: 250, required: false })
  minOrder?: number;

  @ApiProperty({ example: 30, required: false })
  avgPrepTime?: number;

  @ApiProperty({ example: ['Indian', 'Biryani', 'Mughlai'], required: false })
  cuisines?: string[];
}

export class ReservationStatusDto {
  @ApiProperty({ example: 'CONFIRMED', enum: ['CONFIRMED', 'REJECTED', 'CANCELLED'] })
  status: string;

  @ApiProperty({ example: 'Table ready for your arrival', required: false })
  note?: string;
}

// ─── Delivery ─────────────────────────────────────────────────────────────────

export class AssignPartnerDto {
  @ApiProperty({ example: 'ORD-001', description: 'Order ID to assign' })
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @ApiProperty({
    example: 'marketplace',
    enum: ['marketplace', 'grocery', 'restaurant', 'pharmacy'],
  })
  @IsNotEmpty()
  @IsString()
  serviceType: string;
}

export class DeliveryPartnerUpdateStatusDto {
  @ApiProperty({
    example: 'picked_up',
    enum: ['assigned', 'picked_up', 'in_transit', 'delivered', 'failed'],
  })
  @IsNotEmpty()
  @IsString()
  status: string;

  @ApiProperty({ example: 'PTR-001' })
  @IsNotEmpty()
  @IsString()
  partnerId: string;

  @ApiPropertyOptional({ example: 25.276987 })
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: 51.520008 })
  @IsOptional()
  @IsNumber()
  lng?: number;
}

export class EstimateDeliveryFeeDto {
  @ApiProperty({ example: 12.5 })
  @IsNotEmpty()
  @IsNumber()
  distanceKm: number;

  @ApiPropertyOptional({ example: 2.5, description: 'Package weight in kg' })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({
    example: 'grocery',
    enum: ['marketplace', 'grocery', 'restaurant', 'pharmacy'],
  })
  @IsOptional()
  @IsString()
  serviceType?: string;
}

export class UpdateLocationDto {
  @ApiProperty({ example: 25.276987 })
  @IsNotEmpty()
  @IsNumber()
  lat: number;

  @ApiProperty({ example: 51.520008 })
  @IsNotEmpty()
  @IsNumber()
  lng: number;

  @ApiPropertyOptional({ example: 180, description: 'Compass heading (0-360)' })
  @IsOptional()
  @IsNumber()
  heading?: number;
}

// ─── Taxi ─────────────────────────────────────────────────────────────────────

export class EstimateFareDto {
  @ApiProperty({ example: 25.276987 })
  @IsNotEmpty()
  @IsNumber()
  pickupLat: number;

  @ApiProperty({ example: 51.520008 })
  @IsNotEmpty()
  @IsNumber()
  pickupLng: number;

  @ApiProperty({ example: 25.286987 })
  @IsNotEmpty()
  @IsNumber()
  dropLat: number;

  @ApiProperty({ example: 51.530008 })
  @IsNotEmpty()
  @IsNumber()
  dropLng: number;

  @ApiPropertyOptional({ example: 'sedan', enum: ['sedan', 'suv', 'auto', 'bike', 'luxury'] })
  @IsOptional()
  @IsString()
  vehicleType?: string;
}

export class RequestRideDto {
  @ApiProperty({ example: 25.276987 })
  @IsNotEmpty()
  @IsNumber()
  pickupLat: number;

  @ApiProperty({ example: 51.520008 })
  @IsNotEmpty()
  @IsNumber()
  pickupLng: number;

  @ApiProperty({ example: 25.286987 })
  @IsNotEmpty()
  @IsNumber()
  dropLat: number;

  @ApiProperty({ example: 51.530008 })
  @IsNotEmpty()
  @IsNumber()
  dropLng: number;

  @ApiPropertyOptional({ example: 'sedan' })
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @ApiPropertyOptional({ example: '2024-01-15T14:30:00Z' })
  @IsOptional()
  @IsString()
  scheduledAt?: string;

  @ApiPropertyOptional({ example: 'Airport Terminal 2' })
  @IsOptional()
  @IsString()
  pickupAddress?: string;

  @ApiPropertyOptional({ example: 'Downtown Hotel' })
  @IsOptional()
  @IsString()
  dropAddress?: string;

  @ApiPropertyOptional({ example: 'PROMO10' })
  @IsOptional()
  @IsString()
  couponCode?: string;
}

export class DriverIdDto {
  @ApiProperty({ example: 'DRV-001' })
  @IsNotEmpty()
  @IsString()
  driverId: string;

  @ApiPropertyOptional({ example: 'No longer need the ride' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class VerifyOtpCodeDto {
  @ApiProperty({ example: '4829', description: '4-digit ride OTP' })
  @IsNotEmpty()
  @IsString()
  otp: string;
}

export class SubmitRatingDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Great ride!' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ example: ['clean_car', 'friendly_driver'] })
  @IsOptional()
  tags?: string[];
}

export class RaiseDisputeDto {
  @ApiProperty({ example: 'Driver took a longer route' })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    example: 'fare_dispute',
    enum: ['fare_dispute', 'safety', 'service', 'other'],
  })
  @IsOptional()
  @IsString()
  category?: string;
}

export class TriggerSosDto {
  @ApiPropertyOptional({ example: 'Driver behaving aggressively' })
  @IsOptional()
  @IsString()
  details?: string;

  @ApiPropertyOptional({ example: 25.276987 })
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: 51.520008 })
  @IsOptional()
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ example: 'RDE-001' })
  @IsOptional()
  @IsString()
  rideId?: string;
}

export class DriverOnlineDto {
  @ApiPropertyOptional({ example: 'Ahmed' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'sedan' })
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @ApiPropertyOptional({ example: 'QA-1234' })
  @IsOptional()
  @IsString()
  vehiclePlate?: string;

  @ApiPropertyOptional({ example: 4.8 })
  @IsOptional()
  @IsNumber()
  rating?: number;
}

export class CompleteRideDto {
  @ApiPropertyOptional({ example: 12.5, description: 'Final measured distance in km' })
  @IsOptional()
  @IsNumber()
  finalDistanceKm?: number;

  @ApiPropertyOptional({ example: 25, description: 'Final duration in minutes' })
  @IsOptional()
  @IsNumber()
  finalDurationMin?: number;
}

// ─── Partner ──────────────────────────────────────────────────────────────────

export class PartnerLoginDto {
  @ApiProperty({ example: '+974555000001' })
  @IsNotEmpty()
  @IsString()
  phone: string;
}

export class PartnerDocumentDto {
  @ApiProperty({
    example: 'driving_license',
    enum: ['driving_license', 'vehicle_registration', 'insurance', 'id_card'],
  })
  @IsNotEmpty()
  @IsString()
  docType: string;

  @ApiProperty({ example: 'https://cdn.kartseek.com/docs/license.jpg' })
  @IsNotEmpty()
  @IsString()
  docUrl: string;

  @ApiProperty({ example: 'delivery_driver', enum: ['delivery_driver', 'taxi_driver'] })
  @IsNotEmpty()
  @IsString()
  roleType: string;
}

export class GoOnlineDto {
  @ApiProperty({ example: 'delivery_driver', enum: ['delivery_driver', 'taxi_driver'] })
  @IsNotEmpty()
  @IsString()
  roleType: string;
}

export class DeliveryProofDto {
  @ApiProperty({ example: 'https://cdn.kartseek.com/proofs/pickup-001.jpg' })
  @IsNotEmpty()
  @IsString()
  proofUrl: string;
}

export class CancelReasonDto {
  @ApiProperty({ example: 'Customer not available' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class CollectCodDto {
  @ApiProperty({ example: 150.0, description: 'Amount collected in local currency' })
  @IsNotEmpty()
  @IsNumber()
  amountCollected: number;
}

// ─── Seller ───────────────────────────────────────────────────────────────────

export class UpdateStockDto {
  @ApiProperty({ example: 50, description: 'New stock quantity' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  stock: number;
}

export class SellerUpdateOrderStatusDto {
  @ApiProperty({
    example: 'shipped',
    enum: ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
  })
  @IsNotEmpty()
  @IsString()
  status: string;
}

export class RequestPayoutDto {
  @ApiProperty({ example: 5000.0, description: 'Payout amount in local currency' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ example: 'bank_transfer', enum: ['bank_transfer', 'wallet', 'upi'] })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ example: 'BA-001' })
  @IsOptional()
  @IsString()
  bankAccountId?: string;
}

export class UpdateStockThresholdDto {
  @ApiProperty({ example: 10, description: 'Low-stock alert threshold' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  threshold: number;
}

export class ShipOrderDto {
  @ApiProperty({ example: 'TRK-123456' })
  @IsNotEmpty()
  @IsString()
  trackingId: string;

  @ApiProperty({ example: 'FedEx' })
  @IsNotEmpty()
  @IsString()
  courier: string;
}

export class UpdateShippingZoneDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 50.0, description: 'Base shipping rate' })
  @IsOptional()
  @IsNumber()
  baseRate?: number;

  @ApiPropertyOptional({ example: 10.0, description: 'Rate per kg above base weight' })
  @IsOptional()
  @IsNumber()
  perKgRate?: number;

  @ApiPropertyOptional({ example: 500.0, description: 'Free shipping above this order value' })
  @IsOptional()
  @IsNumber()
  freeAbove?: number;
}

export class UpdateShippingSettingsDto {
  @ApiPropertyOptional({ example: 'FedEx' })
  @IsOptional()
  @IsString()
  defaultCourier?: string;

  @ApiPropertyOptional({ example: ['FedEx', 'DHL', 'Aramex'] })
  @IsOptional()
  enabledCouriers?: string[];
}

export class BulkUploadProductsDto {
  @ApiProperty({ type: 'array', description: 'Array of product data objects' })
  @IsNotEmpty()
  products: any[];
}

// ─── Loyalty ──────────────────────────────────────────────────────────────────

export class AwardPointsDto {
  @ApiProperty({ example: 100, description: 'Points to award' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  points: number;

  @ApiProperty({ example: 'Order completed' })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @ApiPropertyOptional({ example: 'ORD-001' })
  @IsOptional()
  @IsString()
  orderId?: string;
}

export class ReversePointsDto {
  @ApiProperty({ example: 'ORD-001' })
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @ApiProperty({ example: 'Order cancelled' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class RedeemPointsDto {
  @ApiProperty({ example: 500, description: 'Points to redeem' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  points: number;
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

export class WalletTopUpRequestDto {
  @ApiProperty({ example: 500.0, description: 'Amount to add' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ example: 'razorpay', enum: ['razorpay', 'stripe', 'upi', 'bank_transfer'] })
  @IsNotEmpty()
  @IsString()
  method: string;
}

// ─── Marketplace Social ──────────────────────────────────────────────────────

export class UserTextDto {
  @ApiProperty({ example: 'USR-001' })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({ example: 'Great product!' })
  @IsNotEmpty()
  @IsString()
  text: string;
}

export class MarketplaceSubmitReviewDto {
  @ApiProperty({ example: 'USR-001' })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Excellent quality' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Product exceeded expectations.' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ example: ['https://cdn.kartseek.com/reviews/photo1.jpg'] })
  @IsOptional()
  photos?: string[];
}

export class UserIdDto {
  @ApiProperty({ example: 'USR-001' })
  @IsNotEmpty()
  @IsString()
  userId: string;
}

export class GiftCardBalanceDto {
  @ApiProperty({ example: 'GC-ABC123' })
  @IsNotEmpty()
  @IsString()
  code: string;
}

export class RedeemGiftCardDto {
  @ApiProperty({ example: 'GC-ABC123' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ example: 'ORD-001' })
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @ApiProperty({ example: 100.0, description: 'Amount to redeem, in the card currency' })
  @IsNotEmpty()
  // `@IsNumber()` alone accepted a negative amount. The controller took an inline
  // `{ amount: number }` type rather than this class, so nothing validated it at
  // all — and the service computed `balance - (-1000)`, which INCREASED the
  // card's balance. Both halves are fixed: the route now binds to this DTO, and
  // the amount must be positive.
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Amount must be a number with at most 2 decimal places' },
  )
  @IsPositive({ message: 'Amount must be greater than zero' })
  amount: number;

  // No `userId` here on purpose. The controller takes it from the caller's token;
  // accepting it in the body would let anyone redeem a card in someone else's
  // name. (It used to be a required field on this DTO, which is one reason the
  // class was never bound to the route — doing so rejected every real request.)
}

// ─── Localization ─────────────────────────────────────────────────────────────

export class UpsertTranslationDto {
  @ApiProperty({ example: 'ar' })
  @IsNotEmpty()
  @IsString()
  languageCode: string;

  @ApiProperty({ example: 'home.welcome' })
  @IsNotEmpty()
  @IsString()
  key: string;

  @ApiProperty({ example: 'مرحباً بكم' })
  @IsNotEmpty()
  @IsString()
  value: string;

  @ApiPropertyOptional({ example: 'common' })
  @IsOptional()
  @IsString()
  namespace?: string;
}

export class UpdateExchangeRateDto {
  @ApiProperty({ example: 'QAR' })
  @IsNotEmpty()
  @IsString()
  currencyCode: string;

  @ApiProperty({ example: 3.64 })
  @IsNotEmpty()
  @IsNumber()
  exchangeRateToUsd: number;
}

// ─── Geo Security ─────────────────────────────────────────────────────────────

export class UpdateGeoRuleDto {
  @ApiProperty({ example: 'max_login_attempts' })
  @IsNotEmpty()
  @IsString()
  ruleKey: string;

  @ApiProperty({ example: '5' })
  @IsNotEmpty()
  @IsString()
  ruleValue: string;

  @ApiPropertyOptional({ example: 'QA' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ example: 'CUSTOMER' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ example: 'Max login attempts before lockout' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class WhitelistIpDto {
  @ApiProperty({ example: '192.168.1.100' })
  @IsNotEmpty()
  @IsString()
  ip: string;

  @ApiPropertyOptional({ example: 'Office IP' })
  @IsOptional()
  @IsString()
  reason?: string;
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export class ResolveComplaintDto {
  @ApiProperty({ example: 'Issue has been resolved and customer compensated.' })
  @IsNotEmpty()
  @IsString()
  resolution: string;
}

export class CreateCuisineDto {
  @ApiProperty({ example: 'Levantine' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '🫓' })
  @IsOptional()
  @IsString()
  icon?: string;
}

export class SuspendReasonDto {
  @ApiPropertyOptional({ example: 'Repeated policy violations' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UploadDocumentDto {
  @ApiProperty({
    example: 'id_card',
    enum: ['id_card', 'driving_license', 'address_proof', 'bank_statement'],
  })
  @IsNotEmpty()
  @IsString()
  documentType: string;

  @ApiProperty({ example: 'https://cdn.kartseek.com/docs/id-card.jpg' })
  @IsNotEmpty()
  @IsString()
  documentUrl: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Marketplace request bodies
// ═══════════════════════════════════════════════════════════════════════════════
//
// The gateway is the client-facing boundary, so these are the bodies that reach
// us from browsers and apps. They were typed `any`, which erases at runtime and
// left the global ValidationPipe with no class to validate against — a non-uuid
// posted to the wishlist route travelled all the way to Postgres.
//
// Only handlers whose fields are known are declared here. Handlers that spread
// the whole payload into the RPC call are deliberately left alone: whitelisting
// strips undeclared properties, so a partial DTO at this layer would truncate
// the body before the owning service ever saw it. Those are validated by the
// service's own DTOs one hop downstream.

@ForwardedBody()
export class CreateCheckoutDto {
  @ApiPropertyOptional({ description: 'Server uses the token subject when omitted.' })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class CreatePriceAlertDto {
  @ApiProperty({ example: 4999 })
  @IsNumber()
  @Min(0)
  targetPrice: number;
}

export class ReportProductDto {
  @ApiProperty({ example: 'COUNTERFEIT' })
  @IsString()
  @MaxLength(120)
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  details?: string;
}

export class ResolveProductReportDto {
  @ApiProperty({ example: 'RESOLVED' })
  @IsString()
  @MaxLength(60)
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolutionNote?: string;
}

export class ValidateCouponDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  code: string;

  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() userId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cartTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) orderTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];
}

export class RedeemCouponRequestDto {
  @ApiProperty()
  @IsString()
  couponId: string;

  @ApiPropertyOptional() @IsOptional() @IsString() orderId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cartTotal?: number;

  @ApiPropertyOptional({ description: 'Amount taken off this order.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountApplied?: number;
}

export class CreateQuestionDto {
  @ApiPropertyOptional({ description: 'Either spelling is accepted by the handler.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  questionText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  text?: string;
}

export class CreateAnswerDto {
  @ApiPropertyOptional({ description: 'Either spelling is accepted by the handler.' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  answerText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  text?: string;
}

export class VerifyDeliveryOtpDto {
  @ApiProperty({ example: '4821' })
  @IsString()
  @MaxLength(12)
  otp: string;
}

export class WishlistProductDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  /**
   * Accepted but ignored — the handler takes the owner from the token.
   *
   * Declared because the pipe runs with `forbidNonWhitelisted`, which rejects
   * unknown properties rather than stripping them, and
   * `shared-core/src/api/marketplace.ts` posts `{ productId, userId }`. Leaving
   * it out turned every existing add-to-wishlist call into
   * `400 property userId should not exist`.
   */
  @ApiPropertyOptional({ description: 'Ignored; the session owns the wishlist.' })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class RemoveCartItemDto {
  @ApiPropertyOptional({ description: 'Removes only this variant when given.' })
  @IsOptional()
  @IsString()
  variantId?: string;
}

// ── Forwarded bodies ─────────────────────────────────────────────────────────
//
// Used with `ForwardingValidationPipe`, which validates the declared fields and
// lets the rest through. These routes hand the payload to the owning service,
// which has the authoritative DTO; declaring a partial shape here and
// whitelisting it would truncate the body before that service ever saw it.
// Each class names the fields the *gateway* reads or requires.

/** Body is forwarded whole; the id comes from the path. */
@ForwardedBody()
export class ForwardedBodyDto {}

@ForwardedBody()
export class ForwardedReturnRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsString() orderId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

@ForwardedBody()
export class ForwardedReturnStatusDto {
  @ApiPropertyOptional({ description: 'Validated in full by marketplace-service.' })
  @IsOptional()
  @IsString()
  status?: string;
}

@ForwardedBody()
export class ForwardedPickupDto {
  @ApiPropertyOptional() @IsOptional() @IsString() pickupPartnerId?: string;
}

@ForwardedBody()
export class ForwardedCouponDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountValue?: number;
}

@ForwardedBody()
export class ForwardedTrackingEventDto {
  @ApiPropertyOptional() @IsOptional() @IsString() trackingId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}

@ForwardedBody()
export class ForwardedVariantDto {
  @ApiPropertyOptional() @IsOptional() @IsString() sku?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) sellingPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) stockQuantity?: number;
}

@ForwardedBody()
export class ForwardedVariantStockDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) stockQuantity?: number;
}

@ForwardedBody()
export class ForwardedDeliveryAssignmentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() orderId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() partnerId?: string;
}

@ForwardedBody()
export class ForwardedDeliveryStatusDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}

@ForwardedBody()
export class ForwardedDeliveryProofDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  proofPhotos?: string[];

  @ApiPropertyOptional() @IsOptional() @IsString() deliveryMode?: string;
}

@ForwardedBody()
export class ForwardedCartItemDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
}

@ForwardedBody()
export class ForwardedOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

@ForwardedBody()
export class ForwardedBrandUpdateDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) message?: string;
}
