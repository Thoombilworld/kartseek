import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
}

/**
 * TransformInterceptor — wraps every successful response in a standard envelope.
 *
 * Input:  { orderId: '123', status: 'PENDING' }
 * Output: { success: true, data: { orderId: '123', status: 'PENDING' }, timestamp: '...' }
 *
 * If the handler already returns an envelope with `success` field, it is passed through
 * unchanged to avoid double-wrapping.
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // Pass through already-enveloped responses
        if (data && typeof data === 'object' && 'success' in (data as object)) {
          return data as unknown as ApiResponse<T>;
        }

        return {
          success: true as const,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
