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
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { GlobalEntity } from '../decorators/global-entity.decorator';
import { refuseLockedAdmin } from '../guards/market-scope';
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
 * Roles & staff — SUPER_ADMIN to write, and never a market-locked account.
 *
 * Both `/admin/roles` and `/admin/staff` used to be static arrays inside the
 * admin console: seventeen roles with invented user counts and twelve
 * fictional colleagues. Creating a role mutated React state and a reload put
 * the fixtures back, so no permission the console displayed had ever been
 * recorded anywhere, let alone enforced.
 *
 * These are global entities by nature — a role applies in every market, and a
 * staff record is what *creates* a market lock — so a region-locked admin is
 * refused outright rather than scoped, reads included. Letting the Qatar admin
 * merely *read* the directory would still hand them every colleague's email
 * and every market's staffing; letting them write would let them mint
 * themselves an unlocked account.
 *
 * The two reads also admit a global ADMIN holding `staff.view` — the console's
 * "Staff Management" item is gated on that key, and a link that always answers
 * 403 is worse than no link. Every write stays SUPER_ADMIN + `staff.manage`:
 * reading the directory is not the same authority as minting an account in it.
 * `regional_admin` carries neither key, so a market-locked admin is still
 * refused here on two counts.
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
  ) {}

  /** The acting administrator, from the verified token — recorded on mutations. */
  private actorId(req: any): string {
    return req?.user?.id ?? req?.user?.userId ?? req?.user?.sub ?? 'unknown';
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
  @GlobalEntity('staff directory is global; the lock is a property of each record')
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
    refuseLockedAdmin(req, 'roles and staff', 'Roles and staff are managed globally.');
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
    if (regionCode) qb.andWhere('UPPER(u.regionCode) = :rc', { rc: regionCode.toUpperCase() });
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
  @Roles(UserRole.SUPER_ADMIN, 'perm:staff.manage')
  @ApiOperation({ summary: "Change a staff member's role, market lock or active flag" })
  async updateStaff(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    refuseLockedAdmin(req, 'roles and staff', 'Roles and staff are managed globally.');
    const user = await this.userRepo.findOne({ where: { id } });
    // Not a 403: these routes manage staff, and a customer id is simply not a
    // staff member. Saying so plainly avoids the staff directory doubling as a
    // way to edit ordinary users.
    if (!user || !(STAFF_ROLES as readonly string[]).includes(String(user.role).toUpperCase())) {
      throw new NotFoundException('Staff member not found');
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
    if (dto.regionLocked === true && !nextMarket) {
      throw new BadRequestException('A locked account needs a market');
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
    await this.kafka.publish('admin.staff.updated', {
      userId: id,
      actorId: this.actorId(req),
      changes: Object.keys(dto),
    });
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
