import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { DdosMonitorService } from '@app/security';
import { JwtAuthGuard } from '@app/security';
import {
  BanIpRequestDto,
  WhitelistIpRequestDto,
  ThreatStatusResponseDto,
  SuccessResponseDto,
} from '../dto/gateway.dto';


// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * DDoS Admin Controller — Security dashboard API.
 *
 * All endpoints require a valid JWT admin token.
 * Base path: /api/v1/admin/security
 */
@ApiTags('🛡️ Security')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('admin/security')
export class DdosAdminController {
  constructor(private readonly monitor: DdosMonitorService) {}

  // ── Dashboard Overview ─────────────────────────────────────────────────────

  @Get('status')
  @ApiOperation({
    summary: 'DDoS threat status',
    description: 'Returns the current threat level, active ban counts, and attack-mode flags. Refresh every 10s on the admin dashboard.',
  })
  @ApiOkResponse({
    description: 'Current threat status',
    schema: {
      example: {
        level: 'elevated',
        httpBansToday: 34,
        wsBansToday: 12,
        activeBans: 8,
        isHttpAttackMode: true,
        isWsAttackMode: false,
        timestamp: '2026-05-31T18:00:00.000Z',
      },
    },
  })
  async getThreatStatus() {
    return this.monitor.getThreatStatus();
  }

  @Get('trend')
  @ApiOperation({
    summary: '14-day ban trend',
    description: 'Returns daily HTTP and WebSocket ban counts for the last 14 days, suitable for a trend chart.',
  })
  async getBanTrend() {
    return this.monitor.getBanTrend();
  }

  @Get('stats/endpoints')
  @ApiOperation({
    summary: 'Per-endpoint request stats',
    description: 'Returns request counts broken down by method, path, and hour. Useful for identifying abused endpoints.',
  })
  async getEndpointStats() {
    return this.monitor.getEndpointStats();
  }

  @Get('offenders')
  @ApiOperation({
    summary: 'Top strike offenders',
    description: 'Returns the top 20 IPs ranked by strike count (not yet banned). Useful for proactive manual banning.',
  })
  async getTopOffenders() {
    return this.monitor.getTopOffenders(20);
  }

  // ── Banned IPs ─────────────────────────────────────────────────────────────

  @Get('bans')
  @ApiOperation({
    summary: 'List all banned IPs',
    description: 'Returns all currently banned IPs for both HTTP and WebSocket traffic, sorted by remaining ban duration.',
  })
  async getBannedIps() {
    return this.monitor.getBannedIps();
  }

  @Post('bans')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Manually ban an IP', description: 'Bans an IP for both HTTP and WebSocket traffic.' })
  @ApiBody({ type: BanIpRequestDto })
  @ApiCreatedResponse({ type: SuccessResponseDto, description: 'IP banned successfully' })
  async banIp(@Body() dto: BanIpRequestDto) {
    await this.monitor.banIp(dto.ip, dto.durationSeconds, dto.reason);
    return { success: true, message: `IP ${dto.ip} banned for ${Math.round(dto.durationSeconds / 60)} minutes.` };
  }

  @Delete('bans/:ip')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unban an IP', description: 'Removes HTTP ban, WebSocket ban, and clears all strike records for the IP.' })
  @ApiParam({ name: 'ip', description: 'IPv4 or IPv6 address to unban', example: '192.168.1.100' })
  async unbanIp(@Param('ip') ip: string) {
    await this.monitor.unbanIp(ip);
    return { success: true, message: `IP ${ip} has been fully unbanned and all strikes cleared.` };
  }

  // ── Whitelist ──────────────────────────────────────────────────────────────

  @Get('whitelist')
  @ApiOperation({ summary: 'Get whitelist', description: 'Returns all IPs that bypass DDoS checks (trusted services, internal IPs).' })
  async getWhitelist() {
    return this.monitor.getWhitelistedIps();
  }

  @Post('whitelist')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add IP to whitelist', description: 'Whitelisted IPs bypass all DDoS rate-limiting. Any existing ban is also cleared.' })
  @ApiBody({ type: WhitelistIpRequestDto })
  @ApiCreatedResponse({ type: SuccessResponseDto, description: 'IP added to whitelist' })
  async addToWhitelist(@Body() dto: WhitelistIpRequestDto) {
    await this.monitor.whitelistIp(dto.ip);
    return { success: true, message: `IP ${dto.ip} added to whitelist.` };
  }

  @Delete('whitelist/:ip')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove IP from whitelist', description: 'The IP will be subject to standard DDoS checks again after removal.' })
  @ApiParam({ name: 'ip', description: 'IPv4 or IPv6 address to remove', example: '10.0.0.1' })
  async removeFromWhitelist(@Param('ip') ip: string) {
    await this.monitor.removeFromWhitelist(ip);
    return { success: true, message: `IP ${ip} removed from whitelist.` };
  }

  // ── Attack Mode Control ────────────────────────────────────────────────────

  @Post('attack-mode/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset attack mode',
    description: 'Manually clears the elevated attack mode flag if it was triggered by a false positive. Rate limits return to normal.',
  })
  async resetAttackMode() {
    await this.monitor.resetAttackMode();
    return { success: true, message: 'Attack mode cleared. Rate limits restored to normal.' };
  }
}
