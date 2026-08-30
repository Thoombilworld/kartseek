import * as crypto from 'crypto';
import * as path from 'path';

/**
 * Secure ID & File Key Generation — IDOR Prevention Utilities
 *
 * Replaces all predictable identifiers (Date.now(), sequential counters)
 * with cryptographically random UUIDs to prevent enumeration attacks.
 */

/**
 * Generate a secure, prefixed document identifier.
 *
 * @param prefix - Business-domain prefix (e.g. 'RX', 'INV', 'DOC', 'APT')
 * @returns A non-guessable identifier like `RX-a1b2c3d4-e5f6-7890-abcd-ef1234567890`
 *
 * @example
 * ```typescript
 * const prescriptionId = generateDocumentId('RX');
 * // => 'RX-a1b2c3d4-e5f6-7890-abcd-ef1234567890'
 *
 * const invoiceId = generateDocumentId('INV');
 * // => 'INV-b2c3d4e5-f6a7-8901-bcde-f12345678901'
 * ```
 */
export function generateDocumentId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

/**
 * Generate a secure file storage key scoped to a user.
 *
 * The key includes the user ID as a directory prefix for access-control
 * enforcement at the storage layer (e.g., S3 IAM policies, CDN path-based auth).
 *
 * @param userId  - The authenticated user's ID
 * @param originalFilename - The original filename (only the extension is used)
 * @returns A storage key like `usr_abc123/d4e5f6a7-b8c9-0123-4567-890abcdef012.pdf`
 *
 * @example
 * ```typescript
 * const key = generateFileKey('usr-001', 'my-passport-scan.pdf');
 * // => 'usr-001/d4e5f6a7-b8c9-0123-4567-890abcdef012.pdf'
 * ```
 */
export function generateFileKey(userId: string, originalFilename: string): string {
  const ext = path.extname(originalFilename).toLowerCase() || '.bin';
  const fileId = crypto.randomUUID();
  return `${userId}/${fileId}${ext}`;
}

/**
 * Generate a secure, opaque receipt number.
 *
 * @param prefix - Receipt prefix (e.g. 'REC', 'TXN')
 * @returns A non-sequential receipt ID like `REC-A1B2C3D4`
 */
export function generateReceiptNumber(prefix = 'REC'): string {
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${random}`;
}
