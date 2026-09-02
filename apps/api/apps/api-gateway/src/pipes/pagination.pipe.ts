import { type PipeTransform, Injectable } from '@nestjs/common';

/** Hard ceiling for any single page of results. */
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

/**
 * ParseLimitPipe — clamps a `limit` query parameter to a safe range.
 *
 * List routes accepted an uncapped `limit`, so `?limit=100000` was answered with a
 * 200 — an unauthenticated caller could force a full-table scan and serialise the
 * entire catalogue. See docs/MARKETPLACE_FULLSTACK_AUDIT_2026-07-27.md (H3).
 *
 * Clamps rather than rejects: an oversized page is a client bug, not an attack worth
 * a 400, and returning MAX_PAGE_SIZE keeps existing callers working.
 *
 * Usage: `@Query('limit', ParseLimitPipe) limit: number`
 */
@Injectable()
export class ParseLimitPipe implements PipeTransform<unknown, number> {
  transform(value: unknown): number {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return DEFAULT_PAGE_SIZE;
    return Math.min(Math.floor(n), MAX_PAGE_SIZE);
  }
}

/**
 * ParsePagePipe — normalises a `page` query parameter to a positive integer.
 * A negative or non-numeric page produced a negative OFFSET downstream.
 */
@Injectable()
export class ParsePagePipe implements PipeTransform<unknown, number> {
  transform(value: unknown): number {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.floor(n);
  }
}
