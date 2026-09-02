import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogTaxonomyController } from './catalog-taxonomy.controller';
import { BrandsController } from './brands.controller';
import { CatalogService } from './catalog.service';
import { CatalogTaxonomyService } from './catalog-taxonomy.service';
import { BrandsService } from './brands.service';
import { PricingService } from './pricing.service';

@Module({
  controllers: [CatalogController, CatalogTaxonomyController, BrandsController],
  providers: [CatalogService, CatalogTaxonomyService, BrandsService, PricingService],
  exports: [PricingService],
})
export class CatalogModule {}
