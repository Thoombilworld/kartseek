import { Controller, Get, Post, Body, Query, Param, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { LocationService } from './location.service';
import { EmptyMessage, RpcAwareExceptionsFilter } from '@app/common';

@UseFilters(RpcAwareExceptionsFilter)
@Controller('location')
export class LocationController {
  constructor(private readonly svc: LocationService) {}

  @Get('health') health() { return this.svc.healthCheck(); }
  
  // ── Geographical Hierarchy Endpoints ────────────────────────────────────────
  @Get('regions')
  getRegions() { return this.svc.getRegions(); }

  @Get('regions/:regionId/states')
  getStates(@Param('regionId') regionId: string) { return this.svc.getStates(regionId); }

  @Get('states/:stateId/districts')
  getDistricts(@Param('stateId') stateId: string) { return this.svc.getDistricts(stateId); }

  @Get('districts/:districtId/cities')
  getCities(@Param('districtId') districtId: string) { return this.svc.getCities(districtId); }

  @Get('cities/:cityId/pincodes')
  getPincodes(@Param('cityId') cityId: string) { return this.svc.getPincodes(cityId); }
  // ────────────────────────────────────────────────────────────────────────

  @Get('detect')
  detectContext(@Query('lat') lat: string, @Query('lng') lng: string) {
    return this.svc.detectLocationContext(+lat, +lng);
  }

  @Post('driver/update') updateDriver(@Body() dto: { driverId: string; lat: number; lng: number; heading: number; speed: number; serviceType?: 'taxi' | 'delivery' }) { return this.svc.updateDriverLocation(dto.driverId, dto.lat, dto.lng, dto.heading, dto.speed, dto.serviceType); }
  @Get('drivers/nearby') getNearby(@Query('lat') lat: string, @Query('lng') lng: string, @Query('radius') r = 5, @Query('serviceType') st: 'taxi' | 'delivery' = 'taxi') { return this.svc.getNearbyDrivers(+lat, +lng, +r, st); }
  @Get('geocode') geocode(@Query('address') address: string) { return this.svc.geocode(address); }
  @Get('reverse-geocode') reverseGeocode(@Query('lat') lat: string, @Query('lng') lng: string) { return this.svc.reverseGeocode(+lat, +lng); }
  @Get('route') getRoute(@Query('oLat') oLat: string, @Query('oLng') oLng: string, @Query('dLat') dLat: string, @Query('dLng') dLng: string) { return this.svc.getRoute(+oLat, +oLng, +dLat, +dLng); }

  @MessagePattern({ cmd: 'detect_location_context' }) msgDetect(@Payload() d: EmptyMessage) { return this.svc.detectLocationContext(d.lat, d.lng); }
  @MessagePattern({ cmd: 'update_driver_location' }) msgUpdate(@Payload() d: EmptyMessage) { return this.svc.updateDriverLocation(d.driverId, d.lat, d.lng, d.heading, d.speed, d.serviceType); }
  @MessagePattern({ cmd: 'get_nearby_drivers' }) msgNearby(@Payload() d: EmptyMessage) { return this.svc.getNearbyDrivers(d.lat, d.lng, d.radiusKm, d.serviceType); }
}
