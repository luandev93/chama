import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async move(tenantId: string, storeId: string, actorUserId: string, dto: CreateStockMovementDto) {
    const quantity = new Prisma.Decimal(dto.quantity);
    if (!quantity.isFinite() || quantity.lte(0)) throw new BadRequestException('A quantidade deve ser maior que zero.');
    const direction = ['PURCHASE', 'ADJUSTMENT_IN', 'RETURN'].includes(dto.type) ? 1 : -1;

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({ where: { id: dto.productId, tenantId, active: true, stores: { some: { storeId } } }, select: { id: true } });
      if (!product) throw new NotFoundException('Produto não encontrado para esta loja.');

      await tx.$queryRaw`SELECT "id" FROM "StockBalance" WHERE "storeId" = ${storeId}::uuid AND "productId" = ${dto.productId}::uuid FOR UPDATE`;
      const balance = await tx.stockBalance.findUnique({ where: { storeId_productId: { storeId, productId: dto.productId } } });
      if (!balance) throw new NotFoundException('Saldo do produto não encontrado.');

      const before = balance.physicalQuantity;
      const after = direction > 0 ? before.plus(quantity) : before.minus(quantity);
      if (after.lt(0)) throw new BadRequestException('Estoque insuficiente para esta saída.');
      if (after.lt(balance.reservedQuantity)) throw new BadRequestException('A operação violaria o estoque já reservado.');

      const movement = await tx.stockMovement.create({
        data: {
          tenantId, storeId, productId: dto.productId,
          type: dto.type as StockMovementType,
          quantity: direction > 0 ? quantity : quantity.negated(),
          quantityBefore: before,
          quantityAfter: after,
          reason: dto.reason?.trim(),
          reference: dto.reference?.trim(),
          actorUserId,
        },
      });
      await tx.stockBalance.update({ where: { id: balance.id }, data: { physicalQuantity: after } });
      await tx.auditLog.create({
        data: { tenantId, actorId: actorUserId, action: 'STOCK_MOVEMENT', entityType: 'StockMovement', entityId: movement.id, after: { productId: dto.productId, type: dto.type, quantity: quantity.toString(), before: before.toString(), after: after.toString() } },
      });
      return movement;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async balance(tenantId: string, storeId: string, productId: string) {
    const balance = await this.prisma.stockBalance.findFirst({ where: { tenantId, storeId, productId } });
    if (!balance) throw new NotFoundException('Saldo não encontrado.');
    return { ...balance, availableQuantity: balance.physicalQuantity.minus(balance.reservedQuantity) };
  }
}
