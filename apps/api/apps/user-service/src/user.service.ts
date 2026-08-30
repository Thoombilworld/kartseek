import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { RedisService } from '@app/redis';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    private readonly redis: RedisService,
  ) {}

  async findById(id: string): Promise<User> {
    const cached = await this.redis.getJson<User>(`user:${id}`);
    if (cached) return cached;
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    await this.redis.setJson(`user:${id}`, user, 300); // 5min cache
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  async create(dto: { email: string; password: string; firstName: string; lastName: string; country?: string }): Promise<User> {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.repo.create({ ...dto, passwordHash });
    return this.repo.save(user);
  }

  async updateProfile(id: string, dto: Partial<Pick<User, 'firstName' | 'lastName' | 'phone' | 'avatarUrl'>>): Promise<User> {
    await this.repo.update(id, dto);
    await this.redis.del(`user:${id}`);
    return this.findById(id);
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.repo.update(id, { status });
    await this.redis.del(`user:${id}`);
  }

  async setRefreshToken(id: string, token: string): Promise<void> {
    const hash = await bcrypt.hash(token, 10);
    await this.repo.update(id, { refreshToken: hash });
  }

  /**
   * An account with no password never verifies.
   *
   * Phone-first accounts carry a null `passwordHash` until their owner sets one.
   * `bcrypt.compare` throws on a null hash rather than returning false, so
   * without this the caller gets a 500 that both leaks the account state and
   * looks like an outage.
   */
  async verifyPassword(user: User, plain: string): Promise<boolean> {
    if (!user?.passwordHash) return false;
    return bcrypt.compare(plain, user.passwordHash);
  }

  async findAll(page = 1, limit = 20, country?: string) {
    const qb = this.repo.createQueryBuilder('u').select(['u.id', 'u.email', 'u.firstName', 'u.lastName', 'u.role', 'u.status', 'u.country', 'u.createdAt']);
    if (country) qb.where('u.country = :country', { country });
    qb.skip((page - 1) * limit).take(limit).orderBy('u.createdAt', 'DESC');
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
