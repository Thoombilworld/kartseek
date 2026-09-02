import { Injectable, type NestInterceptor, type ExecutionContext, type CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PciSecurityService } from './pci-security.service';

/**
 * PciComplianceInterceptor — Global interceptor to prevent CHD/SAD exposure.
 *
 * Automatically:
 *  - Sanitizes and redacts incoming request payloads (preventing storing plain CVVs or PANs in memory/db).
 *  - Sanitizes and masks outgoing response payloads (preventing leaking plain credit cards to clients or logs).
 */
@Injectable()
export class PciComplianceInterceptor implements NestInterceptor {
  constructor(private readonly pciService: PciSecurityService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const request = http.getRequest();

    // 1. Sanitize incoming request body
    if (request.body) {
      request.body = this.pciService.redactSensitiveData(request.body);
    }

    // 2. Sanitize outgoing response data
    return next.handle().pipe(
      map((data) => {
        return this.pciService.redactSensitiveData(data);
      }),
    );
  }
}
