import { Body, Controller, Get, Headers, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AccessTokenPayload } from '../../auth/auth.types';
import { CurrentUser } from '../../auth/current-user.decorator';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';

@Controller('brands')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  @Post()
  @Roles('OWNER', 'MANAGER')
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateBrandDto) {
    return this.brands.create(user.tenantId, user.sub, dto);
  }

  @Get()
  list(@CurrentUser() user: AccessTokenPayload, @Headers('x-store-id') storeId: string) {
    return this.brands.list(user.tenantId, storeId);
  }
}
