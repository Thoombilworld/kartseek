import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ReportService } from './report.service';

@Controller('reports')
export class ReportController {
  constructor(private readonly svc: ReportService) {}
  @Get('health') health() { return this.svc.healthCheck(); }
  @Get('revenue') getRevenue(@Query('startDate') start: string, @Query('endDate') end: string, @Query('groupBy') groupBy: 'day' | 'week' | 'month' = 'day') { return this.svc.generateRevenueReport(start, end, groupBy); }
  @Get('orders') getOrders(@Query('startDate') start: string, @Query('endDate') end: string, @Query('serviceType') st?: string) { return this.svc.generateOrderReport(start, end, st); }
  @Get('sellers/:sellerId') getSeller(@Param('sellerId') sid: string, @Query('period') period = '30d') { return this.svc.generateSellerReport(sid, period); }
  @Get('drivers/:driverId') getDriver(@Param('driverId') did: string, @Query('period') period = '30d') { return this.svc.generateDriverReport(did, period); }
  @Get('users/acquisition') getUserAcquisition(@Query('startDate') start: string, @Query('endDate') end: string) { return this.svc.generateUserAcquisitionReport(start, end); }
  @Post('schedule') schedule(@Body() dto: any) { return this.svc.scheduleReport(dto); }
}
