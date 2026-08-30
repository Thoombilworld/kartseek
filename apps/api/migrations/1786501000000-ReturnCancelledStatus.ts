import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * KARTSEEK — add `CANCELLED` to the return-request status enum.
 *
 * `PUT /marketplace/returns/:id/cancel` lets a customer withdraw a return they
 * raised. There was no state to move the row into: the enum runs REQUESTED →
 * APPROVED / REJECTED → PICKUP_ASSIGNED → PICKED_UP → RECEIVED → QC_* →
 * REFUNDED / REPLACEMENT_SHIPPED → CLOSED, all of which describe something the
 * *seller* or the platform did.
 *
 * The nearest existing values are both wrong: `REJECTED` records a seller
 * refusing the return, and `CLOSED` is the ordinary end of a completed one.
 * Either would misreport why the request ended, in a table that feeds refund
 * reporting.
 *
 * `ALTER TYPE … ADD VALUE` is transactional from PostgreSQL 12 onward as long
 * as the new label is not *used* in the same transaction, which is why this
 * migration only adds it — the first row to carry it is written later, by the
 * service.
 */
export class ReturnCancelledStatus1786501000000 implements MigrationInterface {
  name = 'ReturnCancelledStatus1786501000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "marketplace"."return_requests_status_enum"
      ADD VALUE IF NOT EXISTS 'CANCELLED'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Postgres cannot drop a value from an enum. Reverting would mean rebuilding
    // the type and rewriting every row that references it, which would silently
    // rewrite the status of any return already cancelled. Refusing is the honest
    // answer: this migration is forward-only.
    throw new Error(
      'ReturnCancelledStatus is irreversible: PostgreSQL cannot remove an enum value, ' +
      'and rebuilding the type would rewrite the status of returns already cancelled.',
    );
  }
}
