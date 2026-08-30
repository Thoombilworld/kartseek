import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly svc: UserService) {}

  @Get()
  findAll(@Query('page') page = 1, @Query('limit') limit = 20, @Query('country') country?: string) {
    return this.svc.findAll(+page, +limit, country);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.svc.updateProfile(id, dto);
  }

  // ─── gRPC handlers (called by auth-service and api-gateway) ───────────────
  @GrpcMethod('UserService', 'FindById')
  grpcFindById({ id }: { id: string }) { return this.svc.findById(id); }

  @GrpcMethod('UserService', 'FindByEmail')
  grpcFindByEmail({ email }: { email: string }) { return this.svc.findByEmail(email); }
}
