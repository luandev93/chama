import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AccessTokenPayload } from '../../auth/auth.types';

@Injectable()
export class StoreAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ user?: AccessTokenPayload; headers: Record<string, string | undefined> }>();
    if (!req.user) return true;
    const storeId = req.headers['x-store-id'];
    if (!storeId) return true;
    const store = await this.prisma.store.findFirst({ where: { id: storeId, tenantId: req.user.tenantId, active: true }, select: { id: true } });
    if (!store) throw new ForbiddenException('A loja informada não pertence ao seu tenant ou está indisponível.');
    return true;
  }
}
