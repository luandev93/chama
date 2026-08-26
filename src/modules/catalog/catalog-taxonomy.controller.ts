import { Body, Controller, Get, Headers, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AccessTokenPayload } from '../../auth/auth.types';
import { CurrentUser } from '../../auth/current-user.decorator';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { CatalogTaxonomyService } from './catalog-taxonomy.service';
import { CreateCategoryDto, CreateSectionDto, UpsertSectionPricingPolicyDto } from './dto/catalog-taxonomy.dto';

@Controller('catalog')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CatalogTaxonomyController {
  constructor(private readonly taxonomy: CatalogTaxonomyService) {}

  @Post('categories')
  @Roles('OWNER', 'MANAGER')
  createCategory(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateCategoryDto) {
    return this.taxonomy.createCategory(user.tenantId, user.sub, dto);
  }

  @Post('sections')
  @Roles('OWNER', 'MANAGER')
  createSection(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateSectionDto) {
    return this.taxonomy.createSection(user.tenantId, user.sub, dto);
  }

  @Post('pricing-policies/section')
  @Roles('OWNER', 'MANAGER')
  upsertPricingPolicy(@CurrentUser() user: AccessTokenPayload, @Headers('x-store-id') storeId: string, @Body() dto: UpsertSectionPricingPolicyDto) {
    return this.taxonomy.upsertPricingPolicy(user.tenantId, storeId, user.sub, dto);
  }

  @Get('taxonomy')
  list(@CurrentUser() user: AccessTokenPayload, @Headers('x-store-id') storeId: string) {
    return this.taxonomy.list(user.tenantId, storeId);
  }
}
