import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { AccessTokenPayload } from '../../auth/auth.types';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { CatalogService } from './catalog.service';
import { PricingService } from './pricing.service';
import { CreateProductDto } from './dto/create-product.dto';
import { MarginFromPriceDto, PriceFromMarkupDto } from './dto/pricing-preview.dto';
import { PsychologicalPriceDto } from './dto/psychological-price.dto';

@Controller('catalog/products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CatalogController {
  constructor(private readonly catalog: CatalogService, private readonly pricing: PricingService) {}

  @Post()
  @Roles('OWNER', 'MANAGER', 'OPERATOR')
  create(@CurrentUser() user: AccessTokenPayload, @Headers('x-store-id') storeId: string, @Body() dto: CreateProductDto) {
    return this.catalog.create(user.tenantId, storeId, user.sub, dto);
  }

  @Post('pricing/from-markup')
  @Roles('OWNER', 'MANAGER', 'OPERATOR')
  priceFromMarkup(@Body() dto: PriceFromMarkupDto) {
    return this.pricing.calculate(dto.costPrice, dto.markupPercent);
  }

  @Post('pricing/psychological-suggestion')
  psychologicalSuggestion(@Body() dto: PsychologicalPriceDto) {
    return this.pricing.psychologicalSuggestion(dto.costPrice, dto.minimumMarginPercent, dto.ending);
  }

  @Post('pricing/from-sale-price')
  @Roles('OWNER', 'MANAGER', 'OPERATOR')
  marginFromSalePrice(@Body() dto: MarginFromPriceDto) {
    return this.pricing.reverse(dto.costPrice, dto.salePrice);
  }

  @Get()
  list(@CurrentUser() user: AccessTokenPayload, @Headers('x-store-id') storeId: string, @Query('q') q?: string) {
    return this.catalog.list(user.tenantId, storeId, q?.trim());
  }

  @Get(':id')
  get(@CurrentUser() user: AccessTokenPayload, @Headers('x-store-id') storeId: string, @Param('id') id: string) {
    return this.catalog.get(user.tenantId, storeId, id);
  }
}
