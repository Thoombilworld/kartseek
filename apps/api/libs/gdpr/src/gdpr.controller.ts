import { Controller, Get, Post, Delete, Param, Body, Query, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { GdprService, type ConsentType } from './gdpr.service';
import { Request } from 'express';

@ApiTags('🔒 GDPR & Privacy')
@ApiBearerAuth('JWT')
@Controller('gdpr')
export class GdprController {
  constructor(private readonly gdprService: GdprService) {}

  // ── Consent Management ─────────────────────────────────────────────────────

  @Get('consent/:userId')
  @ApiOperation({ summary: 'Get all consent records for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async getUserConsents(@Param('userId') userId: string) {
    const consents = await this.gdprService.getUserConsents(userId);
    return { success: true, userId, consents };
  }

  @Post('consent/:userId/grant')
  @ApiOperation({ summary: 'Grant consent for a specific data processing purpose' })
  @ApiBody({ schema: {
    properties: {
      consentType: { type: 'string', enum: ['marketing_email', 'marketing_sms', 'marketing_push', 'analytics', 'location_tracking', 'data_sharing_partners', 'personalized_ads', 'order_notifications'] },
      policyVersion: { type: 'string', default: '1.0' },
    },
  }})
  async grantConsent(
    @Param('userId') userId: string,
    @Body() body: { consentType: ConsentType; policyVersion?: string },
    @Req() req: Request,
  ) {
    const record = await this.gdprService.grantConsent(userId, body.consentType, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      policyVersion: body.policyVersion,
    });
    return { success: true, record };
  }

  @Post('consent/:userId/revoke')
  @ApiOperation({ summary: 'Revoke consent for a specific data processing purpose' })
  @ApiBody({ schema: {
    properties: {
      consentType: { type: 'string' },
    },
  }})
  async revokeConsent(
    @Param('userId') userId: string,
    @Body() body: { consentType: ConsentType },
  ) {
    const record = await this.gdprService.revokeConsent(userId, body.consentType);
    return { success: true, record };
  }

  @Get('consent/:userId/check/:consentType')
  @ApiOperation({ summary: 'Check if user has specific consent' })
  async checkConsent(
    @Param('userId') userId: string,
    @Param('consentType') consentType: ConsentType,
  ) {
    const granted = await this.gdprService.hasConsent(userId, consentType);
    return { userId, consentType, granted };
  }

  // ── Data Export (Right of Access) ──────────────────────────────────────────

  @Post('export/:userId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Request a full data export (Right of Access)' })
  @ApiQuery({ name: 'format', enum: ['json', 'csv'], required: false })
  async requestDataExport(
    @Param('userId') userId: string,
    @Query('format') format: 'json' | 'csv' = 'json',
  ) {
    const request = await this.gdprService.requestDataExport(userId, format);
    return {
      success: true,
      message: 'Data export request submitted. You will be notified when it is ready.',
      request,
    };
  }

  @Get('export/:requestId/status')
  @ApiOperation({ summary: 'Check data export request status' })
  async getExportStatus(@Param('requestId') requestId: string) {
    const status = await this.gdprService.getExportStatus(requestId);
    if (!status) return { success: false, message: 'Export request not found' };
    return { success: true, request: status };
  }

  @Get('export/:requestId/download')
  @ApiOperation({ summary: 'Download exported user data' })
  async downloadExport(@Param('requestId') requestId: string) {
    const data = await this.gdprService.getExportData(requestId);
    if (!data) return { success: false, message: 'Export data not found or expired' };
    return { success: true, data };
  }

  @Post('export/:requestId/process')
  @ApiOperation({ summary: '[Admin] Process a pending data export request' })
  async processExport(@Param('requestId') requestId: string) {
    const result = await this.gdprService.processDataExport(requestId);
    return { success: true, request: result };
  }

  // ── Data Erasure (Right to be Forgotten) ───────────────────────────────────

  @Post('erasure/:userId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Request account deletion / data erasure' })
  @ApiBody({ schema: { properties: { reason: { type: 'string' } } } })
  async requestErasure(
    @Param('userId') userId: string,
    @Body() body: { reason?: string },
  ) {
    const request = await this.gdprService.requestErasure(userId, body.reason);
    return {
      success: true,
      message: 'Data erasure request submitted. This will be processed within 30 days.',
      request,
    };
  }

  @Get('erasure/:requestId/status')
  @ApiOperation({ summary: 'Check data erasure request status' })
  async getErasureStatus(@Param('requestId') requestId: string) {
    const status = await this.gdprService.getErasureStatus(requestId);
    if (!status) return { success: false, message: 'Erasure request not found' };
    return { success: true, request: status };
  }

  @Post('erasure/:requestId/process')
  @ApiOperation({ summary: '[Admin] Process a pending data erasure request' })
  @ApiBody({ schema: { properties: { adminId: { type: 'string' } } } })
  async processErasure(
    @Param('requestId') requestId: string,
    @Body() body: { adminId?: string },
  ) {
    const result = await this.gdprService.processErasure(requestId, body.adminId);
    return { success: true, request: result };
  }

  // ── Compliance Dashboard ───────────────────────────────────────────────────

  @Get('compliance/dashboard')
  @ApiOperation({ summary: '[Admin] Get GDPR compliance dashboard data' })
  async getComplianceDashboard() {
    const dashboard = await this.gdprService.getComplianceDashboard();
    return { success: true, ...dashboard };
  }
}
