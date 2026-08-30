import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AdminService } from './admin.service';
import { RpcAwareExceptionsFilter } from '@app/common';

@UseFilters(RpcAwareExceptionsFilter)
@Controller('admin')
export class AdminController {
  constructor(private readonly svc: AdminService) {}

  @Get('layouts/:moduleName/:pageName')
  getLayout(@Param('moduleName') moduleName: string, @Param('pageName') pageName: string) {
    return this.svc.getLayout(moduleName, pageName);
  }

  @Put('layouts/:moduleName/:pageName')
  saveLayout(@Param('moduleName') moduleName: string, @Param('pageName') pageName: string, @Body('sections') sections: any[]) {
    return this.svc.saveLayout(moduleName, pageName, sections);
  }

  @Get('health') health() { return this.svc.healthCheck(); }
  @Get('dashboard') getDashboard() { return this.svc.getDashboardStats(); }
  @Get('platform/health') getPlatformHealth() { return this.svc.getPlatformHealth(); }
  @Get('users') getUsers(@Query('page') page = 1, @Query('limit') limit = 20, @Query('role') role?: string, @Query('country') country?: string) { return this.svc.getUsersList(+page, +limit, role, country); }
  @Put('users/:userId/ban') banUser(@Param('userId') uid: string, @Body('reason') reason: string, @Body('adminId') adminId: string) { return this.svc.banUser(uid, reason, adminId); }
  @Get('kyc/pending') getPendingKyc() { return this.svc.getPendingKyc(); }
  @Post('kyc/:entityId/approve') approveKyc(@Param('entityId') eid: string, @Body('entityType') et: string, @Body('adminId') adminId: string) { return this.svc.approveKyc(eid, et, adminId); }
  @Get('audit-logs') getAuditLogs(@Query('page') page = 1, @Query('limit') limit = 50) { return this.svc.getAuditLogs(+page, +limit); }
  @Get('reports/revenue') getRevenue(@Query('startDate') start: string, @Query('endDate') end: string) { return this.svc.getRevenueReport(start, end); }
  @MessagePattern({ cmd: 'get_admin_dashboard' }) msgDashboard() { return this.svc.getDashboardStats(); }

  // ── Missing Routes (CRITICAL-2 fix) ─────────────────────────────
  @Put('users/:userId/unban') unbanUser(@Param('userId') uid: string, @Body('adminId') adminId: string) { return this.svc.unbanUser(uid, adminId); }
  @Post('kyc/:entityId/reject') rejectKyc(@Param('entityId') eid: string, @Body('entityType') et: string, @Body('adminId') adminId: string, @Body('reason') reason: string) { return this.svc.rejectKyc(eid, et, adminId, reason); }
  @Post('audit-logs') addAuditLog(@Body() entry: { action: string; adminId: string; entityType: string; entityId: string; details?: any }) { return this.svc.addAuditLog(entry); }
  @Post('counter/increment') incrementCounter(@Body('counter') counter: string, @Body('value') value = 1) { return this.svc.incrementCounter(counter, value); }
}
