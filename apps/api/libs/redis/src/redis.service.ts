import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * RedisService — High-performance Redis caching & storage client.
 *
 * Implements a complete local in-memory fallback emulator when:
 *  - SKIP_REDIS=true is set in the environment.
 *  - Redis is unreachable (resilient fail-over to in-memory).
 *
 * Prevents MaxRetriesPerRequestError by setting maxRetriesPerRequest to null,
 * allowing background reconnection attempts without blocking application bootstrap.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null;
  private readonly logger = new Logger(RedisService.name);
  private isSkipped = false;

  // In-memory fallback databases for offline developer mode
  private readonly memoryDb = new Map<string, string>();
  private readonly hashDb = new Map<string, Map<string, string>>();
  private readonly setDb = new Map<string, Set<string>>();
  private readonly listDb = new Map<string, string[]>();
  private readonly zsetDb = new Map<string, Map<string, number>>();
  private readonly geoDb = new Map<string, Map<string, { lng: number; lat: number }>>();

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.isSkipped = this.config.get<string>('SKIP_REDIS') === 'true';

    if (this.isSkipped) {
      this.logger.warn('⚠️ Redis is SKIPPED (SKIP_REDIS=true). Running with in-memory fallback emulator.');
      return;
    }

    try {
      this.client = new Redis({
        host: this.config.get<string>('REDIS_HOST', 'localhost'),
        port: this.config.get<number>('REDIS_PORT', 6379),
        // No default: passing `undefined` explicitly picks ConfigService's
        // with-default overload, whose return type does not narrow to
        // `string | undefined`, and the whole `new Redis({...})` call then fails
        // to match any overload under strictNullChecks. The no-default form
        // already returns `string | undefined`, which is what an optional
        // password is.
        password: this.config.get<string>('REDIS_PASSWORD'),
        db: this.config.get<number>('REDIS_DB', 0),
        keyPrefix: this.config.get<string>('REDIS_KEY_PREFIX', ''),
        maxRetriesPerRequest: null, // [ignoring loop detection] prevents MaxRetriesPerRequestError
        retryStrategy: (times) => Math.min(times * 100, 3000),
        lazyConnect: false,
      });

      this.client.on('connect', () => this.logger.log('✅ Redis connected'));
      this.client.on('ready', () => this.logger.log('✅ Redis ready'));
      this.client.on('error', (err) => {
        this.logger.error(`❌ Redis error: ${err.message}`);
      });
      this.client.on('reconnecting', () => this.logger.warn('🔄 Redis reconnecting...'));
    } catch (err: any) {
      this.logger.error(`❌ Failed to initialize Redis client: ${err?.message}`);
      this.isSkipped = true;
    }
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.quit().catch(() => {});
    }
  }

  private useMemory(): boolean {
    return this.isSkipped || !this.client || this.client.status !== 'ready';
  }

  // ─── Core String Ops ──────────────────────────────────────────────────────
  async get(key: string): Promise<string | null> {
    if (this.useMemory()) {
      return this.memoryDb.get(key) || null;
    }
    try {
      return await this.client!.get(key);
    } catch (err: any) {
      this.logger.warn(`Redis GET failed: ${err.message}. Falling back to memory.`);
      return this.memoryDb.get(key) || null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.useMemory()) {
      this.memoryDb.set(key, value);
      return;
    }
    try {
      if (ttlSeconds) await this.client!.setex(key, ttlSeconds, value);
      else await this.client!.set(key, value);
    } catch (err: any) {
      this.logger.warn(`Redis SET failed: ${err.message}. Falling back to memory.`);
      this.memoryDb.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    if (this.useMemory()) {
      this.memoryDb.delete(key);
      this.hashDb.delete(key);
      this.setDb.delete(key);
      this.listDb.delete(key);
      this.zsetDb.delete(key);
      this.geoDb.delete(key);
      return;
    }
    try {
      await this.client!.del(key);
    } catch (err: any) {
      this.logger.warn(`Redis DEL failed: ${err.message}.`);
      this.memoryDb.delete(key);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (this.useMemory()) {
      return this.memoryDb.has(key) || this.hashDb.has(key) || this.setDb.has(key);
    }
    try {
      return (await this.client!.exists(key)) === 1;
    } catch (err: any) {
      return this.memoryDb.has(key);
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (this.useMemory()) return;
    try {
      await this.client!.expire(key, seconds);
    } catch (err: any) {
      this.logger.warn(`Redis EXPIRE failed: ${err.message}`);
    }
  }

  async ttl(key: string): Promise<number> {
    if (this.useMemory()) return -1;
    try {
      return await this.client!.ttl(key);
    } catch {
      return -1;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (this.useMemory()) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return Array.from(this.memoryDb.keys()).filter((k) => regex.test(k));
    }
    try {
      return await this.client!.keys(pattern);
    } catch {
      return [];
    }
  }

  async scan(cursor: string, ...args: string[]): Promise<[string, string[]]> {
    if (this.useMemory()) {
      // Extract MATCH pattern from args if provided
      const matchIdx = args.findIndex((a) => a.toUpperCase() === 'MATCH');
      const pattern = matchIdx !== -1 ? args[matchIdx + 1] : '*';
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      const allKeys = [
        ...Array.from(this.memoryDb.keys()),
        ...Array.from(this.hashDb.keys()),
        ...Array.from(this.setDb.keys()),
        ...Array.from(this.listDb.keys()),
        ...Array.from(this.zsetDb.keys()),
      ];
      const unique = Array.from(new Set(allKeys)).filter((k) => regex.test(k));
      return ['0', unique];
    }
    try {
      return await this.client!.scan(cursor, ...(args as []));
    } catch {
      return ['0', []];
    }
  }

  // ─── JSON Helpers ─────────────────────────────────────────────────────────
  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async getJSON<T>(key: string): Promise<T | null> {
    return this.getJson<T>(key);
  }

  async setJSON<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.setJson(key, value, ttlSeconds);
  }

  // ─── Batch Read Ops (N+1 elimination) ─────────────────────────────────────

  /**
   * Batch-read multiple string keys in a single Redis round-trip.
   * Equivalent to MGET key1 key2 key3 ...
   */
  async mget(keys: string[]): Promise<(string | null)[]> {
    if (keys.length === 0) return [];
    if (this.useMemory()) {
      return keys.map(k => this.memoryDb.get(k) || null);
    }
    try {
      return await this.client!.mget(...keys);
    } catch {
      return keys.map(k => this.memoryDb.get(k) || null);
    }
  }

  /**
   * Batch-read multiple JSON keys in a single round-trip.
   * Returns parsed objects (or null for missing/unparseable keys).
   */
  async mgetJson<T>(keys: string[]): Promise<(T | null)[]> {
    const raw = await this.mget(keys);
    return raw.map(r => {
      if (!r) return null;
      try { return JSON.parse(r) as T; } catch { return null; }
    });
  }

  /**
   * Batch-read multiple fields from a single hash in one round-trip.
   * Equivalent to HMGET key field1 field2 field3 ...
   */
  async hmget(key: string, fields: string[]): Promise<(string | null)[]> {
    if (fields.length === 0) return [];
    if (this.useMemory()) {
      const hash = this.hashDb.get(key);
      return fields.map(f => hash?.get(f) || null);
    }
    try {
      return await this.client!.hmget(key, ...fields);
    } catch {
      const hash = this.hashDb.get(key);
      return fields.map(f => hash?.get(f) || null);
    }
  }

  // ─── Increment / Atomic Counters ──────────────────────────────────────────
  async incr(key: string): Promise<number> {
    if (this.useMemory()) {
      const val = parseInt(this.memoryDb.get(key) || '0', 10) + 1;
      this.memoryDb.set(key, String(val));
      return val;
    }
    try {
      return await this.client!.incr(key);
    } catch {
      const val = parseInt(this.memoryDb.get(key) || '0', 10) + 1;
      this.memoryDb.set(key, String(val));
      return val;
    }
  }

  async incrBy(key: string, by: number): Promise<number> {
    if (this.useMemory()) {
      const val = parseInt(this.memoryDb.get(key) || '0', 10) + by;
      this.memoryDb.set(key, String(val));
      return val;
    }
    try {
      return await this.client!.incrby(key, by);
    } catch {
      const val = parseInt(this.memoryDb.get(key) || '0', 10) + by;
      this.memoryDb.set(key, String(val));
      return val;
    }
  }

  async decr(key: string): Promise<number> {
    if (this.useMemory()) {
      const val = parseInt(this.memoryDb.get(key) || '0', 10) - 1;
      this.memoryDb.set(key, String(val));
      return val;
    }
    try {
      return await this.client!.decr(key);
    } catch {
      const val = parseInt(this.memoryDb.get(key) || '0', 10) - 1;
      this.memoryDb.set(key, String(val));
      return val;
    }
  }

  // ─── Hash Ops ─────────────────────────────────────────────────────────────
  async hset(key: string, field: string, value: string): Promise<void> {
    if (this.useMemory()) {
      if (!this.hashDb.has(key)) this.hashDb.set(key, new Map());
      this.hashDb.get(key)!.set(field, value);
      return;
    }
    try {
      await this.client!.hset(key, field, value);
    } catch {
      if (!this.hashDb.has(key)) this.hashDb.set(key, new Map());
      this.hashDb.get(key)!.set(field, value);
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (this.useMemory()) {
      return this.hashDb.get(key)?.get(field) || null;
    }
    try {
      return await this.client!.hget(key, field);
    } catch {
      return this.hashDb.get(key)?.get(field) || null;
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (this.useMemory()) {
      const res: Record<string, string> = {};
      const fields = this.hashDb.get(key);
      if (fields) {
        for (const [f, v] of fields.entries()) res[f] = v;
      }
      return res;
    }
    try {
      return await this.client!.hgetall(key);
    } catch {
      const res: Record<string, string> = {};
      const fields = this.hashDb.get(key);
      if (fields) {
        for (const [f, v] of fields.entries()) res[f] = v;
      }
      return res;
    }
  }

  async hdel(key: string, field: string): Promise<void> {
    if (this.useMemory()) {
      this.hashDb.get(key)?.delete(field);
      return;
    }
    try {
      await this.client!.hdel(key, field);
    } catch {
      this.hashDb.get(key)?.delete(field);
    }
  }

  async hmset(key: string, data: Record<string, string>): Promise<void> {
    if (this.useMemory()) {
      if (!this.hashDb.has(key)) this.hashDb.set(key, new Map());
      const map = this.hashDb.get(key)!;
      for (const [f, v] of Object.entries(data)) {
        map.set(f, v);
      }
      return;
    }
    try {
      await this.client!.hmset(key, data);
    } catch {
      if (!this.hashDb.has(key)) this.hashDb.set(key, new Map());
      const map = this.hashDb.get(key)!;
      for (const [f, v] of Object.entries(data)) {
        map.set(f, v);
      }
    }
  }

  async hkeys(key: string): Promise<string[]> {
    if (this.useMemory()) {
      const map = this.hashDb.get(key);
      return map ? Array.from(map.keys()) : [];
    }
    try {
      return await this.client!.hkeys(key);
    } catch {
      const map = this.hashDb.get(key);
      return map ? Array.from(map.keys()) : [];
    }
  }

  async hvals(key: string): Promise<string[]> {
    if (this.useMemory()) {
      const map = this.hashDb.get(key);
      return map ? Array.from(map.values()) : [];
    }
    try {
      return await this.client!.hvals(key);
    } catch {
      const map = this.hashDb.get(key);
      return map ? Array.from(map.values()) : [];
    }
  }

  // ─── Set Ops ──────────────────────────────────────────────────────────────
  async sadd(key: string, ...members: string[]): Promise<number> {
    if (this.useMemory()) {
      if (!this.setDb.has(key)) this.setDb.set(key, new Set());
      const set = this.setDb.get(key)!;
      let added = 0;
      for (const m of members) {
        if (!set.has(m)) {
          set.add(m);
          added++;
        }
      }
      return added;
    }
    try {
      return await this.client!.sadd(key, ...members);
    } catch {
      if (!this.setDb.has(key)) this.setDb.set(key, new Set());
      const set = this.setDb.get(key)!;
      let added = 0;
      for (const m of members) {
        if (!set.has(m)) {
          set.add(m);
          added++;
        }
      }
      return added;
    }
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    if (this.useMemory()) {
      const set = this.setDb.get(key);
      if (!set) return 0;
      let removed = 0;
      for (const m of members) {
        if (set.delete(m)) removed++;
      }
      return removed;
    }
    try {
      return await this.client!.srem(key, ...members);
    } catch {
      const set = this.setDb.get(key);
      if (!set) return 0;
      let removed = 0;
      for (const m of members) {
        if (set.delete(m)) removed++;
      }
      return removed;
    }
  }

  async smembers(key: string): Promise<string[]> {
    if (this.useMemory()) {
      const set = this.setDb.get(key);
      return set ? Array.from(set) : [];
    }
    try {
      return await this.client!.smembers(key);
    } catch {
      const set = this.setDb.get(key);
      return set ? Array.from(set) : [];
    }
  }

  async sismember(key: string, member: string): Promise<boolean> {
    if (this.useMemory()) {
      return this.setDb.get(key)?.has(member) || false;
    }
    try {
      return (await this.client!.sismember(key, member)) === 1;
    } catch {
      return this.setDb.get(key)?.has(member) || false;
    }
  }

  async scard(key: string): Promise<number> {
    if (this.useMemory()) {
      return this.setDb.get(key)?.size || 0;
    }
    try {
      return await this.client!.scard(key);
    } catch {
      return this.setDb.get(key)?.size || 0;
    }
  }

  // ─── List Ops ─────────────────────────────────────────────────────────────
  async lpush(key: string, ...values: string[]): Promise<number> {
    if (this.useMemory()) {
      if (!this.listDb.has(key)) this.listDb.set(key, []);
      this.listDb.get(key)!.unshift(...values.reverse());
      return this.listDb.get(key)!.length;
    }
    try {
      return await this.client!.lpush(key, ...values);
    } catch {
      if (!this.listDb.has(key)) this.listDb.set(key, []);
      this.listDb.get(key)!.unshift(...values.reverse());
      return this.listDb.get(key)!.length;
    }
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    if (this.useMemory()) {
      if (!this.listDb.has(key)) this.listDb.set(key, []);
      this.listDb.get(key)!.push(...values);
      return this.listDb.get(key)!.length;
    }
    try {
      return await this.client!.rpush(key, ...values);
    } catch {
      if (!this.listDb.has(key)) this.listDb.set(key, []);
      this.listDb.get(key)!.push(...values);
      return this.listDb.get(key)!.length;
    }
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    if (this.useMemory()) {
      const list = this.listDb.get(key) || [];
      const end = stop === -1 ? list.length : stop + 1;
      return list.slice(start, end);
    }
    try {
      return await this.client!.lrange(key, start, stop);
    } catch {
      const list = this.listDb.get(key) || [];
      const end = stop === -1 ? list.length : stop + 1;
      return list.slice(start, end);
    }
  }

  async ltrim(key: string, start: number, stop: number): Promise<void> {
    if (this.useMemory()) {
      const list = this.listDb.get(key) || [];
      const end = stop === -1 ? list.length : stop + 1;
      this.listDb.set(key, list.slice(start, end));
      return;
    }
    try {
      await this.client!.ltrim(key, start, stop);
    } catch {
      const list = this.listDb.get(key) || [];
      const end = stop === -1 ? list.length : stop + 1;
      this.listDb.set(key, list.slice(start, end));
    }
  }

  async llen(key: string): Promise<number> {
    if (this.useMemory()) {
      return this.listDb.get(key)?.length || 0;
    }
    try {
      return await this.client!.llen(key);
    } catch {
      return this.listDb.get(key)?.length || 0;
    }
  }

  // ─── Sorted Set Ops ───────────────────────────────────────────────────────
  async zadd(key: string, score: number, member: string): Promise<number> {
    if (this.useMemory()) {
      if (!this.zsetDb.has(key)) this.zsetDb.set(key, new Map());
      const map = this.zsetDb.get(key)!;
      const isNew = !map.has(member);
      map.set(member, score);
      return isNew ? 1 : 0;
    }
    try {
      return await this.client!.zadd(key, score, member);
    } catch {
      if (!this.zsetDb.has(key)) this.zsetDb.set(key, new Map());
      const map = this.zsetDb.get(key)!;
      const isNew = !map.has(member);
      map.set(member, score);
      return isNew ? 1 : 0;
    }
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    if (this.useMemory()) {
      const map = this.zsetDb.get(key);
      if (!map) return [];
      const sorted = Array.from(map.entries()).sort((a, b) => a[1] - b[1]);
      const end = stop === -1 ? sorted.length : stop + 1;
      return sorted.slice(start, end).map(([m]) => m);
    }
    try {
      return await this.client!.zrange(key, start, stop);
    } catch {
      const map = this.zsetDb.get(key);
      if (!map) return [];
      const sorted = Array.from(map.entries()).sort((a, b) => a[1] - b[1]);
      const end = stop === -1 ? sorted.length : stop + 1;
      return sorted.slice(start, end).map(([m]) => m);
    }
  }

  /**
   * Returns members of a sorted set in reverse score order (high → low).
   * Replaces the deprecated ZREVRANGE command removed in Redis 8.
   * Uses `ZRANGE key start stop REV` (available since Redis 6.2).
   */
  async zrangeRev(key: string, start: number, stop: number, withScores?: boolean): Promise<string[]> {
    if (this.useMemory()) {
      const map = this.zsetDb.get(key);
      if (!map) return [];
      const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
      const end = stop === -1 ? sorted.length : stop + 1;
      const sliced = sorted.slice(start, end);
      if (withScores) {
        const res: string[] = [];
        for (const [m, s] of sliced) {
          res.push(m, String(s));
        }
        return res;
      }
      return sliced.map(([m]) => m);
    }
    try {
      // ZRANGE with REV flag replaces deprecated ZREVRANGE (Redis 6.2+, Redis 8 compatible)
      if (withScores) return await (this.client as any).zrange(key, start, stop, 'REV', 'WITHSCORES');
      return await (this.client as any).zrange(key, start, stop, 'REV');
    } catch {
      const map = this.zsetDb.get(key);
      if (!map) return [];
      const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
      const end = stop === -1 ? sorted.length : stop + 1;
      const sliced = sorted.slice(start, end);
      if (withScores) {
        const res: string[] = [];
        for (const [m, s] of sliced) {
          res.push(m, String(s));
        }
        return res;
      }
      return sliced.map(([m]) => m);
    }
  }

  /** @deprecated Use zrangeRev() — ZREVRANGE was removed in Redis 8. */
  async zrevrange(key: string, start: number, stop: number, withScores?: boolean): Promise<string[]> {
    return this.zrangeRev(key, start, stop, withScores);
  }

  async zrem(key: string, member: string): Promise<number> {
    if (this.useMemory()) {
      const map = this.zsetDb.get(key);
      if (!map) return 0;
      return map.delete(member) ? 1 : 0;
    }
    try {
      return await this.client!.zrem(key, member);
    } catch {
      const map = this.zsetDb.get(key);
      if (!map) return 0;
      return map.delete(member) ? 1 : 0;
    }
  }

  async zscore(key: string, member: string): Promise<string | null> {
    if (this.useMemory()) {
      const val = this.zsetDb.get(key)?.get(member);
      return val !== undefined ? String(val) : null;
    }
    try {
      return await this.client!.zscore(key, member);
    } catch {
      const val = this.zsetDb.get(key)?.get(member);
      return val !== undefined ? String(val) : null;
    }
  }

  async zcard(key: string): Promise<number> {
    if (this.useMemory()) {
      return this.zsetDb.get(key)?.size || 0;
    }
    try {
      return await this.client!.zcard(key);
    } catch {
      return this.zsetDb.get(key)?.size || 0;
    }
  }

  async zincrby(key: string, increment: number, member: string): Promise<string> {
    if (this.useMemory()) {
      if (!this.zsetDb.has(key)) this.zsetDb.set(key, new Map());
      const map = this.zsetDb.get(key)!;
      const current = map.get(member) || 0;
      const newScore = current + increment;
      map.set(member, newScore);
      return newScore.toString();
    }
    try {
      return await this.client!.zincrby(key, increment, member);
    } catch {
      if (!this.zsetDb.has(key)) this.zsetDb.set(key, new Map());
      const map = this.zsetDb.get(key)!;
      const current = map.get(member) || 0;
      const newScore = current + increment;
      map.set(member, newScore);
      return newScore.toString();
    }
  }

  // ─── GEO Ops ──────────────────────────────────────────────────────────────
  async geoadd(key: string, longitude: number, latitude: number, member: string): Promise<number> {
    if (this.useMemory()) {
      if (!this.geoDb.has(key)) this.geoDb.set(key, new Map());
      this.geoDb.get(key)!.set(member, { lng: longitude, lat: latitude });
      return 1;
    }
    try {
      return await this.client!.geoadd(key, longitude, latitude, member);
    } catch {
      if (!this.geoDb.has(key)) this.geoDb.set(key, new Map());
      this.geoDb.get(key)!.set(member, { lng: longitude, lat: latitude });
      return 1;
    }
  }

  async geopos(key: string, member: string): Promise<[number, number] | null> {
    if (this.useMemory()) {
      const coords = this.geoDb.get(key)?.get(member);
      return coords ? [coords.lng, coords.lat] : null;
    }
    try {
      const result = await this.client!.geopos(key, member);
      if (!result || !result[0]) return null;
      const [lon, lat] = result[0] as [string, string];
      return [parseFloat(lon), parseFloat(lat)];
    } catch {
      const coords = this.geoDb.get(key)?.get(member);
      return coords ? [coords.lng, coords.lat] : null;
    }
  }

  async geodist(key: string, member1: string, member2: string, unit: 'm' | 'km' | 'ft' | 'mi' = 'km'): Promise<number | null> {
    if (this.useMemory()) {
      const pos1 = await this.geopos(key, member1);
      const pos2 = await this.geopos(key, member2);
      if (!pos1 || !pos2) return null;

      // Haversine formula
      const R = 6371; // Earth radius in km
      const dLat = ((pos2[1] - pos1[1]) * Math.PI) / 180;
      const dLon = ((pos2[0] - pos1[0]) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((pos1[1] * Math.PI) / 180) *
          Math.cos((pos2[1] * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distKm = R * c;

      if (unit === 'm') return distKm * 1000;
      if (unit === 'ft') return distKm * 3280.84;
      if (unit === 'mi') return distKm * 0.621371;
      return distKm;
    }
    try {
      const d = await (this.client as any).geodist(key, member1, member2, unit) as string | null;
      return d ? parseFloat(d) : null;
    } catch {
      return null;
    }
  }

  /**
   * Finds geo members within a radius of a given coordinate.
   * Replaces the removed GEORADIUS command (removed in Redis 8).
   * Uses `GEOSEARCH key FROMLONLAT lng lat BYRADIUS r km ASC COUNT 50 WITHCOORD WITHDIST`
   * which is the Redis 6.2+ / Redis 8 compatible equivalent.
   */
  async georadius(
    key: string,
    longitude: number,
    latitude: number,
    radiusKm: number,
  ): Promise<Array<{ member: string; lat: number; lng: number; dist: number }>> {
    if (this.useMemory()) {
      const map = this.geoDb.get(key);
      if (!map) return [];
      const results: Array<{ member: string; lat: number; lng: number; dist: number }> = [];

      for (const [member, pos] of map.entries()) {
        // Haversine distance from input coordinates to stored member position
        const R = 6371;
        const dLat = ((pos.lat - latitude) * Math.PI) / 180;
        const dLon = ((pos.lng - longitude) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((latitude * Math.PI) / 180) *
            Math.cos((pos.lat * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const calcDist = R * c;

        if (calcDist <= radiusKm) {
          results.push({ member, lat: pos.lat, lng: pos.lng, dist: calcDist });
        }
      }
      return results.sort((a, b) => a.dist - b.dist);
    }
    try {
      // GEOSEARCH replaces GEORADIUS (removed in Redis 8) — Redis 6.2+ compatible
      const raw = await (this.client as any).geosearch(
        key,
        'FROMLONLAT', longitude, latitude,
        'BYRADIUS', radiusKm, 'km',
        'ASC',
        'COUNT', 50,
        'WITHCOORD',
        'WITHDIST',
      );
      if (!raw) return [];
      return (raw as any[]).map((r: any) => ({
        member: r[0] as string,
        dist: parseFloat(r[1] as string),
        lng: parseFloat((r[2] as string[])[0]),
        lat: parseFloat((r[2] as string[])[1]),
      }));
    } catch {
      return [];
    }
  }

  async geodel(key: string, member: string): Promise<void> {
    if (this.useMemory()) {
      this.geoDb.get(key)?.delete(member);
      return;
    }
    try {
      await this.client!.zrem(key, member);
    } catch {
      this.geoDb.get(key)?.delete(member);
    }
  }

  // ─── Pub/Sub ──────────────────────────────────────────────────────────────
  async publish(channel: string, message: string): Promise<number> {
    if (this.useMemory()) return 0;
    try {
      return await this.client!.publish(channel, message);
    } catch {
      return 0;
    }
  }

  // ─── Session Helpers ──────────────────────────────────────────────────────
  async setSession(sessionId: string, data: object, ttl = 86400): Promise<void> {
    await this.setJson(`session:${sessionId}`, data, ttl);
  }

  async getSession<T>(sessionId: string): Promise<T | null> {
    return this.getJson<T>(`session:${sessionId}`);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.del(`session:${sessionId}`);
  }

  // ─── Health Check ──────────────────────────────────────────────────────────
  async ping(): Promise<string> {
    if (this.useMemory()) return 'PONG (memory)';
    try {
      return await this.client!.ping();
    } catch {
      return 'PONG (memory fallback)';
    }
  }

  // ─── Pipeline / Multi ──────────────────────────────────────────────────────
  pipeline() {
    if (this.useMemory()) {
      // Chainable mock pipeline
      const mockPipe = {
        // Typed so the file compiles under `noImplicitAny`; ioredis' real
        // `exec` resolves to `[Error | null, unknown][]`.
        exec: async (): Promise<[Error | null, unknown][]> => [],
        set: function() { return this; },
        get: function() { return this; },
        del: function() { return this; },
      };
      return mockPipe as any;
    }
    return this.client!.pipeline();
  }

  multi() {
    if (this.useMemory()) {
      const mockMulti = {
        // Typed so the file compiles under `noImplicitAny`; ioredis' real
        // `exec` resolves to `[Error | null, unknown][]`.
        exec: async (): Promise<[Error | null, unknown][]> => [],
        set: function() { return this; },
        get: function() { return this; },
        del: function() { return this; },
      };
      return mockMulti as any;
    }
    return this.client!.multi();
  }

  getClient(): Redis {
    return this.client!;
  }
}
