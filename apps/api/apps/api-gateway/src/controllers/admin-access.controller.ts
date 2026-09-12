import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  DefaultValuePipe,
  Delete,
  ForbiddenException,
  Get,
  Logger,
  NotFoundException,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { JwtAuthGuard, EncryptionService } from '@app/security';
import {
  STAFF_ROLES,
  UserRole,
  ADMIN_PERMISSIONS,
  ALL_PERMISSIONS,
  unknownPermissionKeys,
} from '@app/common';
import { KafkaProducerService, KAFKA_TOPICS } from '@app/kafka';
import { RedisService } from '@app/redis';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { GlobalEntity } from '../decorators/global-entity.decorator';
import { refuseLockedAdmin, resolveScope } from '../guards/market-scope';
import { applyMarketFilter, assertInMarket, requireMarket } from '@app/common';
import { AdminRole } from '../entities/admin-role.entity';
import { User } from '../entities/user.entity';
import {
  CreateRoleDto,
  CreateStaffDto,
  UpdateRoleDto,
  UpdateStaffDto,
} from '../dto/admin-access.dto';

/** Never let a caller page through the whole staff directory in one request. */
const MAX_PAGE_SIZE = 100;

/**
 * How long a revocation marker has to outlive the token it revokes.
 *
 * An access token is signed for `AuthController.ACCESS_TTL_SECONDS` (3600), and
 * this controller cannot see the deactivated account's token to read its actual
 * `exp` — so the marker is written for a full token lifetime, which covers the
 * freshest token that could exist. `resetPassword` writes the same key with the
 * same 3600 for the same reason (`gateway.controller.ts`).
 */
const REVOCATION_TTL_SECONDS = 3600;

/**
 * Roles & staff.
 *
 * Both `/admin/roles` and `/admin/staff` used to be static arrays inside the
 * admin console: seventeen roles with invented user counts and twelve
 * fictional colleagues. Creating a role mutated React state and a reload put
 * the fixtures back, so no permission the console displayed had ever been
 * recorded anywhere, let alone enforced.
 *
 * Roles are a global entity by nature — the permission vocabulary is
 * platform-wide, not a market's own business — so a region-locked admin is
 * refused outright on every `/admin/roles` route, reads included.
 *
 * Staff are different: global as a DIRECTORY, regional as RECORDS (audit
 * F-31). `GET /admin/staff` and `PATCH /admin/staff/:id` admit a region-locked
 * admin, narrowed to staff whose own `regionCode` equals theirs — see
 * `scopeOf`/`assertInMarket` in each handler. Neither route lets a locked
 * caller grant a role or touch the market lock itself (that would be an
 * escalation performed one PATCH at a time), and `POST /admin/staff` — minting
 * an account — stays SUPER_ADMIN only: creating an unlocked account is a
 * platform act no market's administrator should hold.
 *
 * The reads also admit a global ADMIN holding `staff.view`; every write also
 * requires `staff.manage`. The seeded `regional_admin` role carries both keys
 * (it did not, before this: a region-locked admin was refused the whole
 * screen, so the gap was never noticed).
 */
@ApiTags('👑 Admin — Access')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin')
export class AdminAccessController {
  private readonly logger = new Logger(AdminAccessController.name);

  constructor(
    @InjectRepository(AdminRole) private readonly roleRepo: Repository<AdminRole>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly kafka: KafkaProducerService,
    private readonly encryption: EncryptionService,
    private readonly redis: RedisService,
  ) {}

  /**
   * End every live session belonging to a staff account that was just
   * deactivated.
   *
   * Flipping `isActive` alone did not do it. `/auth/refresh` re-reads the
   * account and refuses a deactivated one, so renewal stopped — but the access
   * token already in the browser is self-contained and stayed valid for the
   * rest of its hour, which made "revoke this administrator" a decision that
   * took up to sixty minutes to happen, with nothing in the console saying so.
   *
   * The mechanism is the one `resetPassword` already uses: `JwtAuthGuard`
   * checks `revoked-users:<id>` after the signature verifies and answers 401,
   * so the token dies on the next request rather than at its own expiry.
   * Per-user rather than per-`jti` on purpose — a deactivation should end every
   * device, which is exactly the difference from sign-out.
   *
   * Redis failures are logged, not thrown: the guard's own revocation check
   * already fails open when Redis is unreachable (`jwt-auth.guard.ts` logs and
   * continues), so throwing here would buy no security and would instead make
   * the `isActive:false` write — the durable half of the decision, which
   * `/auth/refresh` enforces from Postgres — fail with it.
   */
  private async endSessions(userId: string): Promise<boolean> {
    try {
      await this.redis.set(`revoked-users:${userId}`, 'staff-deactivated', REVOCATION_TTL_SECONDS);
      await this.redis.del(`refresh:${userId}`);
      await this.redis.del(`session:${userId}`);
      return true;
    } catch (e) {
      this.logger.error(
        `Deactivated ${userId} but could not revoke its live session: ${(e as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Undo this controller's own revocation when an account is switched back on.
   *
   * Without it, "deactivate, then think better of it" locks the account out for
   * the marker's full hour — `revoked-users:` is per *user*, so even a fresh
   * sign-in with a fresh token is refused, and nothing in the console would say
   * why.
   *
   * Only this controller's marker is cleared. A `password-reset` revocation,
   * written by `gateway.controller.ts` for a different reason, is left where it
   * is: deleting it would make tokens minted before the reset valid again.
   */
  private async restoreSessions(userId: string): Promise<void> {
    try {
      if ((await this.redis.get(`revoked-users:${userId}`)) === 'staff-deactivated') {
        await this.redis.del(`revoked-users:${userId}`);
      }
    } catch (e) {
      this.logger.error(
        `Reactivated ${userId} but could not clear its revocation marker: ${(e as Error).message}`,
      );
    }
  }

  /** The acting administrator, from the verified token — recorded on mutations. */
  private actorId(req: any): string {
    return req?.user?.id ?? req?.user?.userId ?? req?.user?.sub ?? 'unknown';
  }

  /** @see resolveScope — the shared implementation. */
  private scopeOf(req: any, requested?: string, what = 'that market') {
    return resolveScope(req, requested, what);
  }

  /**
   * Permissions a console-made role may hold.
   *
   * The wildcard is refused outright. Accepting it would let anyone who can
   * reach this route mint a second `super_admin` under a different name —
   * indistinguishable in effect, but not marked `is_system`, so none of the
   * protections on the real one (undeletable, uneditable, unassignable) would
   * apply to it. The seeded `super_admin` row keeps its `*`; nothing else may
   * acquire one.
   */
  private validatePermissions(perms: string[]) {
    if ((perms ?? []).includes(ALL_PERMISSIONS)) {
      throw new BadRequestException('The wildcard is reserved for the system super_admin role.');
    }
    const unknown = unknownPermissionKeys(perms ?? []);
    if (unknown.length) {
      throw new BadRequestException(`Unknown permission key(s): ${unknown.join(', ')}`);
    }
  }

  /**
   * Timestamps are sent as ISO strings, not Date objects.
   *
   * `PciComplianceInterceptor` rebuilds every response through
   * `{ ...data }`, and spreading a Date yields `{}` — so a Date returned from
   * any gateway route reaches the browser as an empty object and the console
   * prints "Joined [object Object]". Converting here keeps these two routes
   * correct regardless; the interceptor itself is a platform-wide bug that
   * belongs to whoever owns libs/security.
   */
  private iso(value: Date | string | null | undefined): string | null {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  /** A role on the wire — named fields, timestamps as strings. */
  private roleView(role: AdminRole, userCount?: number) {
    return {
      id: role.id,
      key: role.key,
      name: role.name,
      description: role.description ?? null,
      permissions: role.permissions ?? [],
      isSystem: role.isSystem === true,
      ...(userCount === undefined ? {} : { userCount }),
      createdAt: this.iso(role.createdAt),
      updatedAt: this.iso(role.updatedAt),
    };
  }

  // ── Roles ──────────────────────────────────────────────────────────────────

  @Get('roles')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, 'perm:staff.view')
  @GlobalEntity('roles apply to every market')
  @ApiOperation({ summary: 'Admin roles with their permission sets' })
  async listRoles(@Req() req: any) {
    refuseLockedAdmin(req, 'roles and staff', 'Roles and staff are managed globally.');
    const roles = await this.roleRepo.find({ order: { isSystem: 'DESC', name: 'ASC' } });
    // Counted per role rather than guessed: "8 users" on the old page was a
    // literal, and it is the number an operator checks before deleting a role.
    const counts = await Promise.all(
      roles.map((r) => this.userRepo.count({ where: { adminRoleId: r.id } })),
    );
    return {
      data: roles.map((r, i) => this.roleView(r, counts[i])),
      permissions: ADMIN_PERMISSIONS,
    };
  }

  @Post('roles')
  @Roles(UserRole.SUPER_ADMIN, 'perm:staff.manage')
  @ApiOperation({ summary: 'Create a custom role' })
  async createRole(@Req() req: any, @Body() dto: CreateRoleDto) {
    refuseLockedAdmin(req, 'roles and staff', 'Roles and staff are managed globally.');
    this.validatePermissions(dto.permissions);
    if (await this.roleRepo.findOne({ where: { key: dto.key } })) {
      throw new ConflictException('A role with that key exists.');
    }
    const role = await this.roleRepo.save(
      this.roleRepo.create({
        key: dto.key,
        name: dto.name,
        description: dto.description ?? null,
        permissions: dto.permissions,
        isSystem: false,
      }),
    );
    await this.kafka.publish('admin.role.created', {
      roleId: role.id,
      key: role.key,
      actorId: this.actorId(req),
    });
    return { data: this.roleView(role, 0) };
  }

  @Patch('roles/:id')
  @Roles(UserRole.SUPER_ADMIN, 'perm:staff.manage')
  @ApiOperation({ summary: 'Rename a role or change its permissions' })
  async updateRole(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    refuseLockedAdmin(req, 'roles and staff', 'Roles and staff are managed globally.');
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    // Narrowing super_admin from a web form would lock every administrator out
    // of the platform, with no role left that could undo it.
    if (role.key === 'super_admin') {
      throw new ForbiddenException('The super_admin role cannot be edited.');
    }
    if (dto.permissions) this.validatePermissions(dto.permissions);
    if (dto.name !== undefined) role.name = dto.name;
    if (dto.description !== undefined) role.description = dto.description ?? null;
    if (dto.permissions !== undefined) role.permissions = dto.permissions;
    const saved = await this.roleRepo.save(role);
    await this.kafka.publish('admin.role.updated', {
      roleId: id,
      actorId: this.actorId(req),
      permissions: saved.permissions,
    });
    return { data: this.roleView(saved) };
  }

  @Delete('roles/:id')
  @Roles(UserRole.SUPER_ADMIN, 'perm:staff.manage')
  @ApiOperation({ summary: 'Delete a custom role that no staff member holds' })
  async deleteRole(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    refuseLockedAdmin(req, 'roles and staff', 'Roles and staff are managed globally.');
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new ConflictException('System roles cannot be deleted.');
    const holders = await this.userRepo.count({ where: { adminRoleId: id } });
    if (holders > 0) {
      throw new ConflictException(
        `Reassign the ${holders} staff member(s) holding this role first.`,
      );
    }
    await this.roleRepo.remove(role);
    await this.kafka.publish('admin.role.deleted', { roleId: id, actorId: this.actorId(req) });
    return { success: true };
  }

  // ── Staff ──────────────────────────────────────────────────────────────────

  @Get('staff')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, 'perm:staff.view')
  @ApiOperation({ summary: 'Staff accounts' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'roleId', required: false })
  @ApiQuery({ name: 'regionCode', required: false })
  async listStaff(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('roleId') roleId?: string,
    @Query('regionCode') regionCode?: string,
  ) {
    // Staff are global as a DIRECTORY and regional as RECORDS. A locked admin
    // was refused the whole screen, so they could not see who administers their
    // own market — while `users.region_code` was sitting right there and this
    // route already accepted `?regionCode=` (audit F-31). Roles stay global:
    // they are the permission vocabulary, not a market's own business.
    const { scope, market } = this.scopeOf(req, regionCode, 'those staff accounts');
    const size = Math.min(Math.max(Number(limit) || 20, 1), MAX_PAGE_SIZE);
    const current = Math.max(Number(page) || 1, 1);
    const qb = this.userRepo
      .createQueryBuilder('u')
      .where('UPPER(u.role::text) IN (:...roles)', { roles: [...STAFF_ROLES] });
    if (search) {
      qb.andWhere('(u.email ILIKE :q OR u.firstName ILIKE :q OR u.lastName ILIKE :q)', {
        q: `%${search}%`,
      });
    }
    if (roleId) qb.andWhere('u.adminRoleId = :roleId', { roleId });
    // `requireMarket`, not the permissive `requested` slot: `applyMarketFilter`
    // deliberately IGNORES a value in that slot it cannot read (it only ever
    // expects a global admin's typo there, and a global admin may see every
    // market anyway) — so `?regionCode=ZZ` would add no predicate at all and
    // hand back every market's staff (N4). `market` is already the resolved,
    // lock-aware value (the caller's own region when locked, the requested
    // filter when global); `requireMarket` is what refuses it here rather
    // than widening it when it cannot be read.
    applyMarketFilter(
      qb,
      'UPPER(u.regionCode)',
      requireMarket(market, 'staff market', this.logger),
    );
    // A locked caller additionally never sees a global account: an unlocked
    // admin belongs to every market, which is not theirs to administer.
    if (scope) qb.andWhere('u.regionLocked = true');
    const [rows, total] = await qb
      .orderBy('u.createdAt', 'DESC')
      .skip((current - 1) * size)
      .take(size)
      .getManyAndCount();
    return { data: rows.map((u) => this.staffView(u)), total, page: current, limit: size };
  }

  @Post('staff')
  @Roles(UserRole.SUPER_ADMIN, 'perm:staff.manage')
  @ApiOperation({ summary: 'Create a staff account; a temporary password is emailed' })
  async createStaff(@Req() req: any, @Body() dto: CreateStaffDto) {
    refuseLockedAdmin(req, 'roles and staff', 'Roles and staff are managed globally.');
    const email = dto.email.toLowerCase().trim();
    if (await this.userRepo.findOne({ where: { email } })) {
      throw new ConflictException('An account with this email already exists');
    }
    const role = await this.roleRepo.findOne({ where: { id: dto.adminRoleId } });
    if (!role) throw new BadRequestException('Unknown admin role');
    if (role.key === 'super_admin') {
      throw new ForbiddenException(
        'SUPER_ADMIN accounts are created by an operator, not through the console.',
      );
    }
    const market = dto.regionCode?.toUpperCase() ?? null;
    if (dto.regionLocked === true && !market) {
      throw new BadRequestException('A locked account needs a market');
    }

    // Generated here, hashed before it is stored, and delivered out of band.
    // The caller never chooses it: an operator who could set the password could
    // sign in as the account they just created.
    const temporaryPassword = crypto.randomBytes(9).toString('base64url');
    const user = this.userRepo.create({
      email,
      // Phones are PII at rest — the same AES-GCM field encryption /register
      // applies. Storing it plain here would put every administrator's number
      // in the clear next to accounts that hold platform-wide authority.
      phone: dto.phone ? this.encryption.encrypt(dto.phone) : null,
      passwordHash: await bcrypt.hash(temporaryPassword, 12),
      firstName: dto.firstName,
      lastName: dto.lastName,
      // Lower-cased: `UserRole` values are the enum labels (`admin`), while the
      // DTO, the tokens and the console all talk in `ADMIN`. Writing the
      // upper-case spelling into a column that really is `users_role_enum`
      // fails with "invalid input value for enum"; `staffView` upper-cases it
      // again on the way out.
      role: dto.role.toLowerCase() as UserRole,
      regionCode: market,
      regionLocked: dto.regionLocked === true,
      adminRoleId: role.id,
      isActive: true,
      status: 'active',
    } as Partial<User>);
    const saved = await this.userRepo.save(user);

    // `to`/`subject`/`body` are NotificationService's own EmailPayload fields;
    // any other spelling delivers an empty mail (see staff-mfa.service.ts).
    await this.kafka.publish(KAFKA_TOPICS.NOTIFICATION_EMAIL, {
      to: email,
      subject: 'Your KARTSEEK admin account',
      body:
        `Your KARTSEEK admin account is ready. Temporary password: ${temporaryPassword}\n` +
        `Sign in at the admin console and change it immediately.`,
      templateId: 'staff-welcome',
      variables: { temporaryPassword },
    });
    await this.kafka.publish('admin.staff.created', {
      userId: saved.id,
      role: saved.role,
      regionCode: saved.regionCode,
      adminRoleId: role.id,
      actorId: this.actorId(req),
    });
    this.logger.log(`Staff account created: ${email} (${saved.role}) by ${this.actorId(req)}`);

    return {
      data: {
        ...this.staffView(saved),
        ...(this.echoAllowed() ? { temporaryPassword } : {}),
      },
    };
  }

  @Patch('staff/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, 'perm:staff.manage')
  @ApiOperation({ summary: "Change a staff member's role, market lock or active flag" })
  async updateStaff(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that staff account');
    const user = await this.userRepo.findOne({ where: { id } });
    // Not a 403: these routes manage staff, and a customer id is simply not a
    // staff member. Saying so plainly avoids the staff directory doubling as a
    // way to edit ordinary users.
    if (!user || !(STAFF_ROLES as readonly string[]).includes(String(user.role).toUpperCase())) {
      throw new NotFoundException('Staff member not found');
    }
    // A locked admin may edit staff in their own market — and only staff who
    // are themselves locked to it. A global account belongs to every market.
    if (scope) {
      if (!user.regionLocked) {
        refuseLockedAdmin(req, 'a global staff account');
      }
      assertInMarket(user.regionCode, scope, 'staff account', this.logger);
      // Two things a market's administrator must not do to their own staff:
      // grant a role (the permission vocabulary is platform-wide) and unlock
      // the account (which would make it global — an escalation performed one
      // PATCH at a time).
      if (dto.adminRoleId !== undefined) {
        throw new ForbiddenException('Only a global administrator may change a role assignment.');
      }
      if (dto.regionCode !== undefined || dto.regionLocked !== undefined) {
        throw new ForbiddenException('Only a global administrator may change a market lock.');
      }
    }
    if (user.id === this.actorId(req) && dto.isActive === false) {
      throw new BadRequestException('You cannot deactivate your own account.');
    }
    if (dto.adminRoleId) {
      const role = await this.roleRepo.findOne({ where: { id: dto.adminRoleId } });
      if (!role) throw new BadRequestException('Unknown admin role');
      if (role.key === 'super_admin') {
        throw new ForbiddenException('The super_admin role is not assignable from the console.');
      }
    }
    const nextMarket =
      dto.regionCode !== undefined ? (dto.regionCode?.toUpperCase() ?? null) : user.regionCode;
    const nextLocked = dto.regionLocked !== undefined ? dto.regionLocked : user.regionLocked;
    // The RESULTING pair, not the request. `{"regionCode": null}` on a locked
    // account passed the old check — `dto.regionLocked` was undefined — and left
    // `region_locked = true` with `region_code = null`. `marketScopeOf` reads
    // that as `locked: false`, so the account quietly became a GLOBAL admin
    // while the console went on drawing its "region locked" badge (audit H-13).
    if (nextLocked && !nextMarket) {
      throw new BadRequestException(
        'A locked account needs a market: set a market, or clear the lock in the same request.',
      );
    }

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.phone !== undefined) {
      user.phone = dto.phone ? this.encryption.encrypt(dto.phone) : null;
    }
    if (dto.role !== undefined) user.role = dto.role.toLowerCase() as UserRole;
    if (dto.adminRoleId !== undefined) user.adminRoleId = dto.adminRoleId;
    if (dto.regionCode !== undefined) user.regionCode = nextMarket;
    if (dto.regionLocked !== undefined) user.regionLocked = dto.regionLocked;
    if (dto.isActive !== undefined) {
      user.isActive = dto.isActive;
      user.status = dto.isActive ? 'active' : 'suspended';
    }
    const saved = await this.userRepo.save(user);
    // Order matters: the account is deactivated in Postgres first, so a Redis
    // outage cannot leave a live session behind an account that still reads as
    // active. Only once the durable half is written is the live half ended.
    if (dto.isActive === false) {
      const revoked = await this.endSessions(id);
      this.logger.log(
        `Staff account deactivated: ${id} by ${this.actorId(req)} — ` +
          (revoked ? 'live session revoked' : 'live session NOT revoked (see error above)'),
      );
    } else if (dto.isActive === true) {
      await this.restoreSessions(id);
    }
    // Best-effort, like the session revocation above: the staff record is
    // already durably saved, and an audit event that failed to publish must
    // not turn a successful edit into a 500 for the operator who made it.
    try {
      await this.kafka.publish('admin.staff.updated', {
        userId: id,
        actorId: this.actorId(req),
        changes: Object.keys(dto),
      });
    } catch (e) {
      this.logger.error(
        `Staff account updated (${id}) but the audit event failed to publish: ${(e as Error).message}`,
      );
    }
    return { data: this.staffView(saved) };
  }

  /**
   * Whether the response may carry the temporary password back to the caller.
   * Same rule as the sign-in code (`StaffMfaService.echoAllowed`): a local
   * fleet may echo it so proof scripts work, and `NODE_ENV=production` vetoes
   * every flag, so no deployment can echo a credential however it is set.
   */
  private echoAllowed(): boolean {
    return (
      process.env.NODE_ENV !== 'production' &&
      (process.env.DEV_MFA_ECHO === 'true' || process.env.DEV_AUTH_BYPASS === 'true')
    );
  }

  /**
   * What a staff record looks like on the wire.
   *
   * Built by naming fields rather than by deleting them from the entity: the
   * next column added to `users` should not appear here by default. There is
   * no `passwordHash`, and no phone value — the stored number is ciphertext,
   * so returning it would ship an unreadable string, and decrypting it would
   * put every administrator's number in a list response. `hasPhone` is what
   * the console actually needs to know.
   */
  private staffView(u: User) {
    return {
      id: u.id,
      email: u.email,
      name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
      firstName: u.firstName ?? '',
      lastName: u.lastName ?? '',
      hasPhone: Boolean(u.phone),
      role: String(u.role).toUpperCase(),
      adminRoleId: u.adminRoleId ?? null,
      regionCode: u.regionCode ?? null,
      regionLocked: u.regionLocked === true,
      isActive: u.isActive,
      status: u.status,
      createdAt: this.iso(u.createdAt),
    };
  }
}
