import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
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
    email: string; password: string; role: UserRole;
    firstName: string; lastName: string; sellerType?: SellerType;
  }> = [
    { email: 'testcustomer@kartseek.com', password: 'TestPass123!', role: UserRole.CUSTOMER, firstName: 'Test', lastName: 'Customer' },
    { email: 'seller@kartseek.com', password: 'SellerPass123!', role: UserRole.SELLER, firstName: 'Test', lastName: 'Seller', sellerType: 'marketplace' },
    { email: 'admin@kartseek.com', password: 'AdminPass123!', role: UserRole.ADMIN, firstName: 'Test', lastName: 'Admin' },
  ];

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly lockout: AccountLockoutService,
  ) {}

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
          if (existing.role !== testUser.role) { existing.role = testUser.role; fixes.push(`role → ${testUser.role}`); }
          if (testUser.sellerType && existing.sellerType !== testUser.sellerType) {
            existing.sellerType = testUser.sellerType;
            fixes.push(`sellerType → ${testUser.sellerType}`);
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
          isActive: true,
        });
        await this.userRepo.save(user);
        this.logger.log(`Seeded test user: ${testUser.email} (${testUser.role})`);
      } catch (err: any) {
        this.logger.warn(`Could not seed ${testUser.email}: ${err?.message || err}`);
      }
    }
  }
}
