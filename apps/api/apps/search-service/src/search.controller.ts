import { Controller, Get, Post, Delete, Body, Query, Param, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
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

  @MessagePattern({ cmd: 'search' }) msgSearch(@Payload() data: { query: string; filters: any }) { return this.svc.search(data.query, data.filters); }
}
