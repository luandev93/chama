import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LotTrackingPolicy, Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { CreateProductLotDto } from './dto/create-product-lot.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async createLot(tenantId: string, storeId: string, actorUserId: string, dto: CreateProductLotDto) {
    const quantity = new Prisma.Decimal(dto.quantity);
    if (!quantity.isFinite() || quantity.lte(0)) throw new BadRequestException('A quantidade do lote deve ser maior que zero.');
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) throw new BadRequestException('Validade inválida.');

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({ where: { id: dto.productId, tenantId, active: true, stores: { some: { storeId } } }, select: { id: true, lotTrackingPolicy: true, stores: { where: { storeId }, select: { lotTrackingPolicy: true } }, section: { select: { lotTrackingPolicy: true, category: { select: { lotTrackingPolicy: true } } } } } });
      if (!product) throw new NotFoundException('Produto não encontrado para esta loja.');
      const policy = product.stores[0]?.lotTrackingPolicy ?? product.lotTrackingPolicy ?? product.section?.lotTrackingPolicy ?? product.section?.category.lotTrackingPolicy ?? LotTrackingPolicy.OPTIONAL;
      if (policy === LotTrackingPolicy.NONE) throw new BadRequestException('Este produto não está configurado para controlar lotes.');
      if (policy === LotTrackingPolicy.REQUIRED && !expiresAt) throw new BadRequestException('A validade é obrigatória para este produto.');
      await tx.$queryRaw`SELECT "id" FROM "StockBalance" WHERE "storeId" = ${storeId}::uuid AND "productId" = ${dto.productId}::uuid FOR UPDATE`;
      const balance = await tx.stockBalance.findUnique({ where: { storeId_productId: { storeId, productId: dto.productId } } });
      if (!balance) throw new NotFoundException('Saldo do produto não encontrado.');
      const before = balance.physicalQuantity;
      const after = before.plus(quantity);
      const lot = await tx.productLot.upsert({
        where: { storeId_productId_code: { storeId, productId: dto.productId, code: dto.code.trim() } },
        update: { quantity: { increment: quantity }, expiresAt, costPrice: dto.costPrice ? new Prisma.Decimal(dto.costPrice) : undefined, status: 'ACTIVE' },
        create: { tenantId, storeId, productId: dto.productId, code: dto.code.trim(), expiresAt, quantity, costPrice: dto.costPrice ? new Prisma.Decimal(dto.costPrice) : undefined },
      });
      await tx.stockBalance.update({ where: { id: balance.id }, data: { physicalQuantity: after } });
      await tx.stockMovement.create({ data: { tenantId, storeId, productId: dto.productId, lotId: lot.id, type: StockMovementType.PURCHASE, quantity, quantityBefore: before, quantityAfter: after, reason: 'Entrada de lote', reference: lot.code, actorUserId } });
      return lot;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async listLots(tenantId: string, storeId: string, productId: string) {
    return this.prisma.productLot.findMany({ where: { tenantId, storeId, productId }, orderBy: [{ expiresAt: 'asc' }, { receivedAt: 'asc' }] });
  }

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

  async alerts(tenantId: string, storeId: string) {
    const products = await this.prisma.product.findMany({
      where: { tenantId, active: true, stores: { some: { storeId } } },
      include: { stores: { where: { storeId } }, balances: { where: { storeId } }, section: { include: { category: true } } },
    });
    return products.map((product) => {
      const balance = product.balances[0];
      const store = product.stores[0];
      const availableQuantity = balance ? balance.physicalQuantity.minus(balance.reservedQuantity) : new Prisma.Decimal(0);
      const minimumQty = store?.minimumQty ?? product.section?.minimumQty ?? product.section?.category.minimumQty ?? null;
      const maximumQty = store?.maximumQty ?? product.section?.maximumQty ?? product.section?.category.maximumQty ?? null;
      const reorderPoint = store?.reorderPoint ?? product.section?.reorderPoint ?? product.section?.category.reorderPoint ?? minimumQty;
      const rupture = availableQuantity.lte(0);
      const belowMinimum = minimumQty ? availableQuantity.lt(minimumQty) : false;
      const shouldReorder = reorderPoint ? availableQuantity.lte(reorderPoint) : false;
      const suggestedPurchaseQty = maximumQty && availableQuantity.lt(maximumQty) ? maximumQty.minus(availableQuantity) : null;
      return { productId: product.id, productName: product.name, availableQuantity, minimumQty, maximumQty, reorderPoint, rupture, belowMinimum, shouldReorder, suggestedPurchaseQty };
    }).filter((alert) => alert.rupture || alert.belowMinimum || alert.shouldReorder);
  }

  async balance(tenantId: string, storeId: string, productId: string) {
    const balance = await this.prisma.stockBalance.findFirst({ where: { tenantId, storeId, productId } });
    if (!balance) throw new NotFoundException('Saldo não encontrado.');
    return { ...balance, availableQuantity: balance.physicalQuantity.minus(balance.reservedQuantity) };
  }
}
