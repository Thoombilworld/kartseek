import { Resolver, Query, Args, ObjectType, Field, Int, Float } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, catchError, of } from 'rxjs';
import { MARKETPLACE_PATTERNS } from './contracts';

@ObjectType()
export class CategoryType {
  @Field() id: string;
  @Field() name: string;
  @Field({ nullable: true }) slug?: string;
  @Field({ nullable: true }) icon?: string;
}

@ObjectType()
export class ProductType {
  @Field() id: string;
  @Field() title: string;
  @Field(() => Float) mrp: number;
  @Field(() => Float) sellingPrice: number;
  @Field({ nullable: true }) shortDescription?: string;
}

@Resolver()
export class MarketplaceResolver {
  constructor(
    @Inject('MARKETPLACE_SERVICE') private readonly marketplaceClient: ClientProxy,
  ) {}

  private async sendToMarketplace<T = any>(cmd: string, payload: any = {}): Promise<T> {
    return lastValueFrom(
      this.marketplaceClient.send<T>({ cmd }, payload).pipe(
        timeout(10000),
        catchError(() => of(null as any)),
      ),
    );
  }

  @Query(() => [CategoryType])
  async categories() {
    try {
      const result = await this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_CATEGORIES);
      return (result as any)?.data || [];
    } catch (e) {
      return [];
    }
  }

  @Query(() => CategoryType, { nullable: true })
  async category(@Args('id') id: string) {
    try {
      return await this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_CATEGORY_BY_ID, { id });
    } catch (e) {
      return null;
    }
  }

  @Query(() => ProductType, { nullable: true })
  async product(@Args('id') id: string) {
    try {
      return await this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_PRODUCT_BY_ID, { id });
    } catch (e) {
      return null;
    }
  }

  @Query(() => [ProductType])
  async searchMarketplace(@Args('input') input: string) {
    try {
      const result = await this.sendToMarketplace(MARKETPLACE_PATTERNS.SEARCH, { query: input });
      return (result as any)?.data || [];
    } catch (e) {
      return [];
    }
  }
}
