import { Controller, UseFilters, UseInterceptors } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RpcAwareExceptionsFilter } from '@app/common';
import { RpcContextInterceptor } from '../transport/rpc-context.interceptor';
import { ProductOffersService } from './product-offers.service';

/**
 * TCP patterns for the product page's commercial add-ons, keyed on
 * (product, market).
 *
 * A separate controller rather than two more handlers in
 * `MarketplaceController`: that file is under concurrent change by the
 * admin-console work, and Nest binds every controller in the module to the
 * same transport, so the split costs nothing at runtime.
 */
@Controller()
@UseFilters(RpcAwareExceptionsFilter)
@UseInterceptors(RpcContextInterceptor)
export class CatalogController {
  constructor(private readonly offers: ProductOffersService) {}

  /** Bank and exchange offers valid now, for this product, in this market. */
  @MessagePattern({ cmd: 'get_product_offers' })
  offersForProduct(@Payload() d: { productId?: string; country?: string }) {
    return this.offers.offersForProduct(String(d?.productId ?? ''), d?.country);
  }

  /** Instalment quote on the market's payable price, or `eligible: false`. */
  @MessagePattern({ cmd: 'get_product_emi_options' })
  emiOptionsForProduct(@Payload() d: { productId?: string; country?: string }) {
    return this.offers.emiOptionsForProduct(String(d?.productId ?? ''), d?.country);
  }
}
