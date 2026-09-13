import { Controller, Get, Post, Put, Param, Body, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RefundService, type RefundRequest } from './refund.service';
import { type EmptyMessage, RpcAwareExceptionsFilter } from '@app/common';

@UseFilters(RpcAwareExceptionsFilter)
@Controller('refunds')
export class RefundController {
  constructor(private readonly svc: RefundService) {}
  @Get('health') health() {
    return this.svc.healthCheck();
  }
  @Post() request(@Body() dto: any) {
    return this.svc.requestRefund(dto);
  }
  @Get(':id') getById(@Param('id') id: string) {
    return this.svc.getRefundById(id);
  }
  @Get('order/:orderId') getByOrder(@Param('orderId') orderId: string) {
    return this.svc.getRefundsByOrder(orderId);
  }
  @Put(':id/process') process(
    @Param('id') id: string,
    @Body('adminId') adminId: string,
    @Body('decision') decision: 'APPROVED' | 'REJECTED',
    @Body('remarks') remarks?: string,
  ) {
    return this.svc.processRefund(id, adminId, decision, remarks);
  }
  // ── TCP surface ─────────────────────────────────────────────────────────
  //
  // Only `request_refund` was exposed, so everything an admin does to a refund
  // was unreachable from the gateway — which answered approve, process and
  // reject with a fabricated `{ success: true }` instead. The service methods
  // behind these have existed all along; they simply had no way in.

  @MessagePattern({ cmd: 'request_refund' })
  msgRequest(@Payload() d: EmptyMessage) {
    return this.svc.requestRefund(d);
  }

  /** Approve or reject in one call — the service takes the decision as an argument. */
  @MessagePattern({ cmd: 'process_refund' })
  msgProcess(
    @Payload()
    d: {
      id: string;
      adminId: string;
      decision: 'APPROVED' | 'REJECTED';
      remarks?: string;
    },
  ) {
    return this.svc.processRefund(d.id, d.adminId, d.decision, d.remarks);
  }

  @MessagePattern({ cmd: 'escalate_refund' })
  msgEscalate(@Payload() d: { id: string; adminId: string; notes?: string }) {
    return this.svc.escalateToReview(d.id, d.adminId, d.notes);
  }

  @MessagePattern({ cmd: 'get_refund_by_id' })
  msgGetById(@Payload() d: { id: string }) {
    return this.svc.getRefundById(d.id);
  }

  @MessagePattern({ cmd: 'get_refunds_by_order' })
  msgGetByOrder(@Payload() d: { orderId: string }) {
    return this.svc.getRefundsByOrder(d.orderId);
  }

  @MessagePattern({ cmd: 'get_refunds_by_user' })
  msgGetByUser(@Payload() d: { userId: string; page?: number; limit?: number }) {
    return this.svc.getRefundsByUser(d.userId, d.page, d.limit);
  }

  /**
   * The admin queue.
   *
   * `scope` is the caller's market, written by the gateway from the signed
   * token — it was not forwarded here at all, which is why the gateway had to
   * refuse every region-locked admin outright instead. `region` is what a
   * global admin asked to filter on; the gateway has always sent it, and this
   * signature used to omit it, so the console's region picker narrowed the
   * heading and not the rows.
   */
  @MessagePattern({ cmd: 'get_pending_refunds' })
  msgPending(
    @Payload()
    d: {
      page?: number;
      limit?: number;
      scope?: string;
      region?: string;
      status?: string;
    },
  ) {
    return this.svc.getPendingRefunds(d?.page, d?.limit, d?.scope, d?.region, d?.status);
  }

  @MessagePattern({ cmd: 'get_refund_stats' })
  msgStats() {
    return this.svc.getRefundStats();
  }
}
