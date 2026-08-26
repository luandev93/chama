import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogTaxonomyController } from './catalog-taxonomy.controller';
import { CatalogService } from './catalog.service';
import { CatalogTaxonomyService } from './catalog-taxonomy.service';
import { PricingService } from './pricing.service';

@Module({
  controllers: [CatalogController, CatalogTaxonomyController],
  providers: [CatalogService, CatalogTaxonomyService, PricingService],
  exports: [PricingService],
})
export class CatalogModule {}
