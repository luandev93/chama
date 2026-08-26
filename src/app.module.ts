import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import * as Joi from 'joi';
import { HealthController } from './core/health/health.controller';
import { PrismaModule } from './core/database/prisma.module';
import { TenancyModule } from './core/tenancy/tenancy.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        PORT: Joi.number().port().default(3000),
        DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
        CORS_ORIGINS: Joi.string().allow('').default(''),
        JWT_ACCESS_SECRET: Joi.string().min(32).required(),
        JWT_REFRESH_SECRET: Joi.string().min(32).required(),
        JWT_ISSUER: Joi.string().min(3).required(),
        JWT_AUDIENCE: Joi.string().min(3).required(),
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    TenancyModule,
    AuthModule,
    CatalogModule,
    InventoryModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
