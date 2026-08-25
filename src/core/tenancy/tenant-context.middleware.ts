import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { NextFunction, Request, Response } from 'express';

export type TenantContext = { tenantId: string; storeId?: string };
export const tenantStorage = new AsyncLocalStorage<TenantContext>();

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const tenantId = req.header('x-tenant-id');
    if (!tenantId) throw new UnauthorizedException('Missing tenant context');
    if (!/^[a-zA-Z0-9_-]{8,64}$/.test(tenantId)) throw new UnauthorizedException('Invalid tenant context');
    tenantStorage.run({ tenantId, storeId: req.header('x-store-id') || undefined }, next);
  }
}
