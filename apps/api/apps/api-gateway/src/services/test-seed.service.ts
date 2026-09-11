import { Injectable, type OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { AdminRole } from '../entities/admin-role.entity';
import { UserRole, type SellerType } from '@app/common';
import { AccountLockoutService } from '@app/security';

/**
 * Seeds test accounts (seller, admin) on application startup so that
 * Newman/Postman test collections can authenticate with all required roles.
 * Also clears any lockout state left from previous test runs.
 * Only runs in development mode (NODE_ENV !== 'production').
 */
@Injectable()
export class TestSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TestSeedService.name);

  /**
   * `sellerType` decides which seller portal an account may open, and a NULL is
   * fail-closed: the login screen answers "This seller account is not assigned
   * to a portal yet." The seeded seller had no value, so it could authenticate
   * but never get past the portal gate.
   */
  private readonly testUsers: Array<{
    email: string;
    password: string;
    role: UserRole;
    firstName: string;
    lastName: string;
    sellerType?: SellerType;
    regionCode?: string;
    regionLocked?: boolean;
    /** `admin.admin_roles.key` — the permission set this staff account holds. */
    adminRoleKey?: string;
  }> = [
    {
      email: 'testcustomer@kartseek.com',
      password: 'TestPass123!',
      role: UserRole.CUSTOMER,
      firstName: 'Test',
      lastName: 'Customer',
    },
    {
      email: 'seller@kartseek.com',
      password: 'SellerPass123!',
      role: UserRole.SELLER,
      firstName: 'Test',
      lastName: 'Seller',
      sellerType: 'marketplace',
    },
    {
      email: 'admin@kartseek.com',
      password: 'AdminPass123!',
      role: UserRole.ADMIN,
      firstName: 'Test',
      lastName: 'Admin',
      adminRoleKey: 'admin',
    },
    // The console's roles and staff pages are SUPER_ADMIN-only, and until now
    // no seeded account held that role — so every probe of them ran as an
    // ADMIN and answered 403, which reads exactly like a broken route.
    {
      email: 'superadmin@kartseek.com',
      password: 'AdminPass123!',
      role: UserRole.SUPER_ADMIN,
      firstName: 'Super',
      lastName: 'Admin',
      adminRoleKey: 'super_admin',
    },
    // Regional admins: confined to one market by a signed claim, so the
    // cross-market authorisation tests have a real account to run as.
    {
      email: 'qa-admin@kartseek.com',
      password: 'AdminPass123!',
      role: UserRole.ADMIN,
      firstName: 'Qatar',
      lastName: 'Admin',
      regionCode: 'QA',
      regionLocked: true,
      adminRoleKey: 'regional_admin',
    },
    {
      email: 'india-admin@kartseek.com',
      password: 'AdminPass123!',
      role: UserRole.ADMIN,
      firstName: 'India',
      lastName: 'Admin',
      regionCode: 'IN',
      regionLocked: true,
      adminRoleKey: 'regional_admin',
    },
  ];

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(AdminRole) private readonly roleRepo: Repository<AdminRole>,
    private readonly lockout: AccountLockoutService,
  ) {}

  /** Resolved role ids, so six accounts do not make six identical queries. */
  private readonly roleIds = new Map<string, string | null>();
  /** Set once `admin.admin_roles` has been found missing — do not keep asking. */
  private adminRolesTableMissing = false;

  /**
   * The id of a seeded role, or null when it cannot be resolved.
   *
   * A missing `admin.admin_roles` means the AdminRoles migration has not been
   * applied to this database. That must not take the gateway down on boot — it
   * is a dev seed — but it must say so plainly, because the symptom otherwise
   * is a console whose roles page is simply empty.
   */
  private async adminRoleId(key: string): Promise<string | null> {
    if (this.adminRolesTableMissing) return null;
    if (this.roleIds.has(key)) return this.roleIds.get(key)!;
    try {
      const role = await this.roleRepo.findOne({ where: { key } });
      if (!role) {
        this.logger.warn(`No admin role '${key}' in admin.admin_roles — is the seed row missing?`);
      }
      this.roleIds.set(key, role?.id ?? null);
      return role?.id ?? null;
    } catch (err: any) {
      // 42P01 = undefined_table
      if (err?.code === '42P01' || /does not exist/i.test(err?.message ?? '')) {
        this.adminRolesTableMissing = true;
        this.logger.warn(
          'admin.admin_roles is missing — apply migration 1786501800000-AdminRoles ' +
            'or the console will show no roles and no staff will carry one.',
        );
      } else {
        this.logger.warn(`Could not read admin.admin_roles: ${err?.message || err}`);
      }
      return null;
    }
  }

  async onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'production') {
      return; // Never seed in production
    }

    for (const testUser of this.testUsers) {
      try {
        // Always clear lockout state for test users
        await this.lockout.adminUnlock(testUser.email);

        const existing = await this.userRepo.findOne({ where: { email: testUser.email } });
        if (existing) {
          // Ensure role matches (in case it was created via /register as CUSTOMER)
          // and that a seller carries its portal — an account seeded before
          // `seller_type` existed keeps a NULL forever otherwise, which reads to
          // the portal as "not assigned to a portal yet".
          const fixes: string[] = [];
          if (existing.role !== testUser.role) {
            existing.role = testUser.role;
            fixes.push(`role → ${testUser.role}`);
          }
          if (testUser.sellerType && existing.sellerType !== testUser.sellerType) {
            existing.sellerType = testUser.sellerType;
            fixes.push(`sellerType → ${testUser.sellerType}`);
          }
          const wantRegion = testUser.regionCode ?? null;
          const wantLocked = testUser.regionLocked === true;
          if (
            (existing.regionCode ?? null) !== wantRegion ||
            existing.regionLocked !== wantLocked
          ) {
            existing.regionCode = wantRegion;
            existing.regionLocked = wantLocked;
            fixes.push(`market scope → ${wantRegion ?? 'global'}${wantLocked ? ' (locked)' : ''}`);
          }
          if (testUser.adminRoleKey) {
            const roleId = await this.adminRoleId(testUser.adminRoleKey);
            if (roleId && existing.adminRoleId !== roleId) {
              existing.adminRoleId = roleId;
              fixes.push(`admin role → ${testUser.adminRoleKey}`);
            }
          }
          if (fixes.length) {
            await this.userRepo.save(existing);
            this.logger.log(`Updated ${testUser.email}: ${fixes.join(', ')}`);
          } else {
            this.logger.log(`Test user exists: ${testUser.email} (${testUser.role})`);
          }
          continue;
        }

        const passwordHash = await bcrypt.hash(testUser.password, 12);
        const user = this.userRepo.create({
          email: testUser.email,
          passwordHash,
          role: testUser.role,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          sellerType: testUser.sellerType ?? null,
          regionCode: testUser.regionCode ?? null,
          regionLocked: testUser.regionLocked === true,
          adminRoleId: testUser.adminRoleKey ? await this.adminRoleId(testUser.adminRoleKey) : null,
          isActive: true,
        });
        await this.userRepo.save(user);
        this.logger.log(
          `Seeded test user: ${testUser.email} (${testUser.role}` +
            `${testUser.adminRoleKey ? `, role ${testUser.adminRoleKey}` : ''})`,
        );
      } catch (err: any) {
        this.logger.warn(`Could not seed ${testUser.email}: ${err?.message || err}`);
      }
    }
  }
}
