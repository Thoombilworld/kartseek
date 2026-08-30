import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';

@Controller()
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly jwtService: JwtService) {}

  @GrpcMethod('AuthService', 'ValidateToken')
  validateToken(data: { token: string }) {
    this.logger.log(`Received token validation request`);
    try {
      const decoded = this.jwtService.verify(data.token);
      return {
        isValid: true,
        userId: decoded.sub,
        role: decoded.role || 'CUSTOMER'
      };
    } catch (e) {
      return { isValid: false, userId: '', role: '' };
    }
  }
}
