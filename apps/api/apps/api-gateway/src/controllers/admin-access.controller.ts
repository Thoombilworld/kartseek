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
import { applyMarketFilter, assertInMarket, normaliseMarket, requireMarket } from '@app/common';
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
 * STAFF AUTHORITY, RANKED — one table, read in exactly one place.
 *
 * `users.role` is the gate `RolesGuard` reads for every role-gated route in the
 * gateway, so "who may write it" is the whole question. R12 let a region-locked
 * admin edit their own market's staff and checked the market, the role
 * *assignment* (`admin_role_id`) and the lock — but not `role` itself. A locked
 * `SUPPORT_AGENT` holding `staff.manage` could therefore `PATCH` its own record
 * to `role: 'ADMIN'`, and a `SUPER_ADMIN` row that happened to carry the
 * caller's market lock could be demoted or deactivated by that market's admin
 * (review C1/I5).
 *
 * Ranking the roles turns both of those into one rule that can be stated in a
 * sentence and enforced in one method: **you may only administer an account
 * below your own rank, and only assign a role below your own rank.** So a
 * regional admin (ADMIN) may create and manage `SUPPORT_AGENT`,
 * `FINANCE_MANAGER` and `PRODUCT_MANAGER` inside their market and nothing else;
 * `SUPER_ADMIN` is assignable by a `SUPER_ADMIN` alone; and nobody — of any
 * rank — rewrites their own authority (see `assertNotOwnAuthority`).
 *
 * The two managers share a rank on purpose: neither has any authority over the
 * other, and equal rank already means "cannot administer", which is the answer.
 * A role absent from this table ranks 0: a CUSTOMER or a SELLER can administer
 * nobody, and `STAFF_ROLES` keeps them out of these routes anyway.
 */
const ROLE_RANK: Readonly<Record<string, number>> = {
  SUPER_ADMIN: 40,
  ADMIN: 30,
  FINANCE_MANAGER: 20,
  PRODUCT_MANAGER: 20,
  SUPPORT_AGENT: 10,
};

/** A role's rank, or 0 for anything the table does not name. */
function rankOf(role: unknown): number {
  return ROLE_RANK[String(role ?? '').toUpperCase()] ?? 0;
}

/**
 * The fields that decide what an account may do. A change to any of them is an
 * authority change, which is what the rank rules and the self-check govern;
 * `firstName`, `lastName` and `phone` are contact details and are not.
 */
const AUTHORITY_FIELDS = ['role', 'adminRoleId', 'regionCode', 'regionLocked', 'isActive'] as const;

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
 * F-31). All three staff routes admit a region-locked admin, narrowed to staff
 * whose own `regionCode` equals theirs — see `scopeOf`/`assertInMarket` in each
 * handler — and every write is then bounded by rank (`ROLE_RANK`):
 *
 *   • a regional admin (ADMIN, locked) creates and manages `SUPPORT_AGENT`,
 *     `FINANCE_MANAGER` and `PRODUCT_MANAGER` accounts inside their own
 *     market, with the lock forced on;
 *   • `admin_role_id` and the market lock are SUPER_ADMIN's alone — the
 *     permission vocabulary is platform-wide and an account that can unlock
 *     itself is an account that can go global one PATCH at a time;
 *   • an account never changes its own role, lock or active flag, whatever its
 *     rank: a self-write is the one change no second administrator has seen;
 *   • minting an account with no market at all stays SUPER_ADMIN's act.
 *
 * The reads also admit a global ADMIN holding `staff.view`; every write also
 * requires `staff.manage`. The seeded `regional_admin` role carries both keys —
 * it did not before R12 (a region-locked admin was refused the whole screen, so
 * the gap was never noticed), and the grant reaches an already-provisioned
 * database through `migrations/1786502400000-RegionalAdminStaffPermissions.ts`
 * rather than by editing the seed of a migration that has already run.
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

  /** The caller's own role, upper-cased, from the verified token. */
  private callerRole(req: any): string {
    return String(req?.user?.role ?? '').toUpperCase();
  }

  /**
   * The caller must outrank the account they are about to change.
   *
   * Applied to the authority writes only (`role`, `isActive`), so a market's
   * administrator can still correct a peer's name — and never their authority.
   * A `SUPER_ADMIN` target is refused for every other rank by the same
   * comparison, which is the specific escalation review C1 names: a SUPER_ADMIN
   * row carrying `region_locked = true` with a regional admin's market passed
   * the market check and could then be demoted or deactivated by them.
   */
  private assertOutranksTarget(req: any, targetRole: unknown, what: string): void {
    const caller = this.callerRole(req);
    if (rankOf(caller) > rankOf(targetRole)) return;
    this.logger.warn(
      `[staff-rank-denied] user=${this.actorId(req)} role=${caller} ` +
        `target=${String(targetRole ?? '').toUpperCase()} what="${what}"`,
    );
    throw new ForbiddenException(
      'You may only manage staff accounts whose role is below your own.',
    );
  }

  /**
   * A granted `admin_role_id` may not carry a permission the grantor lacks.
   *
   * `assertMayAssignRole` below caps the new account's `users.role` by RANK,
   * and `role.key === 'super_admin'` is refused outright — but nothing bounded
   * which of the remaining role ROWS could be attached. A QA regional admin
   * could therefore create a `FINANCE_MANAGER` in QA holding the seeded `admin`
   * role, a permission set including `system.health` and `franchise.manage`,
   * neither of which `regional_admin` holds (R12 re-review).
   *
   * The reason the rank cap is not the whole answer: roughly twenty routes in
   * `admin-marketplace.controller.ts` read `@Roles(SUPER_ADMIN, ADMIN,
   * FINANCE_MANAGER, 'perm:…')` (`:1121`, `:1326`, `:2538` among them), so the
   * granted role's keys really are reachable by a `FINANCE_MANAGER` account.
   * It was not a live escalation only because the four keys those routes use —
   * `orders.view`, `orders.refund`, `finance.view`, `finance.payouts` — happen
   * to be in `regional_admin` already. A bound that holds by coincidence stops
   * holding when the next role row is seeded, so it is a rule here instead.
   *
   * SUPER_ADMIN is exempt: they sign with `'*'` and hold every key by
   * definition. A caller with no `adminPermissions` claim holds none and may
   * grant none — fail closed, the way the gateway's own `RolesGuard` treats a
   * missing claim rather than skipping the check. Unreachable in practice,
   * because both routes require `perm:staff.manage` to get this far.
   */
  private assertMayAssignAdminRole(
    req: any,
    role: { key?: string; name?: string; permissions?: string[] | null },
  ): void {
    const wanted = Array.isArray(role?.permissions) ? role.permissions : [];
    // The wildcard first, and regardless of what the caller holds: a caller
    // signed in with `'*'` would pass the subset test below, and minting a
    // second account that holds everything stays a SUPER_ADMIN's act.
    if (wanted.includes(ALL_PERMISSIONS)) {
      if (this.callerRole(req) === 'SUPER_ADMIN') return;
      this.logger.warn(
        `[staff-permission-denied] user=${this.actorId(req)} role=${this.callerRole(req)} ` +
          `grant=${role?.key ?? 'unknown'} (wildcard)`,
      );
      throw new ForbiddenException(
        'Only a SUPER_ADMIN may assign a role holding the wildcard permission.',
      );
    }
    if (this.callerRole(req) === 'SUPER_ADMIN') return;
    const granted: string[] = Array.isArray(req?.user?.adminPermissions)
      ? req.user.adminPermissions
      : [];
    if (granted.includes(ALL_PERMISSIONS)) return;
    const excess = wanted.filter((key) => !granted.includes(key));
    if (!excess.length) return;
    this.logger.warn(
      `[staff-permission-denied] user=${this.actorId(req)} role=${this.callerRole(req)} ` +
        `grant=${role?.key ?? 'unknown'} excess=${excess.join(',')}`,
    );
    throw new ForbiddenException(
      `You may only assign a role whose permissions you hold yourself; ` +
        `this one adds ${excess.join(', ')}.`,
    );
  }

  /** A role may only be granted downwards: SUPER_ADMIN is a SUPER_ADMIN's to give. */
  private assertMayAssignRole(req: any, role: unknown): void {
    const caller = this.callerRole(req);
    if (rankOf(caller) > rankOf(role)) return;
    this.logger.warn(
      `[staff-rank-denied] user=${this.actorId(req)} role=${caller} ` +
        `grant=${String(role ?? '').toUpperCase()}`,
    );
    throw new ForbiddenException('You may only assign a role below your own.');
  }

  /**
   * Nobody rewrites their own authority, whatever their rank.
   *
   * `isActive: false` keeps its own older wording because it is the case an
   * operator actually meets (the console's own "deactivate" button on their own
   * row); the rest share one message. The deeper reason is the same for all of
   * them: a self-write is the one change no second administrator has seen, so
   * an account that can promote itself is an account with no ceiling —
   * `users.role` is what every role gate in the gateway reads.
   */
  private assertNotOwnAuthority(req: any, dto: Partial<Record<string, unknown>>): void {
    if (dto.isActive === false) {
      throw new BadRequestException('You cannot deactivate your own account.');
    }
    const touched = AUTHORITY_FIELDS.filter((f) => dto[f] !== undefined);
    if (!touched.length) return;
    this.logger.warn(
      `[staff-self-authority-denied] user=${this.actorId(req)} ` +
        `role=${this.callerRole(req)} fields=${touched.join(',')}`,
    );
    throw new ForbiddenException(
      'You cannot change your own role, market lock or active flag — another administrator must.',
    );
  }

  /**
   * Validate the RESULTING lock state, and validate it strictly.
   *
   * Two ways an account ends up drawn as locked while behaving as global, and
   * both are refused here rather than in the DTO — either field may be omitted
   * from a request while the other one changes it, so only the resulting pair
   * is checkable (audit H-13):
   *
   *   • no market at all — `{"regionCode": null}` on a locked account left
   *     `region_locked = true, region_code = NULL`, and `marketScopeOf` reads
   *     that as `locked: false`: a silent promotion to global admin while the
   *     console went on drawing its "region locked" badge.
   *   • a market this platform cannot read — `{"regionCode": "ZZ"}` passes the
   *     DTO's `/^[A-Za-z]{2}$/` and every scoped route then refuses that
   *     account with the unattributable copy. Fail-closed, but bricked, and
   *     invisible to a `region_code IS NULL` tripwire (review I4). This task
   *     added `requireMarket` to the READ precisely because an unreadable
   *     market must refuse rather than widen; the write that creates one has to
   *     refuse too.
   */
  private assertLockState(market: string | null | undefined, locked: boolean | undefined): void {
    if (!locked) return;
    if (!market) {
      throw new BadRequestException(
        'A locked account needs a market: set a market, or clear the lock in the same request.',
      );
    }
    if (!normaliseMarket(market)) {
      throw new BadRequestException(
        `A locked account needs a market this platform knows: "${market}" ` +
          `cannot be attributed to a market yet.`,
      );
    }
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, 'perm:staff.manage')
  @ApiOperation({ summary: 'Create a staff account; a temporary password is emailed' })
  async createStaff(@Req() req: any, @Body() dto: CreateStaffDto) {
    // A market's administrator may staff their own market — and only their own
    // market, only below their own rank, and only with the lock on. Passing
    // `dto.regionCode` through `scopeOf` is what refuses "QA creates an IN
    // account": `resolveMarket` answers 403 for a locked caller who names
    // another market, and hands a locked caller their own market back when the
    // request names none.
    const { scope, market } = this.scopeOf(req, dto.regionCode ?? undefined, 'that staff account');
    // Minting an account with NO market is a platform act, and it is the one
    // this route always refused: before R12 the role gate was SUPER_ADMIN
    // alone. Widening it so an actual regional admin can reach the route must
    // not hand account creation to every global ADMIN holding `staff.manage`,
    // so the global case is refused in the handler instead (review I5).
    if (!scope && this.callerRole(req) !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Only a SUPER_ADMIN may create a staff account outside a single market.',
      );
    }
    // "Cannot change any lock" includes the lock on an account they create: a
    // regional admin who could mint an unlocked account could mint themselves
    // a global colleague.
    if (scope && dto.regionLocked === false) {
      throw new ForbiddenException('Only a global administrator may change a market lock.');
    }
    // Rank, not the DTO's enum: `ASSIGNABLE_STAFF_ROLES` admits `ADMIN`, which
    // a regional admin must not grant.
    //
    // The rank cap is the ceiling on the account's `users.role`; it is NOT a
    // ceiling on the permission set its `admin_role_id` carries. This comment
    // used to claim it was, on the grounds that every admin route requires
    // `UserRole.ADMIN`/`SUPER_ADMIN` beside its `perm:` key — and about twenty
    // routes in `admin-marketplace.controller.ts` also admit
    // `UserRole.FINANCE_MANAGER`, so a granted role's keys really are
    // reachable. `assertMayAssignAdminRole` is the second cap, applied to the
    // role row below once it has been loaded.
    this.assertMayAssignRole(req, dto.role);
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
    this.assertMayAssignAdminRole(req, role);
    // A locked caller's new account is forced into their own market with the
    // lock on; a global caller still says both explicitly. Either way the
    // resulting pair is validated, not the request (`assertLockState`).
    const nextMarket = scope ?? dto.regionCode?.toUpperCase() ?? null;
    const nextLocked = scope ? true : dto.regionLocked === true;
    this.assertLockState(nextMarket, nextLocked);

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
      regionCode: nextMarket,
      regionLocked: nextLocked,
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
    // The platform owner's record is nobody else's to touch — not its name
    // either. Refused here, ahead of the market check, because a SUPER_ADMIN
    // row that happens to carry `region_locked = true` with a regional admin's
    // market passes that check: R12 left such a row demotable and deactivatable
    // by the market's own admin (review C1).
    if (
      String(user.role).toUpperCase() === 'SUPER_ADMIN' &&
      this.callerRole(req) !== 'SUPER_ADMIN'
    ) {
      this.logger.warn(
        `[staff-rank-denied] user=${this.actorId(req)} role=${this.callerRole(req)} ` +
          `target=SUPER_ADMIN id=${id}`,
      );
      throw new ForbiddenException('A SUPER_ADMIN account can only be changed by a SUPER_ADMIN.');
    }
    // A locked admin may edit staff in their own market — and only staff who
    // are themselves locked to it. A global account belongs to every market.
    if (scope) {
      if (!user.regionLocked) {
        refuseLockedAdmin(req, 'a global staff account');
      }
      assertInMarket(user.regionCode, scope, 'staff account', this.logger);
    }
    // Then the four rules that do not depend on the lock, in one place and in
    // this order, so a refusal names the nearest reason:
    //
    //   1. nobody rewrites their own authority — including their own `role`,
    //      which R12 left falling through to the assignment below (review C1);
    //   2. the permission vocabulary and the market lock stay SUPER_ADMIN's.
    //      They were gated on `if (scope)`, so widening the route's role gate
    //      to admit the regional admin also handed both to every *global*
    //      ADMIN holding `staff.manage` — which before R12 was SUPER_ADMIN-only
    //      (review I5);
    //   3. you may only administer an account below your own rank;
    //   4. you may only grant a role below your own rank.
    if (user.id === this.actorId(req)) {
      this.assertNotOwnAuthority(req, dto as Record<string, unknown>);
    }
    if (this.callerRole(req) !== 'SUPER_ADMIN') {
      if (dto.adminRoleId !== undefined) {
        throw new ForbiddenException('Only a global administrator may change a role assignment.');
      }
      if (dto.regionCode !== undefined || dto.regionLocked !== undefined) {
        throw new ForbiddenException('Only a global administrator may change a market lock.');
      }
    }
    if (dto.role !== undefined || dto.isActive !== undefined) {
      this.assertOutranksTarget(req, user.role, 'that staff account');
    }
    if (dto.role !== undefined) this.assertMayAssignRole(req, dto.role);
    if (dto.adminRoleId) {
      const role = await this.roleRepo.findOne({ where: { id: dto.adminRoleId } });
      if (!role) throw new BadRequestException('Unknown admin role');
      if (role.key === 'super_admin') {
        throw new ForbiddenException('The super_admin role is not assignable from the console.');
      }
      // The same permission cap as `createStaff`. Only a SUPER_ADMIN reaches
      // this line today — `dto.adminRoleId` is refused for every other caller
      // eleven lines above — and they are exempt, so it never fires here. It is
      // written anyway: the two writes must not be able to disagree about what
      // a role grant costs, and the refusal above is one review away from being
      // relaxed.
      this.assertMayAssignAdminRole(req, role);
    }
    const nextMarket =
      dto.regionCode !== undefined ? (dto.regionCode?.toUpperCase() ?? null) : user.regionCode;
    const nextLocked = dto.regionLocked !== undefined ? dto.regionLocked : user.regionLocked;
    // The RESULTING pair, not the request — see `assertLockState` for both of
    // the states it refuses and why the DTO cannot do this.
    this.assertLockState(nextMarket, nextLocked);

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
