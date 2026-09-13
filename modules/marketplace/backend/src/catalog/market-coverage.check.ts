import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { getActiveRegionCodes } from '@app/region';
import { Seller } from '../entities/seller.entity';
import { ProductListing } from '../entities/product-listing.entity';

/**
 * Says, at boot, which database this service reads and whether every active
 * market has a seller that can serve it.
 *
 * Why this exists: on 2026-09-13 the service was reading a database whose
 * `marketplace` schema was a stale copy — one Qatari official store, marked
 * SUSPENDED, and no seller at all for India, the UAE or Saudi Arabia — while
 * the seeds and the verification scripts had been run against a different
 * instance. Readiness said `database: up` because `SELECT 1` succeeded, every
 * page rendered, and the storefront showed list prices with no buy box and an
 * empty category for any shopper outside Qatar. Nothing in the process ever
 * printed which database it had opened.
 *
 * This check prints the target and, per active market, the count of sellers
 * that are VERIFIED and active — the predicate `liveListingFor` applies. A zero
 * is logged at ERROR, because a market with no live seller is a market whose
 * every listing is empty; that is the exact shape of the incident and it is
 * cheap to name at boot rather than discover from a customer.
 *
 * It does not refuse to boot: an empty market is a data state an operator
 * repairs with the seed, and a service that will not start cannot serve the
 * markets that are fine.
 */
@Injectable()
export class MarketCoverageCheck implements OnApplicationBootstrap {
  private readonly logger = new Logger(MarketCoverageCheck.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.SKIP_DB === 'true') return;
    try {
      const report = await MarketCoverageCheck.inspect(this.dataSource);
      this.logger.log(
        `database target: ${report.host}:${report.port}/${report.database} (schema ${report.schema}, ${report.sellersTotal} seller rows)`,
      );
      for (const market of report.markets) {
        const line = `market ${market.code}: ${market.liveSellers} live seller(s), ${market.liveListings} live listing(s)`;
        if (market.liveSellers === 0) {
          this.logger.error(
            `${line} — every catalogue read for ${market.code} will be EMPTY. ` +
              'Run scripts/maintenance/marketplace-catalog/marketplace-markets-seed.mjs against THIS database.',
          );
        } else {
          this.logger.log(line);
        }
      }
    } catch (err) {
      // The check is diagnostic; a failure here must not stop the service.
      this.logger.warn(`market coverage check skipped: ${(err as Error)?.message}`);
    }
  }

  /** Pure query side, exported for the spec and for verification scripts. */
  static async inspect(dataSource: DataSource) {
    const options = dataSource.options as { host?: string; port?: number; database?: string };
    const sellers = dataSource.getMetadata(Seller).tablePath;
    const listings = dataSource.getMetadata(ProductListing).tablePath;
    const codes = getActiveRegionCodes();

    const [{ n: sellersTotal }] = (await dataSource.query(
      `SELECT COUNT(*)::int AS n FROM ${sellers}`,
    )) as Array<{ n: number }>;

    const rows = (await dataSource.query(
      `SELECT s.region_code AS code,
              COUNT(DISTINCT s.id)::int AS live_sellers,
              COUNT(l.id)::int AS live_listings
         FROM ${sellers} s
         LEFT JOIN ${listings} l
           ON l.seller_id = s.id AND l."isActive" = true AND l."approvalStatus" = 'APPROVED'
        WHERE s."isActive" = true AND s."verificationStatus" = 'VERIFIED'
        GROUP BY s.region_code`,
    )) as Array<{ code: string | null; live_sellers: number; live_listings: number }>;

    const byCode = new Map(rows.map((r) => [r.code ?? 'NULL', r]));
    return {
      host: options.host ?? 'unknown',
      port: options.port ?? 0,
      database: options.database ?? 'unknown',
      schema: dataSource.getMetadata(Seller).schema ?? 'public',
      sellersTotal,
      markets: codes.map((code) => ({
        code,
        liveSellers: byCode.get(code)?.live_sellers ?? 0,
        liveListings: byCode.get(code)?.live_listings ?? 0,
      })),
    };
  }
}
