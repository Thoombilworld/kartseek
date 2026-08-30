import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let controller: AuthController;
  let jwtService: jest.Mocked<JwtService>;

  const VALID_PAYLOAD = { sub: 'user-123', role: 'SELLER', iat: Date.now(), exp: Date.now() + 3600 };

  beforeEach(async () => {
    const jwtMock: Partial<jest.Mocked<JwtService>> = {
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: JwtService, useValue: jwtMock }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jwtService = module.get(JwtService);
  });

  describe('validateToken', () => {
    it('should return isValid=true with userId and role for a valid token', () => {
      jwtService.verify.mockReturnValue(VALID_PAYLOAD);

      const result = controller.validateToken({ token: 'valid.jwt.token' });

      expect(result).toEqual({
        isValid: true,
        userId: 'user-123',
        role: 'SELLER',
      });
      expect(jwtService.verify).toHaveBeenCalledWith('valid.jwt.token');
    });

    it('should default role to CUSTOMER when role is absent in payload', () => {
      jwtService.verify.mockReturnValue({ sub: 'user-456' });

      const result = controller.validateToken({ token: 'no-role.token' });

      expect(result.role).toBe('CUSTOMER');
      expect(result.userId).toBe('user-456');
    });

    it('should return isValid=false for an expired token', () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      const result = controller.validateToken({ token: 'expired.token' });

      expect(result).toEqual({ isValid: false, userId: '', role: '' });
    });

    it('should return isValid=false for a tampered/invalid token', () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      const result = controller.validateToken({ token: 'tampered.token' });

      expect(result).toEqual({ isValid: false, userId: '', role: '' });
    });

    it('should return isValid=false for an empty token string', () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      const result = controller.validateToken({ token: '' });

      expect(result.isValid).toBe(false);
    });
  });
});
