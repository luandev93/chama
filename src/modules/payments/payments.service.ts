import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async registerCashPayment(tenantId: string, storeId: string, orderId: string, amount: string, actorId: string) {
    const value = new Prisma.Decimal(amount);
    if (value.lte(0)) throw new BadRequestException('Valor de pagamento inválido.');
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id: orderId, tenantId, storeId } });
      if (!order) throw new NotFoundException('Pedido não encontrado.');
      if (order.status !== 'PENDING_PAYMENT') throw new BadRequestException('Pedido não está aguardando pagamento.');
      if (!value.equals(order.totalAmount)) throw new BadRequestException('Pagamento deve corresponder ao total do pedido.');
      return tx.order.update({ where: { id: order.id }, data: { status: 'CONFIRMED', confirmedAt: new Date() } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
