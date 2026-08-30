import { BadRequestException } from '@nestjs/common';
import { requireId, requireUuid } from './rpc-payload';

/**
 * Guards on identifiers arriving over RPC.
 *
 * Both failures these prevent are silent. An absent id reaches
 * `WHERE id = NULL`, which Postgres answers with zero rows — indistinguishable
 * from "not found". A malformed id reaches a `uuid` column, which Postgres
 * rejects with `invalid input syntax for type uuid`; that surfaced to callers
 * as a 500 carrying the database's own error text.
 *
 * The third case is the dangerous one: TypeORM *discards* an undefined
 * condition rather than narrowing on it, so `findOne({ where: { id: undefined } })`
 * returns the first row in the table. A "not found" guard downstream is then
 * checking an arbitrary record.
 */
describe('RPC identifier guards', () => {
  describe('requireId', () => {
    it('rejects a missing id and names the subject', () => {
      expect(() => requireId(undefined, 'product')).toThrow(BadRequestException);
      expect(() => requireId(undefined, 'product')).toThrow(/product id is required/i);
      expect(() => requireId('', 'store')).toThrow(BadRequestException);
    });

    it('passes a present id through unchanged', () => {
      expect(requireId('anything', 'store')).toBe('anything');
    });
  });

  describe('requireUuid', () => {
    const VALID = '126e8f9a-7b6f-4cb0-b5fd-13a6c96f2789';

    it('accepts a well-formed uuid', () => {
      expect(requireUuid(VALID, 'store')).toBe(VALID);
    });

    it('rejects a malformed id before it reaches a uuid column', () => {
      expect(() => requireUuid('not-a-uuid', 'store')).toThrow(BadRequestException);
      expect(() => requireUuid('123', 'store')).toThrow(BadRequestException);
      // A uuid with a bad version nibble is still rejected.
      expect(() => requireUuid('126e8f9a-7b6f-0cb0-b5fd-13a6c96f2789', 'store'))
        .toThrow(BadRequestException);
    });

    it('still rejects a missing id', () => {
      expect(() => requireUuid(undefined, 'product')).toThrow(/product id is required/i);
    });

    it('discloses nothing about storage in the message', () => {
      // The 500 this replaces read: invalid input syntax for type uuid: "x".
      try {
        requireUuid('not-a-uuid', 'store');
        throw new Error('should have thrown');
      } catch (e) {
        const msg = (e as Error).message;
        expect(msg).not.toMatch(/uuid/i);
        expect(msg).not.toMatch(/syntax|postgres|column/i);
        expect(msg).toMatch(/valid store id/i);
      }
    });
  });
});
