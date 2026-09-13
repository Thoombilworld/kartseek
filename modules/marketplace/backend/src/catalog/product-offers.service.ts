import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { MarketplaceAdminService } from '../admin/admin.service';
import { CatalogService } from './catalog.service';
import { currentRequestId } from '../transport/request-context';

/**
 * Instalment plans, per market. A market that is not listed here offers no
 * instalments and the page hides the section — that is the truthful answer
 * until plans are configured per bank and market in data.
 *
 * India's plans are the ones the previous hard-coded quote carried (the
 * banks and rates it named); they are now quoted on the market's buy-box
 * price rather than on the list price, and never on another market's page.
 */
const EMI_PLANS_BY_MARKET: Record<
  string,
  {
    currency: string;
    minimumOrder: number;
    plans: Array<{ tenure: number; bank: string; interestRate: number; label: string }>;
  }
> = {
  IN: {
    currency: 'INR',
    minimumOrder: 3000,
    plans: [
      { tenure: 3, bank: 'All banks', interestRate: 0, label: 'No-cost EMI' },
      { tenure: 6, bank: 'HDFC / ICICI / SBI', interestRate: 12, label: 'Low interest' },
      { tenure: 9, bank: 'HDFC / ICICI', interestRate: 14, label: 'Standard EMI' },
      { tenure: 12, bank: 'All banks', interestRate: 16, label: '12 months' },
      { tenure: 18, bank: 'HDFC / SBI', interestRate: 18, label: '18 months' },
      { tenure: 24, bank: 'HDFC', interestRate: 18, label: '24 months' },
    ],
  },
};

const PUBLIC_PRODUCT = { is_active: true, approval_status: 'APPROVED', status: 'ACTIVE' } as const;

/**
 * Offers and finance for one product in one market.
 *
 * `get_offers_for_product` answered with every active offer for a category
 * *name* and ignored the product and the market, so a Qatar page quoted
 * Indian bank offers; `get_emi_options` quoted Indian banks in rupees on the
 * list price for every market. Both reads are keyed on (product, market) here.
 */
@Injectable()
export class ProductOffersService {
  constructor(
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    private readonly admin: MarketplaceAdminService,
    private readonly catalog: CatalogService,
  ) {}

  private static market(country?: string): string | undefined {
    const code = String(country ?? '')
      .trim()
      .toUpperCase();
    return /^[A-Z]{2}$/.test(code) ? code : undefined;
  }

  /** Bank and exchange offers that apply to this product, in this market, right now. */
  async offersForProduct(productId: string, country?: string) {
    const market = ProductOffersService.market(country);
    const product = await this.productRepo.findOne({
      where: { id: productId, ...PUBLIC_PRODUCT },
      relations: { category: true, subcategory: true, brand: true },
    });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const [bank, exchange] = await Promise.all([
      this.admin.listBankOffers(true, undefined, market),
      this.admin.listExchangeOffers(true, undefined, market),
    ]);
    const now = Date.now();
    const live = (o: any) =>
      (!o?.startsAt || new Date(o.startsAt).getTime() <= now) &&
      (!o?.expiresAt || new Date(o.expiresAt).getTime() >= now);
    const categoryKeys = new Set(
      [
        product.category?.slug,
        product.category?.name,
        product.subcategory?.slug,
        product.subcategory?.name,
      ]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase()),
    );
    const listHas = (list: unknown, key: string | undefined) =>
      Array.isArray(list) && list.length > 0 && !!key && list.map(String).includes(key);
    const listEmpty = (list: unknown) => !Array.isArray(list) || list.length === 0;
    const categoryMatches = (list: unknown) =>
      listEmpty(list) ||
      (Array.isArray(list) && list.some((c) => categoryKeys.has(String(c).toLowerCase())));
    const marketMatches = (list: unknown) =>
      !market || listEmpty(list) || (Array.isArray(list) && list.map(String).includes(market));

    const bankOffers = (bank?.data ?? [])
      .filter(
        (o: any) =>
          live(o) &&
          categoryMatches(o.applicableCategories) &&
          marketMatches(o.applicableCountries),
      )
      .map((o: any) => ({
        id: o.id,
        title: o.title,
        description: o.description,
        bankName: o.bankName,
        cardType: o.cardType,
        cardNetwork: o.cardNetwork,
        discountType: o.discountType,
        discountValue: o.discountValue,
        maxDiscount: o.maxDiscount,
        minOrderValue: o.minOrderValue,
        termsAndConditions: o.termsAndConditions,
        logoUrl: o.logoUrl,
        startsAt: o.startsAt,
        expiresAt: o.expiresAt,
      }));

    const exchangeOffers = (exchange?.data ?? [])
      .filter((o: any) => {
        if (!live(o)) return false;
        const targeted = !listEmpty(o.applicableProductIds) || !listEmpty(o.applicableBrandIds);
        if (targeted) {
          return (
            listHas(o.applicableProductIds, product.id) ||
            listHas(o.applicableBrandIds, product.brand?.id)
          );
        }
        const target = String(o.targetCategory ?? '').toLowerCase();
        return !target || categoryKeys.has(target);
      })
      .map((o: any) => ({
        id: o.id,
        title: o.title,
        description: o.description,
        maxExchangeValue: o.maxExchangeValue,
        minExchangeValue: o.minExchangeValue,
        bonusAmount: o.bonusAmount,
        fulfillmentMode: o.fulfillmentMode,
        iconUrl: o.iconUrl,
        expiresAt: o.expiresAt,
      }));

    return { productId: product.id, market: market ?? null, bankOffers, exchangeOffers };
  }

  /** Instalment quote on the market's payable price, or an honest "not offered here". */
  async emiOptionsForProduct(productId: string, country?: string) {
    const market = ProductOffersService.market(country);
    const config = market ? EMI_PLANS_BY_MARKET[market] : undefined;
    if (!market || !config) {
      return {
        productId,
        market: market ?? null,
        eligible: false,
        reason: 'Instalment plans are not offered in this market yet.',
      };
    }
    // The cached public detail: 404s for a product the customer may not see,
    // and carries the market's buy-box offer first.
    const detail: any = await this.catalog.getProductById(productId, market);
    const listing = Array.isArray(detail?.listings) ? detail.listings[0] : null;
    const price = Number(listing?.sellingPrice) || Number(detail?.mrp) || 0;
    if (price < config.minimumOrder) {
      return {
        productId,
        market,
        eligible: false,
        price,
        currency: config.currency,
        reason: `Instalments are available on orders of ${config.currency} ${config.minimumOrder.toLocaleString('en-IN')} and above.`,
      };
    }
    const plans = config.plans.map((p) => {
      const totalCost = Math.round(price * (1 + (p.interestRate / 100) * (p.tenure / 12)));
      return {
        tenure: p.tenure,
        bank: p.bank,
        interestRate: p.interestRate,
        monthlyEmi: Math.round(totalCost / p.tenure),
        totalCost,
        label: p.label,
      };
    });
    return { productId, market, eligible: true, price, currency: config.currency, plans };
  }

  /** For the log line on the TCP side. */
  static reqId(): string {
    return currentRequestId() ?? 'none';
  }
}
