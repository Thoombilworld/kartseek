import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { type Request } from 'express';
import { JwtAuthGuard, ResourceOwnershipGuard, ResourceOwner } from '@app/security';
import { RolesGuard } from '@app/guards';
import { Roles } from '@app/decorators';
import { UserRole } from '@app/common';
import { GdprService, type ConsentType } from './gdpr.service';

/**
 * Roles that may act on any data subject's records: the people who handle
 * access and erasure requests. Both guards compare roles case-insensitively.
 */
const PRIVACY_ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

/** The `:userId` in the URL must be the caller, unless the caller is a privacy admin. */
const SUBJECT_ONLY = { paramKey: 'userId', bypassRoles: PRIVACY_ADMIN_ROLES };

interface AuthenticatedRequest extends Request {
  user?: { userId?: string; role?: string };
}

/**
 * GDPR data-subject rights over HTTP.
 *
 * Every route here names a person, either directly (`:userId`) or through a
 * request they filed (`:requestId`), and the controller carried no guard at
 * all. api-gateway registers no global auth guard (see the route-exposure
 * regression in the gateway's guards folder), so anyone could read another
 * account's consents, file an erasure request for it, or download its data
 * export. Three layers now apply, in this order:
 *
 *   1. JwtAuthGuard: a valid access token, or 401.
 *   2. RolesGuard: the processing and dashboard routes are admin-only.
 *   3. ResourceOwnershipGuard: `:userId` must be the caller (admins bypass).
 *
 * The `:requestId` routes cannot use the ownership guard (the id names a
 * request, not a user), so they load the request and compare its `userId`
 * themselves via `assertMayAccess`.
 */
@ApiTags('🔒 GDPR & Privacy')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard, ResourceOwnershipGuard)
@Controller('gdpr')
export class GdprController {
  private readonly logger = new Logger(GdprController.name);

  constructor(private readonly gdprService: GdprService) {}

  // ── Consent Management ─────────────────────────────────────────────────────

  @Get('consent/:userId')
  @ResourceOwner(SUBJECT_ONLY)
  @ApiOperation({ summary: 'Get all consent records for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async getUserConsents(@Param('userId') userId: string) {
    const consents = await this.gdprService.getUserConsents(userId);
    return { success: true, userId, consents };
  }

  @Post('consent/:userId/grant')
  @ResourceOwner(SUBJECT_ONLY)
  @ApiOperation({ summary: 'Grant consent for a specific data processing purpose' })
  @ApiBody({
    schema: {
      properties: {
        consentType: {
          type: 'string',
          enum: [
            'marketing_email',
            'marketing_sms',
            'marketing_push',
            'analytics',
            'location_tracking',
            'data_sharing_partners',
            'personalized_ads',
            'order_notifications',
          ],
        },
        policyVersion: { type: 'string', default: '1.0' },
      },
    },
  })
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
  @ResourceOwner(SUBJECT_ONLY)
  @ApiOperation({ summary: 'Revoke consent for a specific data processing purpose' })
  @ApiBody({
    schema: {
      properties: {
        consentType: { type: 'string' },
      },
    },
  })
  async revokeConsent(@Param('userId') userId: string, @Body() body: { consentType: ConsentType }) {
    const record = await this.gdprService.revokeConsent(userId, body.consentType);
    return { success: true, record };
  }

  @Get('consent/:userId/check/:consentType')
  @ResourceOwner(SUBJECT_ONLY)
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
  @ResourceOwner(SUBJECT_ONLY)
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
  async getExportStatus(@Param('requestId') requestId: string, @Req() req: AuthenticatedRequest) {
    const status = await this.gdprService.getExportStatus(requestId);
    if (!status) return { success: false, message: 'Export request not found' };
    this.assertMayAccess(req, status.userId, `export ${requestId}`);
    return { success: true, request: status };
  }

  @Get('export/:requestId/download')
  @ApiOperation({ summary: 'Download exported user data' })
  async downloadExport(@Param('requestId') requestId: string, @Req() req: AuthenticatedRequest) {
    // The export payload carries no owner of its own; the request record does,
    // and it outlives the payload (30 days against 7), so it is the one to ask.
    const status = await this.gdprService.getExportStatus(requestId);
    if (!status) return { success: false, message: 'Export data not found or expired' };
    this.assertMayAccess(req, status.userId, `export download ${requestId}`);
    const data = await this.gdprService.getExportData(requestId);
    if (!data) return { success: false, message: 'Export data not found or expired' };
    return { success: true, data };
  }

  @Post('export/:requestId/process')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Process a pending data export request' })
  async processExport(@Param('requestId') requestId: string) {
    const result = await this.gdprService.processDataExport(requestId);
    return { success: true, request: result };
  }

  // ── Data Erasure (Right to be Forgotten) ───────────────────────────────────

  @Post('erasure/:userId')
  @ResourceOwner(SUBJECT_ONLY)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Request account deletion / data erasure' })
  @ApiBody({ schema: { properties: { reason: { type: 'string' } } } })
  async requestErasure(@Param('userId') userId: string, @Body() body: { reason?: string }) {
    const request = await this.gdprService.requestErasure(userId, body?.reason);
    return {
      success: true,
      message: 'Data erasure request submitted. This will be processed within 30 days.',
      request,
    };
  }

  @Get('erasure/:requestId/status')
  @ApiOperation({ summary: 'Check data erasure request status' })
  async getErasureStatus(@Param('requestId') requestId: string, @Req() req: AuthenticatedRequest) {
    const status = await this.gdprService.getErasureStatus(requestId);
    if (!status) return { success: false, message: 'Erasure request not found' };
    this.assertMayAccess(req, status.userId, `erasure ${requestId}`);
    return { success: true, request: status };
  }

  @Post('erasure/:requestId/process')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Process a pending data erasure request' })
  async processErasure(@Param('requestId') requestId: string, @Req() req: AuthenticatedRequest) {
    // Recorded as `processedBy`: the authenticated admin, not a body field the
    // caller used to be able to fill with anyone's id.
    const result = await this.gdprService.processErasure(requestId, req.user?.userId);
    return { success: true, request: result };
  }

  // ── Compliance Dashboard ───────────────────────────────────────────────────

  @Get('compliance/dashboard')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Get GDPR compliance dashboard data' })
  async getComplianceDashboard() {
    const dashboard = await this.gdprService.getComplianceDashboard();
    return { success: true, ...dashboard };
  }

  /**
   * A request may be seen by the subject who filed it or by a privacy admin.
   * Anyone else is refused, and the refusal is logged the same way the
   * ownership guard logs an IDOR attempt.
   */
  private assertMayAccess(req: AuthenticatedRequest, subjectId: string, what: string): void {
    const caller = req.user;
    const role = (caller?.role ?? '').toUpperCase();
    if (caller?.userId && (caller.userId === subjectId || PRIVACY_ADMIN_ROLES.includes(role)))
      return;
    this.logger.warn(
      `GDPR access refused: user ${caller?.userId ?? 'anonymous'} on ${what} of subject ${subjectId}`,
    );
    throw new ForbiddenException('You do not have permission to access this resource.');
  }
}
