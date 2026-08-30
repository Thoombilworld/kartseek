import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * KARTSEEK — wallet and payout storage
 *
 * Creates the `wallet` and `payout` schemas and their two tables.
 *
 * Why: neither schema had ever been created. `wallet-service` declares
 * `DatabaseModule.registerPostgres([WalletTransaction], 'wallet')` and
 * `payout-service` declares `schema: 'payout'`, but nothing in `migrations/`
 * created either, and `DB_SYNCHRONIZE` is (correctly) false because every
 * service shares one database.
 *
 * That went unnoticed because both services were also bootstrapping the wrong
 * Nest module — a stub with no TypeORM registration at all — so they crashed on
 * `Nest can't resolve dependencies of the WalletService (…, ?)` long before any
 * query ran, and never bound their TCP ports. With the bootstrap corrected the
 * missing schema becomes the next failure, so both are fixed together.
 *
 * Consequence while broken: the gateway's seller wallet, payouts, transactions
 * and commissions routes all timed out against a dead TCP port and fell back to
 * invented figures — the portal reported a balance of ₹1,000 to every seller.
 *
 * Columns mirror the entities exactly (`SellerWallet`, `WalletTransaction`);
 * TypeORM's default naming strategy is camelCase, so the identifiers are quoted.
 */
export class WalletAndPayoutSchemas1785840000000 implements MigrationInterface {
  name = 'WalletAndPayoutSchemas1785840000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "payout"`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "wallet"`);

    // ── payout.seller_wallets ────────────────────────────────────────────────
    // One row per seller. `availableBalance` is what they may withdraw;
    // `escrowBalance` is order money held until the return window closes.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payout"."seller_wallets" (
        "sellerId"         character varying NOT NULL,
        "availableBalance" numeric(12,2) NOT NULL DEFAULT 0,
        "escrowBalance"    numeric(12,2) NOT NULL DEFAULT 0,
        "createdAt"        TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"        TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_seller_wallets" PRIMARY KEY ("sellerId")
      )
    `);

    // ── payout.payouts ───────────────────────────────────────────────────────
    // Withdrawal requests and their lifecycle. These used to exist only in Redis
    // under a 90-day TTL, so the record of money paid to a seller deleted itself
    // after three months and `getPayoutStats` scanned the keyspace with `KEYS`.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payout"."payouts" (
        "id"             character varying NOT NULL,
        "seller_id"      character varying NOT NULL,
        "amount"         numeric(12,2) NOT NULL,
        "method"         character varying NOT NULL DEFAULT 'bank',
        "bankAccount"    character varying,
        "ifscCode"       character varying,
        "upiId"          character varying,
        "status"         character varying NOT NULL DEFAULT 'PENDING',
        "requestedAt"    TIMESTAMP NOT NULL DEFAULT now(),
        "processedBy"    character varying,
        "processedAt"    TIMESTAMP,
        "failureReason"  text,
        "transactionRef" character varying,
        "updatedAt"      TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payouts" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payouts_seller_requested"
        ON "payout"."payouts" ("seller_id", "requestedAt" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payouts_status" ON "payout"."payouts" ("status")
    `);

    // ── wallet.wallet_transactions ───────────────────────────────────────────
    // Append-only ledger. `balanceBefore`/`balanceAfter` are stored per row so a
    // statement can be reconciled without replaying every prior transaction.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wallet"."wallet_transactions" (
        "id"            character varying NOT NULL,
        "userId"        character varying NOT NULL,
        "type"          character varying(10) NOT NULL,
        "amount"        numeric(12,2) NOT NULL,
        "reason"        character varying NOT NULL,
        "referenceId"   character varying,
        "balanceBefore" numeric(12,2) NOT NULL,
        "balanceAfter"  numeric(12,2) NOT NULL,
        "currency"      character varying(10) NOT NULL DEFAULT 'INR',
        "module"        character varying(30),
        "createdAt"     TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wallet_transactions" PRIMARY KEY ("id")
      )
    `);

    // Statements are always read per user, newest first.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_wallet_transactions_userId"
        ON "wallet"."wallet_transactions" ("userId")
    `);
    // Refund and order reconciliation looks up by the originating reference.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_wallet_transactions_referenceId"
        ON "wallet"."wallet_transactions" ("referenceId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_wallet_transactions_userId_createdAt"
        ON "wallet"."wallet_transactions" ("userId", "createdAt" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "wallet"."wallet_transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payout"."payouts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payout"."seller_wallets"`);
    // The schemas are dropped only if this migration is the only thing in them.
    await queryRunner.query(`DROP SCHEMA IF EXISTS "wallet" RESTRICT`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS "payout" RESTRICT`);
  }
}
