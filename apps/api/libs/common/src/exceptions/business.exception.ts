import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * BusinessException — base class for all KARTSEEK domain exceptions.
 *
 * Carries an `errorCode` string (e.g. 'ORDER_NOT_FOUND') that clients use
 * for i18n message lookup and analytics tracking.
 *
 * Never add free-form error messages from untrusted input — always use
 * static message strings or template literals with safe interpolation.
 */
export class BusinessException extends HttpException {
  constructor(
    public readonly errorCode: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(message, status);
    this.name = 'BusinessException';
  }
}

// ─── Order Domain ──────────────────────────────────────────────────────────────

export class OrderNotFoundException extends BusinessException {
  constructor(orderId: string) {
    super('ORDER_NOT_FOUND', `Order '${orderId}' not found.`, HttpStatus.NOT_FOUND);
  }
}

export class OrderCancellationException extends BusinessException {
  constructor(orderId: string, reason: string) {
    super('ORDER_CANCELLATION_DENIED', `Cannot cancel order '${orderId}': ${reason}.`);
  }
}

export class InvalidOrderStatusTransitionException extends BusinessException {
  constructor(from: string, to: string) {
    super(
      'INVALID_ORDER_STATUS_TRANSITION',
      `Cannot transition order from '${from}' to '${to}'.`,
    );
  }
}

// ─── Inventory / Stock Domain ───────────────────────────────────────────────

export class InsufficientStockException extends BusinessException {
  constructor(productId: string, available: number, requested: number) {
    super(
      'INSUFFICIENT_STOCK',
      `Product '${productId}' has only ${available} units available (requested ${requested}).`,
    );
  }
}

export class ProductNotFoundException extends BusinessException {
  constructor(productId: string) {
    super('PRODUCT_NOT_FOUND', `Product '${productId}' not found.`, HttpStatus.NOT_FOUND);
  }
}

// ─── Seller Domain ─────────────────────────────────────────────────────────────

export class SellerNotFoundException extends BusinessException {
  constructor(sellerId: string) {
    super('SELLER_NOT_FOUND', `Seller '${sellerId}' not found.`, HttpStatus.NOT_FOUND);
  }
}

export class SellerSuspendedException extends BusinessException {
  constructor(sellerId: string) {
    super(
      'SELLER_SUSPENDED',
      `Seller account '${sellerId}' is suspended. Contact support.`,
      HttpStatus.FORBIDDEN,
    );
  }
}

export class SellerNotVerifiedException extends BusinessException {
  constructor() {
    super(
      'SELLER_NOT_VERIFIED',
      'Your seller account is pending verification. Please complete KYC.',
      HttpStatus.FORBIDDEN,
    );
  }
}

// ─── Payment Domain ────────────────────────────────────────────────────────────

export class PaymentFailedException extends BusinessException {
  constructor(reason: string) {
    super('PAYMENT_FAILED', `Payment failed: ${reason}.`, HttpStatus.PAYMENT_REQUIRED);
  }
}

export class InsufficientWalletBalanceException extends BusinessException {
  constructor(available: number, required: number) {
    super(
      'INSUFFICIENT_WALLET_BALANCE',
      `Wallet balance (${available}) is insufficient for this transaction (${required}).`,
    );
  }
}

// ─── Auth Domain ────────────────────────────────────────────────────────────────

export class TokenExpiredException extends BusinessException {
  constructor() {
    super('TOKEN_EXPIRED', 'Your session has expired. Please log in again.', HttpStatus.UNAUTHORIZED);
  }
}

export class TokenRevokedException extends BusinessException {
  constructor() {
    super('TOKEN_REVOKED', 'This token has been revoked.', HttpStatus.UNAUTHORIZED);
  }
}

export class AccountLockedException extends BusinessException {
  constructor(unlockAt: Date) {
    super(
      'ACCOUNT_LOCKED',
      `Account is locked until ${unlockAt.toISOString()}. Too many failed login attempts.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

// ─── Pharmacy / Doctor Domain ──────────────────────────────────────────────────

export class PrescriptionRequiredException extends BusinessException {
  constructor(productId: string) {
    super(
      'PRESCRIPTION_REQUIRED',
      `Product '${productId}' requires a valid prescription.`,
      HttpStatus.FORBIDDEN,
    );
  }
}

export class AppointmentNotFoundException extends BusinessException {
  constructor(appointmentId: string) {
    super(
      'APPOINTMENT_NOT_FOUND',
      `Appointment '${appointmentId}' not found.`,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class AppointmentSlotUnavailableException extends BusinessException {
  constructor() {
    super('APPOINTMENT_SLOT_UNAVAILABLE', 'The requested appointment slot is no longer available.');
  }
}

// ─── Hotel Domain ──────────────────────────────────────────────────────────────

export class RoomUnavailableException extends BusinessException {
  constructor(roomId: string) {
    super('ROOM_UNAVAILABLE', `Room '${roomId}' is not available for the selected dates.`);
  }
}

// ─── Taxi Domain ───────────────────────────────────────────────────────────────

export class DriverNotFoundException extends BusinessException {
  constructor(driverId: string) {
    super('DRIVER_NOT_FOUND', `Driver '${driverId}' not found.`, HttpStatus.NOT_FOUND);
  }
}

export class DriverUnavailableException extends BusinessException {
  constructor() {
    super('DRIVER_UNAVAILABLE', 'No drivers available in your area at this time.');
  }
}

// ─── General ───────────────────────────────────────────────────────────────────

export class ResourceNotFoundException extends BusinessException {
  constructor(resource: string, id: string) {
    super(
      `${resource.toUpperCase()}_NOT_FOUND`,
      `${resource} '${id}' not found.`,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class DuplicateResourceException extends BusinessException {
  constructor(resource: string, field: string, value: string) {
    super(
      `${resource.toUpperCase()}_DUPLICATE`,
      `${resource} with ${field} '${value}' already exists.`,
      HttpStatus.CONFLICT,
    );
  }
}

export class ValidationFailedException extends BusinessException {
  constructor(details: string) {
    super('VALIDATION_FAILED', `Validation failed: ${details}.`);
  }
}
