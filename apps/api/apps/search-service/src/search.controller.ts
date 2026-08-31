import { Controller, Get, Post, Delete, Body, Query, Param, UseFilters } from '@nestjs/common';
import { MessagePattern, EventPattern, Payload, Transport } from '@nestjs/microservices';
import { SearchService, SearchableModule, SearchFilters } from './search.service';
import { RpcAwareExceptionsFilter } from '@app/common';

@UseFilters(RpcAwareExceptionsFilter)
@Controller('search')
export class SearchController {
  constructor(private readonly svc: SearchService) {}

  @Get('health') health() { return this.svc.healthCheck(); }
  @Get() search(@Query('q') q: string, @Query('category') cat?: string, @Query('serviceType') st?: string, @Query('country') country?: string, @Query('minPrice') min?: number, @Query('maxPrice') max?: number, @Query('sortBy') sort?: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.svc.search(q, { category: cat, serviceType: st, country, minPrice: min ? +min : undefined, maxPrice: max ? +max : undefined, sortBy: sort as SearchFilters['sortBy'], page: +page, limit: +limit });
  }
  @Get('suggestions') suggestions(@Query('q') q: string) { return this.svc.getSearchSuggestions(q); }
  @Post('index') index(@Body() dto: { serviceType: string; id: string; data: Record<string, unknown> }) { return this.svc.indexDocument(dto.serviceType as SearchableModule, dto.id, dto.data); }
  @Delete('index/:serviceType/:id') remove(@Param('serviceType') st: string, @Param('id') id: string) { return this.svc.removeDocument(st as SearchableModule, id); }

  // Transport.TCP explicitly. This service now connects two microservices, and
  // Nest registers every handler against every connected transport unless it is
  // told otherwise — so the Kafka server tried to subscribe to a topic named
  // `{"cmd":"search"}` and died with "invalid topic" before it ever started.
  @MessagePattern({ cmd: 'search' }, Transport.TCP)
  msgSearch(@Payload() data: { query: string; filters: any }) { return this.svc.search(data.query, data.filters); }

  // ── Catalogue events ────────────────────────────────────────────────────────
  //
  // marketplace-service published these all along and nothing listened, so the
  // index only ever held what someone had POSTed to /search/index by hand. An
  // admin approving a product is exactly the moment it becomes findable, and it
  // was the moment nothing happened.
  //
  // Indexing is best-effort on purpose: a failure here must not fail the
  // approval that triggered it. The product is already live in Postgres and
  // servable from the catalogue endpoints; a missing index entry degrades
  // search, it does not un-approve anything.

  @EventPattern('product.approved', Transport.KAFKA)
  async onProductApproved(@Payload() data: any) {
    await this.svc.indexFromEvent(SearchableModule.MARKETPLACE, data);
  }

  @EventPattern('product.updated', Transport.KAFKA)
  async onProductUpdated(@Payload() data: any) {
    await this.svc.indexFromEvent(SearchableModule.MARKETPLACE, data);
  }

  // Rejected and suspended products come out of the index. They stay in
  // Postgres — the admin decision is reversible — but they must stop being
  // findable the moment the decision is taken.
  @EventPattern('product.rejected', Transport.KAFKA)
  async onProductRejected(@Payload() data: any) {
    await this.svc.removeFromEvent(SearchableModule.MARKETPLACE, data);
  }

  @EventPattern('product.suspended', Transport.KAFKA)
  async onProductSuspended(@Payload() data: any) {
    await this.svc.removeFromEvent(SearchableModule.MARKETPLACE, data);
  }
}
