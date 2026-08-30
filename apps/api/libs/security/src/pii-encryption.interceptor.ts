import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
  SetMetadata, Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { EncryptionService } from './encryption.service';

/**
 * PII Encryption Interceptor — Automatic field-level encryption/decryption.
 *
 * Applied via the @EncryptPII() decorator on controller methods.
 *
 * On WRITE operations (POST/PUT/PATCH):
 *   → Encrypts specified fields in the request body before the handler runs.
 *
 * On READ operations (GET responses):
 *   → Decrypts specified fields in the response body after the handler returns.
 *
 * This ensures PII like phone numbers, addresses, and prescriptions are stored
 * encrypted at rest (AES-256-GCM) but returned decrypted to authenticated clients.
 *
 * Usage:
 *   @EncryptPII('phone', 'address')
 *   @Post('register')
 *   register(@Body() dto) { ... }
 */

export const PII_FIELDS_KEY = 'pii_encrypted_fields';

/**
 * Decorator to mark controller methods for automatic PII encryption.
 * @param fields — field names to encrypt/decrypt (e.g., 'phone', 'address')
 */
export const EncryptPII = (...fields: string[]) =>
  SetMetadata(PII_FIELDS_KEY, fields);

@Injectable()
export class PiiEncryptionInterceptor implements NestInterceptor {
  private readonly logger = new Logger('PiiEncryption');

  constructor(
    private readonly encryption: EncryptionService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const piiFields = this.reflector.get<string[]>(
      PII_FIELDS_KEY,
      context.getHandler(),
    );

    // If no @EncryptPII decorator, pass through
    if (!piiFields || piiFields.length === 0) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const method = request.method?.toUpperCase();

    // Encrypt PII fields on write operations
    if (['POST', 'PUT', 'PATCH'].includes(method) && request.body) {
      this.encryptFields(request.body, piiFields);
    }

    // Decrypt PII fields in response
    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object') {
          this.decryptFields(data, piiFields);
        }
        return data;
      }),
    );
  }

  /** Encrypt specified fields in an object (mutates in place). */
  private encryptFields(obj: any, fields: string[]): void {
    if (!obj || typeof obj !== 'object') return;

    for (const field of fields) {
      if (obj[field] && typeof obj[field] === 'string') {
        try {
          obj[field] = this.encryption.encryptIfPlaintext(obj[field]);
        } catch (e: unknown) {
          this.logger.warn(`Failed to encrypt field '${field}': ${(e as Error).message}`);
        }
      }
    }

    // Handle nested 'data' wrapper (common API response pattern)
    if (obj.data && typeof obj.data === 'object') {
      this.encryptFields(obj.data, fields);
    }
  }

  /** Decrypt specified fields in an object (mutates in place). */
  private decryptFields(obj: any, fields: string[]): void {
    if (!obj || typeof obj !== 'object') return;

    for (const field of fields) {
      if (obj[field] && typeof obj[field] === 'string') {
        try {
          // Only decrypt if it looks encrypted (contains two colons)
          if (obj[field].includes(':') && obj[field].split(':').length === 3) {
            obj[field] = this.encryption.decrypt(obj[field]);
          }
        } catch (e: unknown) {
          this.logger.warn(`Failed to decrypt field '${field}': ${(e as Error).message}`);
          // Leave encrypted value in place — don't crash the response
        }
      }
    }

    // Handle nested 'data' wrapper
    if (obj.data && typeof obj.data === 'object') {
      this.decryptFields(obj.data, fields);
    }

    // Handle arrays (e.g., list of users)
    if (Array.isArray(obj)) {
      for (const item of obj) {
        this.decryptFields(item, fields);
      }
    }
  }
}
