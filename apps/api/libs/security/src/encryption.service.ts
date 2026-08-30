import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;   // 96-bit IV — NIST recommended for GCM
const TAG_LENGTH = 16;  // 128-bit auth tag

/**
 * EncryptionService — AES-256-GCM field-level encryption for PII.
 *
 * Use for: phone numbers, delivery addresses, prescriptions, payment
 * card metadata, and any field subject to GDPR/PCI-DSS.
 *
 * Wire format: `iv(hex):authTag(hex):ciphertext(hex)`
 *
 * Environment:
 *   ENCRYPTION_KEY — 64-character hex string (32 bytes), e.g. from:
 *   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
 *
 * Never log plaintext values. Never store the key in source control.
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly key: Buffer;

  constructor() {
    const hexKey = process.env.ENCRYPTION_KEY;
    if (!hexKey || hexKey.length !== 64) {
      throw new Error(
        'ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
          'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
      );
    }
    this.key = Buffer.from(hexKey, 'hex');
  }

  /**
   * Encrypt a plaintext string.
   * Returns a wire-format string: `iv:authTag:ciphertext` (all hex).
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv, {
      authTagLength: TAG_LENGTH,
    });

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /**
   * Decrypt a wire-format string produced by `encrypt()`.
   * Returns the original plaintext.
   * Throws if the ciphertext has been tampered with (authTag mismatch).
   */
  decrypt(wireFormat: string): string {
    const parts = wireFormat.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted value format.');
    }
    const [ivHex, authTagHex, ciphertextHex] = parts;

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv, {
      authTagLength: TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  /**
   * Encrypt a value only if it hasn't been encrypted yet.
   * Useful for idempotent migration scripts.
   */
  encryptIfPlaintext(value: string): string {
    // Simple heuristic: encrypted values always contain two colons
    if (value.includes(':') && value.split(':').length === 3) {
      return value; // Already encrypted
    }
    return this.encrypt(value);
  }

  /**
   * Hash a value with HMAC-SHA256 for deterministic searchability.
   * Use for indexed fields like email or phone (search by hash, store encrypted).
   */
  hashForSearch(value: string): string {
    return crypto
      .createHmac('sha256', this.key)
      .update(value.toLowerCase().trim())
      .digest('hex');
  }
}
