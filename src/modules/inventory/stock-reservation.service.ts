import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateStockReservationDto } from './dto/create-stock-reservation.dto';

@Injectable()
export class StockReservationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, storeId: string, actorId: string, dto: CreateStockReservationDto) {
    const quantity = new Prisma.Decimal(dto.quantity);
    if (!quantity.isFinite() || quantity.lte(0)) throw new BadRequestException('A quantidade reservada deve ser maior que zero.');
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : new Date(Date.now() + 15 * 60 * 1000);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) throw new BadRequestException('A reserva precisa expirar em uma data futura.');

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({ where: { id: dto.productId, tenantId, active: true, stores: { some: { storeId } } }, select: { id: true } });
      if (!product) throw new NotFoundException('Produto não encontrado para esta loja.');

      await tx.$queryRaw`SELECT "id" FROM "StockBalance" WHERE "storeId" = ${storeId}::uuid AND "productId" = ${dto.productId}::uuid FOR UPDATE`;
      const balance = await tx.stockBalance.findUnique({ where: { storeId_productId: { storeId, productId: dto.productId } } });
      if (!balance) throw new NotFoundException('Saldo do produto não encontrado.');
      const available = balance.physicalQuantity.minus(balance.reservedQuantity);
      if (available.lt(quantity)) throw new BadRequestException('Estoque disponível insuficiente para reservar esta quantidade.');

      const reservation = await tx.stockReservation.create({ data: { tenantId, storeId, productId: dto.productId, quantity, reference: dto.reference?.trim(), expiresAt, createdBy: actorId } });
      await tx.stockBalance.update({ where: { id: balance.id }, data: { reservedQuantity: balance.reservedQuantity.plus(quantity) } });
      await tx.auditLog.create({ data: { tenantId, actorId, action: 'STOCK_MOVEMENT', entityType: 'StockReservation', entityId: reservation.id, after: { productId: dto.productId, quantity: quantity.toString(), expiresAt: expiresAt.toISOString(), reference: dto.reference?.trim() ?? null } } });
      return reservation;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async release(tenantId: string, storeId: string, actorId: string, reservationId: string, status: ReservationStatus = ReservationStatus.RELEASED) {
    if (![ReservationStatus.RELEASED, ReservationStatus.CANCELLED, ReservationStatus.EXPIRED].includes(status)) throw new BadRequestException('Status de liberação inválido.');
    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.stockReservation.findFirst({ where: { id: reservationId, tenantId, storeId, status: ReservationStatus.ACTIVE } });
      if (!reservation) throw new NotFoundException('Reserva ativa não encontrada.');
      await tx.$queryRaw`SELECT "id" FROM "StockBalance" WHERE "storeId" = ${storeId}::uuid AND "productId" = ${reservation.productId}::uuid FOR UPDATE`;
      const balance = await tx.stockBalance.findUnique({ where: { storeId_productId: { storeId, productId: reservation.productId } } });
      if (!balance) throw new NotFoundException('Saldo do produto não encontrado.');
      if (balance.reservedQuantity.lt(reservation.quantity)) throw new BadRequestException('Inconsistência de saldo reservado detectada.');

      const updated = await tx.stockReservation.update({ where: { id: reservation.id }, data: { status, releasedAt: new Date() } });
      await tx.stockBalance.update({ where: { id: balance.id }, data: { reservedQuantity: balance.reservedQuantity.minus(reservation.quantity) } });
      await tx.auditLog.create({ data: { tenantId, actorId, action: 'STOCK_MOVEMENT', entityType: 'StockReservation', entityId: reservation.id, before: { status: reservation.status }, after: { status, releasedQuantity: reservation.quantity.toString() } } });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
