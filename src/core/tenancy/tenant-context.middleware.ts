import { Injectable, NestMiddleware } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';
import { AccessTokenPayload } from '../../auth/auth.types';

export type TenantContext = { tenantId?: string; storeId?: string; userId?: string; role?: string };
export const tenantStorage = new AsyncLocalStorage<TenantContext>();

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request & { user?: AccessTokenPayload }, _res: Response, next: NextFunction) {
    const user = req.user;
    const storeId = req.headers['x-store-id'];
    const normalizedStoreId = typeof storeId === 'string' ? storeId : undefined;
    tenantStorage.run(
      user ? { tenantId: user.tenantId, userId: user.sub, role: user.role, storeId: normalizedStoreId } : { storeId: normalizedStoreId },
      next,
    );
  }
}
