import { Injectable, NestMiddleware } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { AccessTokenPayload } from '../../auth/auth.types';

export type TenantContext = {
  tenantId?: string;
  storeId?: string;
  userId?: string;
  role?: string;
};

type TenantRequest = {
  user?: AccessTokenPayload;
  headers?: Record<string, string | string[] | undefined>;
};

type Next = (error?: unknown) => void;

export const tenantStorage = new AsyncLocalStorage<TenantContext>();

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: TenantRequest, _res: unknown, next: Next) {
    const user = req.user;
    const storeId = req.headers?.['x-store-id'];
    const normalizedStoreId = Array.isArray(storeId)
      ? storeId[0]
      : typeof storeId === 'string'
        ? storeId
        : undefined;

    tenantStorage.run(
      user
        ? {
            tenantId: user.tenantId,
            userId: user.sub,
            role: user.role,
            storeId: normalizedStoreId,
          }
        : { storeId: normalizedStoreId },
      () => next(),
    );
  }
}
