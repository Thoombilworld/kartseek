import { Controller, Post, Body, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { HotelService } from './hotel.service';
import { WebhookPaymentDto, WebhookRefundDto } from './dto/webhook-payment.dto';

@Controller('webhooks')
export class HotelWebhookController {
  private readonly logger = new Logger(HotelWebhookController.name);

  constructor(private readonly svc: HotelService) {}

  @Post('payment')
  @HttpCode(HttpStatus.OK)
  async handlePaymentWebhook(@Body() dto: WebhookPaymentDto) {
    this.logger.log(`Payment webhook received: ${dto.transactionId} — ${dto.status} — ${dto.bookingId}`);
    return this.svc.processPaymentWebhook(dto);
  }

  @Post('refund')
  @HttpCode(HttpStatus.OK)
  async handleRefundWebhook(@Body() dto: WebhookRefundDto) {
    this.logger.log(`Refund webhook received: ${dto.refundId} — ${dto.status} — ${dto.bookingId}`);
    return this.svc.processRefundWebhook(dto);
  }
}
