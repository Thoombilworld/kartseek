import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RegionService } from './region.service';
import { REGION_HEADER } from './region.decorator';
import { SupportedCountryCode } from './region.types';
import { isActiveRegion, DEFAULT_REGION } from './region.config';

// Extend Express Request with region data
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      regionCode?: SupportedCountryCode;
      regionDetectedVia?: string;
    }
  }
}

/**
 * RegionMiddleware — Runs on every request to resolve the client's region.
 *
 * Resolution priority:
 * 1. Explicit `X-Region-Code` header (sent by mobile/web after detection)
 * 2. GPS coordinates in `X-Latitude` / `X-Longitude` headers
 * 3. Client IP address geolocation
 * 4. Default fallback region
 *
 * The resolved region code is attached to `req.regionCode` for downstream
 * controllers and guards to use.
 */
@Injectable()
export class RegionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RegionMiddleware.name);

  constructor(private readonly regionService: RegionService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    // 1. Explicit header.
    //
    // Gated on `isActiveRegion`, not `isSupportedRegion`: this header decides
    // which market a request transacts in, and the registry describes ten
    // countries the platform does not all trade in. Accepting any known code
    // let a client scope itself into a closed market by sending its header.
    const headerRegion = req.headers[REGION_HEADER] as string | undefined;
    if (headerRegion && isActiveRegion(headerRegion.toUpperCase())) {
      req.regionCode = headerRegion.toUpperCase() as SupportedCountryCode;
      req.regionDetectedVia = 'header';
      return next();
    }

    // 2. GPS coordinates
    const lat = parseFloat(req.headers['x-latitude'] as string);
    const lng = parseFloat(req.headers['x-longitude'] as string);
    if (!isNaN(lat) && !isNaN(lng)) {
      const result = await this.regionService.detectRegionFromCoords(lat, lng);
      req.regionCode = result.countryCode;
      req.regionDetectedVia = result.detectedVia;
      return next();
    }

    // 3. IP geolocation
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket?.remoteAddress
      || '127.0.0.1';

    const result = await this.regionService.detectRegionFromIp(clientIp);
    req.regionCode = result.countryCode;
    req.regionDetectedVia = result.detectedVia;

    next();
  }
}
