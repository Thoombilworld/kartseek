import { Controller, Get, Post, Put, Param, Body, Query, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DeliveryService } from './delivery.service';
import { RpcAwareExceptionsFilter } from '@app/common';

@UseFilters(RpcAwareExceptionsFilter)
@Controller('delivery')
export class DeliveryController {
  constructor(private readonly svc: DeliveryService) {}
  @Get('health') health() { return this.svc.healthCheck(); }
  @Post('orders/:orderId/assign') assign(@Param('orderId') orderId: string, @Body('serviceType') st: string) { return this.svc.assignDeliveryPartner(orderId, st); }
  @Get('orders/:orderId/status') getStatus(@Param('orderId') orderId: string) { return this.svc.getDeliveryStatus(orderId); }
  @Put('orders/:orderId/status') updateStatus(@Param('orderId') orderId: string, @Body('status') status: string, @Body('partnerId') partnerId: string) { return this.svc.updateDeliveryStatus(orderId, status, partnerId); }
  @Get('partners/:partnerId/active') getActive(@Param('partnerId') partnerId: string) { return this.svc.getPartnerActiveDeliveries(partnerId); }
  @Get('partners/:partnerId/history') getHistory(@Param('partnerId') pid: string, @Query('page') page = 1, @Query('limit') limit = 20) { return this.svc.getPartnerDeliveryHistory(pid, +page, +limit); }
  @Get('estimate-fee') estimateFee(@Query('distance') d: string, @Query('weight') w?: string) { return this.svc.estimateDeliveryFee(+d, w ? +w : undefined); }
  @MessagePattern({ cmd: 'assign_delivery_partner' }) msgAssign(@Payload() data: any) { return this.svc.assignDeliveryPartner(data.orderId, data.serviceType); }
}
