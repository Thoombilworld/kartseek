import { Controller, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload, EventPattern } from '@nestjs/microservices';
import { PaymentOrchestratorService, type InitiatePaymentDto, type DashboardFilters } from './payment.service';
import { SettlementEngineService } from './services/settlement-engine.service';
import { InvoiceService } from './services/invoice.service';
import { RealTimeBillingService } from './services/realtime-billing.service';
import { PaymentModule as PaymentModuleEnum } from './entities/payment.entity';
import { RpcAwareExceptionsFilter } from '@app/common';

/**
 * PaymentController — TCP message handler for the centralized payment microservice.
 *
 * All commands match the { cmd: 'xxx' } patterns sent by PaymentGatewayController
 * in the API Gateway via ClientProxy.send().
 */
@UseFilters(RpcAwareExceptionsFilter)
@Controller()
export class PaymentController {
  constructor(
    private readonly orchestrator: PaymentOrchestratorService,
    private readonly settlement: SettlementEngineService,
    private readonly invoices: InvoiceService,
    private readonly billing: RealTimeBillingService,
  ) {}

  // ── Health ────────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'payment_health' })
  health() {
    return this.orchestrator.healthCheck();
  }

  // ── Payment Methods Discovery ─────────────────────────────────────────────

  @MessagePattern({ cmd: 'get_payment_methods' })
  getPaymentMethods(@Payload() data: { countryCode: string; module?: string }) {
    return this.orchestrator.getAvailablePaymentMethods(data.countryCode, data.module);
  }

  // ── Payment Lifecycle ─────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'initiate_payment' })
  initiatePayment(@Payload() data: InitiatePaymentDto) {
    return this.orchestrator.initiatePayment(data);
  }

  @MessagePattern({ cmd: 'verify_payment' })
  verifyPayment(@Payload() data: any) {
    return this.orchestrator.verifyPayment(data);
  }

  @MessagePattern({ cmd: 'handle_webhook' })
  handleWebhook(@Payload() data: { gateway: string; payload: any; signature: string }) {
    return this.orchestrator.handleWebhook(data.gateway, data.payload, data.signature);
  }

  @MessagePattern({ cmd: 'get_payment' })
  getPayment(@Payload() data: { paymentId: string }) {
    return this.orchestrator.getPaymentById(data.paymentId);
  }

  @MessagePattern({ cmd: 'get_payment_by_order' })
  getPaymentByOrder(@Payload() data: { orderId: string }) {
    return this.orchestrator.getPaymentByOrder(data.orderId);
  }

  @MessagePattern({ cmd: 'get_customer_payments' })
  getCustomerPayments(@Payload() data: { customerId: string; page: number; limit: number }) {
    return this.orchestrator.getCustomerPayments(data.customerId, data.page, data.limit);
  }

  // ── Module-Specific ───────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'process_order_payment' })
  processOrderPayment(@Payload() data: any) {
    return this.orchestrator.processOrderPayment(data);
  }

  @MessagePattern({ cmd: 'wallet_topup' })
  walletTopup(@Payload() data: any) {
    return this.orchestrator.processWalletTopup(data);
  }

  // ── Taxi Real-Time Billing ────────────────────────────────────────────────

  @MessagePattern({ cmd: 'taxi_preauth' })
  taxiPreAuth(@Payload() data: any) {
    return this.orchestrator.processTaxiPayment(data);
  }

  @MessagePattern({ cmd: 'taxi_capture' })
  taxiCapture(@Payload() data: { rideId: string; finalFare: number; tipAmount?: number; discount?: number }) {
    return this.orchestrator.captureTaxiFare(data.rideId, data.finalFare, data.tipAmount, data.discount);
  }

  @MessagePattern({ cmd: 'taxi_cancel_billing' })
  taxiCancelBilling(@Payload() data: { rideId: string; cancellationFee: number; cancelledBy: string }) {
    return this.billing.handleCancellation(data);
  }

  @MessagePattern({ cmd: 'get_taxi_billing' })
  getTaxiBillingState(@Payload() data: { rideId: string }) {
    return this.billing.getBillingState(data.rideId);
  }

  // ── Escrow ────────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'release_escrow' })
  releaseEscrow(@Payload() data: { orderId: string }) {
    return this.orchestrator.releaseEscrow(data.orderId);
  }

  // ── Refunds ───────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'initiate_refund' })
  initiateRefund(@Payload() data: { paymentId: string; amount: number; reason: string; initiatedBy: string }) {
    return this.orchestrator.initiateRefund(data);
  }

  // ── Invoices ──────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'get_invoice' })
  getInvoice(@Payload() data: { invoiceId: string }) {
    return this.invoices.getInvoiceById(data.invoiceId);
  }

  @MessagePattern({ cmd: 'get_invoice_by_payment' })
  getInvoiceByPayment(@Payload() data: { paymentId: string }) {
    return this.invoices.getInvoiceByPayment(data.paymentId);
  }

  @MessagePattern({ cmd: 'get_customer_invoices' })
  getCustomerInvoices(@Payload() data: { customerId: string; page: number; limit: number }) {
    return this.invoices.getCustomerInvoices(data.customerId, data.page, data.limit);
  }

  @MessagePattern({ cmd: 'generate_invoice_pdf' })
  generateInvoicePdf(@Payload() data: { invoiceId: string }) {
    return this.invoices.generatePdf(data.invoiceId);
  }

  @MessagePattern({ cmd: 'void_invoice' })
  voidInvoice(@Payload() data: { invoiceId: string; reason: string }) {
    return this.invoices.voidInvoice(data.invoiceId, data.reason);
  }

  // ── Settlement (Super Admin) ──────────────────────────────────────────────

  @MessagePattern({ cmd: 'get_payment_dashboard' })
  getDashboard(@Payload() data: DashboardFilters) {
    return this.orchestrator.getPaymentsDashboard(data);
  }

  @MessagePattern({ cmd: 'get_settlement_dashboard' })
  getSettlementDashboard(@Payload() data: { startDate?: string; endDate?: string; countryCode?: string }) {
    return this.settlement.getDashboardSummary(data);
  }

  @MessagePattern({ cmd: 'get_seller_balance' })
  getSellerBalance(@Payload() data: { sellerId: string }) {
    return this.settlement.getSellerBalance(data.sellerId);
  }

  @MessagePattern({ cmd: 'get_franchise_earnings' })
  getFranchiseEarnings(@Payload() data: { franchiseId: string }) {
    return this.settlement.getFranchiseEarnings(data.franchiseId);
  }

  @MessagePattern({ cmd: 'get_module_revenue' })
  getModuleRevenue(@Payload() data: { module: PaymentModuleEnum; startDate: string; endDate: string }) {
    return this.orchestrator.getModuleRevenue(data.module, data.startDate, data.endDate);
  }

  @MessagePattern({ cmd: 'get_reconciliation' })
  getReconciliation(@Payload() data: { date: string }) {
    return this.settlement.getReconciliationReport(data.date);
  }

  // ── Kafka Event Listeners ─────────────────────────────────────────────────

  @EventPattern('order.delivered')
  async handleOrderDelivered(@Payload() data: { orderId: string }) {
    await this.orchestrator.releaseEscrow(data.orderId);
  }

  @EventPattern('payment.v2.completed')
  async handlePaymentCompleted(@Payload() data: { paymentId: string }) {
    await this.settlement.generateSettlementForPayment(data.paymentId);
    await this.invoices.generateInvoiceForPayment(data.paymentId);
  }

  @EventPattern('payment.escrow.released')
  async handleEscrowReleased(@Payload() data: { paymentId: string }) {
    await this.settlement.markSettled(data.paymentId);
  }
}
