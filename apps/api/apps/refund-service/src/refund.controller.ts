import { Controller, Get, Post, Put, Param, Body, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RefundService, RefundRequest } from './refund.service';
import { EmptyMessage, RpcAwareExceptionsFilter } from '@app/common';

@UseFilters(RpcAwareExceptionsFilter)
@Controller('refunds')
export class RefundController {
  constructor(private readonly svc: RefundService) {}
  @Get('health') health() { return this.svc.healthCheck(); }
  @Post() request(@Body() dto: any) { return this.svc.requestRefund(dto); }
  @Get(':id') getById(@Param('id') id: string) { return this.svc.getRefundById(id); }
  @Get('order/:orderId') getByOrder(@Param('orderId') orderId: string) { return this.svc.getRefundsByOrder(orderId); }
  @Put(':id/process') process(@Param('id') id: string, @Body('adminId') adminId: string, @Body('decision') decision: 'APPROVED' | 'REJECTED', @Body('remarks') remarks?: string) { return this.svc.processRefund(id, adminId, decision, remarks); }
  @MessagePattern({ cmd: 'request_refund' }) msgRequest(@Payload() d: EmptyMessage) { return this.svc.requestRefund(d); }
}
