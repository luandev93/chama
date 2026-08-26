import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { TenantContextMiddleware } from './tenant-context.middleware';

@Module({})
export class TenancyModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).exclude(
      { path: 'api/health', method: RequestMethod.GET },
      { path: 'api/auth/(.*)', method: RequestMethod.ALL },
    ).forRoutes('*');
  }
}
