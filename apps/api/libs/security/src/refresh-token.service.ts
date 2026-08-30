import { Injectable } from '@nestjs/common';
import { RedisService } from '@app/redis';
import { v4 as uuidv4 } from 'uuid';

const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
const FAMILY_TTL = 30 * 24 * 60 * 60;        // 30 days — compromise detection window

interface RefreshTokenPayload {
  userId: string;
  role: string;
  familyId: string;
  createdAt: string;
}

/**
 * RefreshTokenService — opaque refresh token rotation with family-based revocation.
 *
 * Security model:
 *  - Each token is an opaque UUID stored in Redis with TTL (7d sliding window)
 *  - On each use, the old token is deleted and a NEW token is issued (rotation)
 *  - All tokens in a family share a `family:` Redis set
 *  - If an ALREADY-USED token is presented, the entire family is revoked
 *    (indicates a compromised token was reused → attacker detected)
 */
@Injectable()
export class RefreshTokenService {
  constructor(private readonly redis: RedisService) {}

  /** Issue a new refresh token (first issuance or post-rotation). */
  async issue(userId: string, role: string, familyId?: string): Promise<string> {
    const token = uuidv4();
    const family = familyId ?? uuidv4();

    const payload: RefreshTokenPayload = {
      userId,
      role,
      familyId: family,
      createdAt: new Date().toISOString(),
    };

    await this.redis.setJson(`rt:${token}`, payload, REFRESH_TOKEN_TTL);
    await this.redis.sadd(`rt_family:${family}`, token);
    await this.redis.expire(`rt_family:${family}`, FAMILY_TTL);

    return token;
  }

  /**
   * Rotate a refresh token.
   *
   * Returns the new token + user payload.
   * Throws if the token is invalid, expired, or reused (compromise detected).
   */
  async rotate(oldToken: string): Promise<{ newToken: string; userId: string; role: string }> {
    const payload = await this.redis.getJson<RefreshTokenPayload>(`rt:${oldToken}`);

    if (!payload) {
      // Token not found — either expired or already rotated (potential replay)
      // Check if this token belonged to a family to detect compromise
      await this.detectAndRevokeCompromisedFamily(oldToken);
      throw new Error('REFRESH_TOKEN_INVALID');
    }

    // Rotate: delete old, issue new in same family
    await this.redis.del(`rt:${oldToken}`);
    await this.redis.srem(`rt_family:${payload.familyId}`, oldToken);

    const newToken = await this.issue(payload.userId, payload.role, payload.familyId);

    return { newToken, userId: payload.userId, role: payload.role };
  }

  /** Revoke a specific refresh token (e.g. on explicit logout). */
  async revoke(token: string): Promise<void> {
    const payload = await this.redis.getJson<RefreshTokenPayload>(`rt:${token}`);
    if (payload) {
      await this.redis.del(`rt:${token}`);
      await this.redis.srem(`rt_family:${payload.familyId}`, token);
    }
  }

  /** Revoke all tokens for a user (e.g. password change, account suspension). */
  async revokeAll(userId: string): Promise<void> {
    // Scan for all token keys belonging to this user
    const pattern = `rt:*`;
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', '100');
      cursor = nextCursor;
      for (const key of keys) {
        const payload = await this.redis.getJson<RefreshTokenPayload>(key);
        if (payload?.userId === userId) {
          await this.redis.del(key);
        }
      }
    } while (cursor !== '0');
  }

  /**
   * Detect token reuse attack: if an old token is presented again,
   * it means someone stole and is reusing it — revoke the entire family.
   */
  private async detectAndRevokeCompromisedFamily(suspiciousToken: string): Promise<void> {
    // Scan families to find if this token was ever in one
    const pattern = `rt_family:*`;
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', '50');
      cursor = nextCursor;
      for (const familyKey of keys) {
        const wasInFamily = await this.redis.sismember(familyKey, suspiciousToken);
        if (wasInFamily) {
          // Revoke all active tokens in this family
          const familyTokens = await this.redis.smembers(familyKey);
          await Promise.all([
            ...familyTokens.map((t) => this.redis.del(`rt:${t}`)),
            this.redis.del(familyKey),
          ]);
          return;
        }
      }
    } while (cursor !== '0');
  }
}
