import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TenantContextMiddleware } from './tenant-context.middleware';
import { StoreAccessGuard } from './store-access.guard';

@Module({
  providers: [{ provide: APP_GUARD, useClass: StoreAccessGuard }],
})
export class TenancyModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).exclude(
      { path: 'api/health', method: RequestMethod.GET },
      { path: 'api/auth/(.*)', method: RequestMethod.ALL },
    ).forRoutes('*');
  }
}
