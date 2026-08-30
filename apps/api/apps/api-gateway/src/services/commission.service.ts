import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  // Core Commission Rates (These would typically be pulled from DB/Config)
  private readonly PLATFORM_FEE_PERCENTAGE = 0.10; // 10% base platform fee
  private readonly FRANCHISE_FEE_PERCENTAGE = 0.02; // 2% franchise cut
  private readonly TAX_PERCENTAGE = 0.05; // 5% GST

  /**
   * Calculates the exact financial breakdown for a given order.
   * Runs exactly when an order transitions to 'DELIVERED'.
   */
  public calculateOrderCommissions(orderTotal: number, hasFranchise: boolean) {
    
    // 1. Calculate Platform Commission
    const platformCommission = orderTotal * this.PLATFORM_FEE_PERCENTAGE;
    
    // 2. Calculate Franchise Cut (if restaurant belongs to a managed region)
    const franchiseCut = hasFranchise ? (orderTotal * this.FRANCHISE_FEE_PERCENTAGE) : 0;
    
    // 3. Calculate Taxes on the commission
    const taxOnCommission = platformCommission * this.TAX_PERCENTAGE;

    // 4. Calculate Net Payout to Restaurant Partner
    const restaurantPayout = orderTotal - platformCommission - taxOnCommission;

    this.logger.log(`💰 Commission Computed | Total: ₹${orderTotal} | Partner: ₹${restaurantPayout} | Platform: ₹${platformCommission} | Franchise: ₹${franchiseCut}`);

    return {
      totalOrderValue: orderTotal,
      restaurantPayout,
      platformCommission,
      franchiseCut,
      taxOnCommission
    };
  }

  /**
   * Processes the monthly batch settlement for all active franchise owners.
   * Triggered by the Background CRON Jobs engine.
   */
  public async processMonthlyFranchiseSettlements() {
    this.logger.log('Initiating Monthly Franchise Settlements...');
    // In production:
    // 1. Fetch sum of `franchiseCut` for all orders in the current month grouped by Franchise ID.
    // 2. Insert rows into Wallet Transactions table.
    // 3. Trigger Payout Webhooks (RazorpayX / Stripe Connect)
  }
}
