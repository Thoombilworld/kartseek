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
  // ── TCP surface ───────────────────────────────────────────────────────────
  //
  // The gateway reaches this service over TCP (ADMIN_SERVICE, port 4017), not
  // over its HTTP port. Only `get_admin_dashboard` was exposed that way, so the
  // other ten operations below existed in the service, were routable on this
  // service's own HTTP port, and were unreachable from the gateway — which is
  // why the eleven /admin/* calls in the web client had no route to hit.
  @MessagePattern({ cmd: 'get_admin_dashboard' })
  msgDashboard() { return this.svc.getDashboardStats(); }

  @MessagePattern({ cmd: 'admin_platform_health' })
  msgPlatformHealth() { return this.svc.getPlatformHealth(); }

  @MessagePattern({ cmd: 'admin_users_list' })
  msgUsersList(@Payload() d: { page?: number; limit?: number; role?: string; country?: string; search?: string }) {
    return this.svc.getUsersList(d?.page, d?.limit, d?.role, d?.country, d?.search);
  }

  @MessagePattern({ cmd: 'admin_ban_user' })
  msgBanUser(@Payload() d: { userId: string; reason: string; adminId: string }) {
    return this.svc.banUser(d?.userId, d?.reason, d?.adminId);
  }

  @MessagePattern({ cmd: 'admin_unban_user' })
  msgUnbanUser(@Payload() d: { userId: string; adminId: string }) {
    return this.svc.unbanUser(d?.userId, d?.adminId);
  }

  @MessagePattern({ cmd: 'admin_kyc_pending' })
  msgPendingKyc(@Payload() d: { page?: number; limit?: number }) {
    return this.svc.getPendingKyc(d?.page, d?.limit);
  }

  @MessagePattern({ cmd: 'admin_kyc_approve' })
  msgApproveKyc(@Payload() d: { entityId: string; entityType: string; adminId: string }) {
    return this.svc.approveKyc(d?.entityId, d?.entityType, d?.adminId);
  }

  @MessagePattern({ cmd: 'admin_kyc_reject' })
  msgRejectKyc(@Payload() d: { entityId: string; entityType: string; adminId: string; reason: string }) {
    return this.svc.rejectKyc(d?.entityId, d?.entityType, d?.adminId, d?.reason);
  }

  @MessagePattern({ cmd: 'admin_audit_logs' })
  msgAuditLogs(@Payload() d: { page?: number; limit?: number; action?: string; adminId?: string; startDate?: string; endDate?: string }) {
    return this.svc.getAuditLogs(d?.page, d?.limit, {
      action: d?.action, adminId: d?.adminId, startDate: d?.startDate, endDate: d?.endDate,
    });
  }

  @MessagePattern({ cmd: 'admin_audit_log_add' })
  msgAddAuditLog(@Payload() d: { action: string; adminId: string; entityType: string; entityId: string; details?: any }) {
    return this.svc.addAuditLog(d);
  }

  @MessagePattern({ cmd: 'admin_revenue_report' })
  msgRevenueReport(@Payload() d: { startDate: string; endDate: string; groupBy?: 'day' | 'week' | 'month' }) {
    return this.svc.getRevenueReport(d?.startDate, d?.endDate, d?.groupBy ?? 'day');
  }

  // ── Missing Routes (CRITICAL-2 fix) ─────────────────────────────
  @Put('users/:userId/unban') unbanUser(@Param('userId') uid: string, @Body('adminId') adminId: string) { return this.svc.unbanUser(uid, adminId); }
  @Post('kyc/:entityId/reject') rejectKyc(@Param('entityId') eid: string, @Body('entityType') et: string, @Body('adminId') adminId: string, @Body('reason') reason: string) { return this.svc.rejectKyc(eid, et, adminId, reason); }
  @Post('audit-logs') addAuditLog(@Body() entry: { action: string; adminId: string; entityType: string; entityId: string; details?: any }) { return this.svc.addAuditLog(entry); }
  @Post('counter/increment') incrementCounter(@Body('counter') counter: string, @Body('value') value = 1) { return this.svc.incrementCounter(counter, value); }
}
