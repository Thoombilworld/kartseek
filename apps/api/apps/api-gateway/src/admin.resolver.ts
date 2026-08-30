import { Resolver, Query, ObjectType, Field, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class PendingApprovalsType {
  @Field(() => Int) products: number;
  @Field(() => Int) sellers: number;
}

@ObjectType()
export class EscrowFundsType {
  @Field(() => Float) holdAmount: number;
  @Field(() => Float) released: number;
}

@ObjectType()
export class AdminDashboardType {
  @Field(() => PendingApprovalsType) pendingApprovals: PendingApprovalsType;
  @Field(() => EscrowFundsType) escrowFunds: EscrowFundsType;
  @Field(() => Int) activeSellers: number;
  @Field(() => Int) todayOrders: number;
  @Field(() => Float) todayRevenue: number;
}

@Resolver()
export class AdminResolver {
  constructor() {}

  @Query(() => AdminDashboardType)
  async adminDashboard() {
    // In a real microservices setup, these would be aggregated from multiple services.
    // We will simulate fetching from ADMIN_SERVICE and PAYOUT_SERVICE
    try {
      // Mocked fetching logic for demo / implementation plan
      const data = {
        pendingApprovals: {
          products: 87,
          sellers: 14,
        },
        escrowFunds: {
          holdAmount: 1250000,
          released: 48200000,
        },
        activeSellers: 212,
        todayOrders: 1284,
        todayRevenue: 4825000,
      };
      
      return data;
    } catch (e) {
      return {
        pendingApprovals: { products: 0, sellers: 0 },
        escrowFunds: { holdAmount: 0, released: 0 },
        activeSellers: 0,
        todayOrders: 0,
        todayRevenue: 0,
      };
    }
  }
}
