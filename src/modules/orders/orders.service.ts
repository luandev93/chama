import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma, ReservationStatus, StockMovementType } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, storeId: string, actorId: string, dto: CreateOrderDto) {
    if (!dto.items?.length) throw new BadRequestException('O pedido precisa possuir ao menos um item.');
    const ids = dto.items.map((item) => item.productId);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('O mesmo produto não pode aparecer duas vezes no pedido.');
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : new Date(Date.now() + 15 * 60 * 1000);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) throw new BadRequestException('A expiração do pedido deve ser futura.');

    return this.prisma.$transaction(async (tx) => {
      const lines: { productId: string; productName: string; unit: string; quantity: Prisma.Decimal; unitPrice: Prisma.Decimal; lineTotal: Prisma.Decimal; reservationId: string }[] = [];
      let subtotal = new Prisma.Decimal(0);

      for (const item of dto.items) {
        const quantity = new Prisma.Decimal(item.quantity);
        if (!quantity.isFinite() || quantity.lte(0)) throw new BadRequestException('A quantidade de cada item deve ser maior que zero.');
        const product = await tx.product.findFirst({ where: { id: item.productId, tenantId, active: true, stores: { some: { storeId } } }, include: { stores: { where: { storeId }, select: { salePrice: true } } } });
        if (!product || !product.stores[0]?.salePrice) throw new NotFoundException('Produto indisponível ou sem preço de venda nesta loja.');
        await tx.$queryRaw`SELECT "id" FROM "StockBalance" WHERE "storeId" = ${storeId}::uuid AND "productId" = ${item.productId}::uuid FOR UPDATE`;
        const balance = await tx.stockBalance.findUnique({ where: { storeId_productId: { storeId, productId: item.productId } } });
        if (!balance) throw new NotFoundException('Saldo do produto não encontrado.');
        if (balance.physicalQuantity.minus(balance.reservedQuantity).lt(quantity)) throw new BadRequestException(`Estoque insuficiente para ${product.name}.`);
        const reservation = await tx.stockReservation.create({ data: { tenantId, storeId, productId: product.id, quantity, reference: 'ORDER_PENDING', expiresAt, createdBy: actorId } });
        await tx.stockBalance.update({ where: { id: balance.id }, data: { reservedQuantity: balance.reservedQuantity.plus(quantity) } });
        const unitPrice = product.stores[0].salePrice;
        const lineTotal = unitPrice.mul(quantity);
        subtotal = subtotal.plus(lineTotal);
        lines.push({ productId: product.id, productName: product.name, unit: product.unit, quantity, unitPrice, lineTotal, reservationId: reservation.id });
      }

      const order = await tx.order.create({ data: { tenantId, storeId, origin: dto.origin, type: dto.type ?? 'PICKUP', status: OrderStatus.PENDING_PAYMENT, customerName: dto.customerName?.trim(), customerPhone: dto.customerPhone?.trim(), notes: dto.notes?.trim(), subtotal, totalAmount: subtotal, expiresAt, createdBy: actorId, items: { create: lines } }, include: { items: true } });
      await tx.auditLog.create({ data: { tenantId, actorId, action: 'CREATE', entityType: 'Order', entityId: order.id, after: { status: order.status, origin: order.origin, type: order.type, subtotal: subtotal.toString(), total: subtotal.toString(), itemCount: lines.length } } });
      return order;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async get(tenantId: string, storeId: string, id: string) {
    const order = await this.prisma.order.findFirst({ where: { id, tenantId, storeId }, include: { items: true } });
    if (!order) throw new NotFoundException('Pedido não encontrado.');
    return order;
  }

  async confirm(tenantId: string, storeId: string, actorId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id, tenantId, storeId, status: OrderStatus.PENDING_PAYMENT }, include: { items: true } });
      if (!order) throw new NotFoundException('Pedido pendente de pagamento não encontrado.');
      if (order.expiresAt && order.expiresAt <= new Date()) throw new BadRequestException('O pedido expirou e não pode ser confirmado.');

      for (const item of order.items) {
        if (!item.reservationId) throw new BadRequestException('Pedido com item sem reserva de estoque.');
        const reservation = await tx.stockReservation.findFirst({ where: { id: item.reservationId, tenantId, storeId, status: ReservationStatus.ACTIVE } });
        if (!reservation) throw new BadRequestException('Reserva de estoque inválida para o pedido.');
        await tx.$queryRaw`SELECT "id" FROM "StockBalance" WHERE "storeId" = ${storeId}::uuid AND "productId" = ${item.productId}::uuid FOR UPDATE`;
        const balance = await tx.stockBalance.findUnique({ where: { storeId_productId: { storeId, productId: item.productId } } });
        if (!balance || balance.reservedQuantity.lt(item.quantity) || balance.physicalQuantity.lt(item.quantity)) throw new BadRequestException('Inconsistência de estoque detectada durante a confirmação.');
        const before = balance.physicalQuantity;
        const after = before.minus(item.quantity);
        await tx.stockBalance.update({ where: { id: balance.id }, data: { physicalQuantity: after, reservedQuantity: balance.reservedQuantity.minus(item.quantity) } });
        await tx.stockReservation.update({ where: { id: reservation.id }, data: { status: ReservationStatus.CONFIRMED } });
        await tx.stockMovement.create({ data: { tenantId, storeId, productId: item.productId, type: StockMovementType.SALE, quantity: item.quantity.negated(), quantityBefore: before, quantityAfter: after, reason: 'Pedido confirmado', reference: order.id, actorUserId: actorId } });
      }

      const confirmed = await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.CONFIRMED, confirmedAt: new Date(), expiresAt: null } });
      await tx.auditLog.create({ data: { tenantId, actorId, action: 'STATUS_CHANGE', entityType: 'Order', entityId: order.id, before: { status: order.status }, after: { status: confirmed.status } } });
      return confirmed;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async cancel(tenantId: string, storeId: string, actorId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id, tenantId, storeId, status: { in: [OrderStatus.DRAFT, OrderStatus.PENDING_PAYMENT, OrderStatus.CONFIRMED] } }, include: { items: true } });
      if (!order) throw new NotFoundException('Pedido cancelável não encontrado.');
      for (const item of order.items) {
        if (!item.reservationId) continue;
        const reservation = await tx.stockReservation.findFirst({ where: { id: item.reservationId, tenantId, storeId, status: ReservationStatus.ACTIVE } });
        if (!reservation) continue;
        await tx.$queryRaw`SELECT "id" FROM "StockBalance" WHERE "storeId" = ${storeId}::uuid AND "productId" = ${reservation.productId}::uuid FOR UPDATE`;
        const balance = await tx.stockBalance.findUnique({ where: { storeId_productId: { storeId, productId: reservation.productId } } });
        if (!balance || balance.reservedQuantity.lt(reservation.quantity)) throw new BadRequestException('Inconsistência de reserva detectada.');
        await tx.stockReservation.update({ where: { id: reservation.id }, data: { status: ReservationStatus.CANCELLED, releasedAt: new Date() } });
        await tx.stockBalance.update({ where: { id: balance.id }, data: { reservedQuantity: balance.reservedQuantity.minus(reservation.quantity) } });
      }
      const cancelled = await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.CANCELLED, cancelledAt: new Date() } });
      await tx.auditLog.create({ data: { tenantId, actorId, action: 'STATUS_CHANGE', entityType: 'Order', entityId: order.id, before: { status: order.status }, after: { status: cancelled.status } } });
      return cancelled;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
