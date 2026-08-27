import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, Prisma, ReservationStatus, StockMovementType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../core/database/prisma.service';
import { CashPaymentDto, CreatePaymentDto, PaymentMethodDto, RefundPaymentDto } from './dto/create-payment.dto';
import { MercadoPagoProvider } from './providers/mercado-pago.provider';

type DbPayment = {
  id: string; tenantId: string; storeId: string; orderId: string; amount: Prisma.Decimal; currency: string; status: string; method: string; provider: string; providerReference: string | null; externalReference: string; idempotencyKey: string; paymentUrl: string | null; pixCopyPaste: string | null; pixQrCodeBase64: string | null; cashReceived: Prisma.Decimal | null; changeAmount: Prisma.Decimal | null; expiresAt: Date | null; paidAt: Date | null; cancelledAt: Date | null; refundedAmount: Prisma.Decimal; createdAt: Date; updatedAt: Date;
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mercadoPago: MercadoPagoProvider,
    private readonly config: ConfigService,
  ) {}

  async create(tenantId: string, storeId: string, orderId: string, actorId: string, dto: CreatePaymentDto) {
    if (dto.method === PaymentMethodDto.CASH) throw new BadRequestException('Use o fluxo específico de pagamento em dinheiro.');
    const order = await this.prisma.order.findFirst({ where: { id: orderId, tenantId, storeId }, include: { items: true } });
    if (!order) throw new NotFoundException('Pedido não encontrado.');
    if (order.status !== OrderStatus.PENDING_PAYMENT) throw new BadRequestException('Pedido não está aguardando pagamento.');
    if (order.expiresAt && order.expiresAt <= new Date()) throw new BadRequestException('Pedido expirou.');
    if (dto.method === PaymentMethodDto.PIX && !dto.payerEmail) throw new BadRequestException('E-mail do pagador é obrigatório para gerar cobrança PIX.');

    const existing = await this.findByIdempotency(tenantId, storeId, dto.idempotencyKey);
    if (existing) return this.serialize(existing);

    const intentId = randomUUID();
    const externalReference = `CHAMA-${intentId}`;
    const provider = 'MERCADO_PAGO';
    const method = dto.method;
    const expiresAt = order.expiresAt ?? new Date(Date.now() + 15 * 60 * 1000);

    try {
      const intent = await this.prisma.$transaction(async (tx) => {
        const duplicate = await tx.$queryRaw<DbPayment[]>`SELECT * FROM "PaymentIntent" WHERE "tenantId" = ${tenantId}::uuid AND "storeId" = ${storeId}::uuid AND "idempotencyKey" = ${dto.idempotencyKey} LIMIT 1`;
        if (duplicate[0]) return duplicate[0];
        const rows = await tx.$queryRaw<DbPayment[]>`INSERT INTO "PaymentIntent" ("id","tenantId","storeId","orderId","amount","currency","status","method","provider","externalReference","idempotencyKey","expiresAt","createdAt","updatedAt") VALUES (${intentId}::uuid,${tenantId}::uuid,${storeId}::uuid,${orderId}::uuid,${order.totalAmount},'BRL','PENDING',${method}::"PaymentMethod",${provider}::"PaymentProvider",${externalReference},${dto.idempotencyKey},${expiresAt},NOW(),NOW()) RETURNING *`;
        await tx.auditLog.create({ data: { tenantId, actorId, action: 'CREATE', entityType: 'PaymentIntent', entityId: intentId, after: { orderId, method, amount: order.totalAmount.toString(), status: 'PENDING' } } });
        return rows[0];
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      if (intent.providerReference) return this.serialize(intent);
      const notificationUrl = this.notificationUrl();
      const providerResult = await this.mercadoPago.createPayment({ paymentIntentId: intent.id, externalReference, idempotencyKey: dto.idempotencyKey, amount: order.totalAmount.toString(), currency: 'BRL', method: method as PaymentMethodDto, description: `Pedido CHAMA ${order.id}`, notificationUrl, payerEmail: dto.payerEmail, expiresAt });
      const status = this.mapProviderStatus(providerResult.status);
      const updated = await this.prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<DbPayment[]>`UPDATE "PaymentIntent" SET "providerReference"=${providerResult.providerReference},"status"=${status}::"PaymentStatus","paymentUrl"=${providerResult.paymentUrl ?? null},"pixCopyPaste"=${providerResult.pixCopyPaste ?? null},"pixQrCodeBase64"=${providerResult.pixQrCodeBase64 ?? null},"updatedAt"=NOW() WHERE "id"=${intent.id}::uuid RETURNING *`;
        await tx.$executeRaw`INSERT INTO "PaymentAttempt" ("id","paymentIntentId","provider","providerReference","status","amount","createdAt","updatedAt") VALUES (gen_random_uuid(),${intent.id}::uuid,'MERCADO_PAGO'::"PaymentProvider",${providerResult.providerReference},${status}::"PaymentStatus",${order.totalAmount},NOW(),NOW())`;
        return rows[0];
      });
      return this.serialize(updated);
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) throw error;
      await this.prisma.$executeRaw`UPDATE "PaymentIntent" SET "status"='REJECTED'::"PaymentStatus","updatedAt"=NOW() WHERE "tenantId"=${tenantId}::uuid AND "storeId"=${storeId}::uuid AND "idempotencyKey"=${dto.idempotencyKey} AND "providerReference" IS NULL`;
      throw error instanceof ServiceUnavailableException ? error : new ServiceUnavailableException('Não foi possível iniciar o pagamento agora.');
    }
  }

  async registerCashPayment(tenantId: string, storeId: string, orderId: string, actorId: string, dto: CashPaymentDto) {
    const received = new Prisma.Decimal(dto.receivedAmount);
    if (!received.isFinite() || received.lte(0)) throw new BadRequestException('Valor recebido inválido.');
    return this.prisma.$transaction(async (tx) => {
      const duplicate = await tx.$queryRaw<DbPayment[]>`SELECT * FROM "PaymentIntent" WHERE "tenantId"=${tenantId}::uuid AND "storeId"=${storeId}::uuid AND "idempotencyKey"=${dto.idempotencyKey} LIMIT 1 FOR UPDATE`;
      if (duplicate[0]) return this.serialize(duplicate[0]);
      const order = await tx.order.findFirst({ where: { id: orderId, tenantId, storeId }, include: { items: true } });
      if (!order) throw new NotFoundException('Pedido não encontrado.');
      if (order.status !== OrderStatus.PENDING_PAYMENT) throw new BadRequestException('Pedido não está aguardando pagamento.');
      if (received.lt(order.totalAmount)) throw new BadRequestException('Valor recebido é menor que o total do pedido.');
      const change = received.minus(order.totalAmount);
      const intentId = randomUUID();
      const rows = await tx.$queryRaw<DbPayment[]>`INSERT INTO "PaymentIntent" ("id","tenantId","storeId","orderId","amount","currency","status","method","provider","externalReference","idempotencyKey","cashReceived","changeAmount","paidAt","createdAt","updatedAt") VALUES (${intentId}::uuid,${tenantId}::uuid,${storeId}::uuid,${orderId}::uuid,${order.totalAmount},'BRL','APPROVED'::"PaymentStatus",'CASH'::"PaymentMethod",'MANUAL'::"PaymentProvider",${`CASH-${intentId}`},${dto.idempotencyKey},${received},${change},NOW(),NOW(),NOW()) RETURNING *`;
      await this.finalizeOrder(tx, tenantId, storeId, actorId, orderId, intentId);
      await tx.auditLog.create({ data: { tenantId, actorId, action: 'PAYMENT_EVENT', entityType: 'PaymentIntent', entityId: intentId, after: { status: 'APPROVED', method: 'CASH', amount: order.totalAmount.toString(), change: change.toString() } } });
      return this.serialize(rows[0]);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async get(tenantId: string, storeId: string, id: string) {
    const rows = await this.prisma.$queryRaw<DbPayment[]>`SELECT * FROM "PaymentIntent" WHERE "id"=${id}::uuid AND "tenantId"=${tenantId}::uuid AND "storeId"=${storeId}::uuid LIMIT 1`;
    if (!rows[0]) throw new NotFoundException('Pagamento não encontrado.');
    return this.serialize(rows[0]);
  }

  async listForOrder(tenantId: string, storeId: string, orderId: string) {
    const rows = await this.prisma.$queryRaw<DbPayment[]>`SELECT * FROM "PaymentIntent" WHERE "orderId"=${orderId}::uuid AND "tenantId"=${tenantId}::uuid AND "storeId"=${storeId}::uuid ORDER BY "createdAt" DESC`;
    return rows.map((row) => this.serialize(row));
  }

  async cancel(tenantId: string, storeId: string, id: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<DbPayment[]>`SELECT * FROM "PaymentIntent" WHERE "id"=${id}::uuid AND "tenantId"=${tenantId}::uuid AND "storeId"=${storeId}::uuid LIMIT 1 FOR UPDATE`;
      const payment = rows[0];
      if (!payment) throw new NotFoundException('Pagamento não encontrado.');
      if (!['CREATED','PENDING'].includes(payment.status)) throw new BadRequestException('Pagamento não pode mais ser cancelado.');
      if (payment.provider === 'MERCADO_PAGO' && payment.providerReference) await this.mercadoPago.cancelPayment(payment.providerReference);
      const updated = await tx.$queryRaw<DbPayment[]>`UPDATE "PaymentIntent" SET "status"='CANCELLED'::"PaymentStatus","cancelledAt"=NOW(),"updatedAt"=NOW() WHERE "id"=${id}::uuid RETURNING *`;
      await tx.auditLog.create({ data: { tenantId, actorId, action: 'STATUS_CHANGE', entityType: 'PaymentIntent', entityId: id, before: { status: payment.status }, after: { status: 'CANCELLED' } } });
      return this.serialize(updated[0]);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async refund(tenantId: string, storeId: string, id: string, actorId: string, dto: RefundPaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<DbPayment[]>`SELECT * FROM "PaymentIntent" WHERE "id"=${id}::uuid AND "tenantId"=${tenantId}::uuid AND "storeId"=${storeId}::uuid LIMIT 1 FOR UPDATE`;
      const payment = rows[0];
      if (!payment) throw new NotFoundException('Pagamento não encontrado.');
      if (!['APPROVED','PARTIALLY_REFUNDED'].includes(payment.status)) throw new BadRequestException('Pagamento não pode ser estornado neste estado.');
      const amount = dto.amount ? new Prisma.Decimal(dto.amount) : payment.amount.minus(payment.refundedAmount);
      if (!amount.isFinite() || amount.lte(0) || payment.refundedAmount.plus(amount).gt(payment.amount)) throw new BadRequestException('Valor de estorno inválido.');
      if (payment.provider === 'MERCADO_PAGO' && payment.providerReference) await this.mercadoPago.refundPayment(payment.providerReference, amount.toString());
      const refunded = payment.refundedAmount.plus(amount);
      const status = refunded.eq(payment.amount) ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
      const updated = await tx.$queryRaw<DbPayment[]>`UPDATE "PaymentIntent" SET "refundedAmount"=${refunded},"status"=${status}::"PaymentStatus","updatedAt"=NOW() WHERE "id"=${id}::uuid RETURNING *`;
      await tx.auditLog.create({ data: { tenantId, actorId, action: 'PAYMENT_EVENT', entityType: 'PaymentIntent', entityId: id, before: { refundedAmount: payment.refundedAmount.toString() }, after: { refundedAmount: refunded.toString(), status } } });
      return this.serialize(updated[0]);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async handleMercadoPagoWebhook(headers: { xSignature?: string; xRequestId?: string }, dataId: string | undefined, body: Record<string, unknown>) {
    const eventId = typeof body.id === 'string' || typeof body.id === 'number' ? String(body.id) : dataId;
    if (!eventId || !dataId) throw new BadRequestException('Webhook sem identificador de evento.');
    const valid = this.mercadoPago.verifyWebhook({ xSignature: headers.xSignature, xRequestId: headers.xRequestId, dataId });
    if (!valid) throw new BadRequestException('Assinatura de webhook inválida.');
    const inserted = await this.prisma.$queryRaw<{ id: string }[]>`INSERT INTO "PaymentWebhookEvent" ("id","provider","providerEventId","paymentReference","payload","signatureValid","createdAt") VALUES (gen_random_uuid(),'MERCADO_PAGO'::"PaymentProvider",${eventId},${dataId},${body}::jsonb,true,NOW()) ON CONFLICT ("provider","providerEventId") DO NOTHING RETURNING "id"`;
    if (!inserted[0]) return { duplicate: true };

    const snapshot = await this.mercadoPago.getPayment(dataId);
    if (!snapshot.externalReference) throw new BadRequestException('Pagamento externo sem referência CHAMA.');
    const paymentRows = await this.prisma.$queryRaw<DbPayment[]>`SELECT * FROM "PaymentIntent" WHERE "externalReference"=${snapshot.externalReference} LIMIT 1`;
    const payment = paymentRows[0];
    if (!payment) throw new NotFoundException('Pagamento CHAMA não encontrado.');
    if (snapshot.amount && !new Prisma.Decimal(snapshot.amount).equals(payment.amount)) throw new BadRequestException('Valor informado pelo provedor não confere com o pedido.');

    const status = this.mapProviderStatus(snapshot.status);
    if (status === 'APPROVED') await this.approveProviderPayment(payment.id, snapshot.providerReference, snapshot.status);
    else await this.prisma.$executeRaw`UPDATE "PaymentIntent" SET "status"=${status}::"PaymentStatus","providerReference"=${snapshot.providerReference},"updatedAt"=NOW() WHERE "id"=${payment.id}::uuid AND "status" NOT IN ('APPROVED'::"PaymentStatus",'REFUNDED'::"PaymentStatus")`;
    await this.prisma.$executeRaw`UPDATE "PaymentWebhookEvent" SET "processedAt"=NOW() WHERE "id"=${inserted[0].id}::uuid`;
    return { duplicate: false, status };
  }

  private async approveProviderPayment(paymentId: string, providerReference: string, providerStatus: string) {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<DbPayment[]>`SELECT * FROM "PaymentIntent" WHERE "id"=${paymentId}::uuid LIMIT 1 FOR UPDATE`;
      const payment = rows[0];
      if (!payment) throw new NotFoundException('Pagamento não encontrado.');
      if (payment.status === 'APPROVED') return this.serialize(payment);
      if (!['CREATED','PENDING'].includes(payment.status)) throw new ConflictException('Transição de pagamento inválida.');
      const order = await tx.order.findFirst({ where: { id: payment.orderId, tenantId: payment.tenantId, storeId: payment.storeId } });
      if (!order || order.status !== OrderStatus.PENDING_PAYMENT) throw new ConflictException('Pedido não está disponível para confirmação.');
      if (order.expiresAt && order.expiresAt <= new Date()) throw new BadRequestException('Pedido expirado.');
      if (!order.totalAmount.equals(payment.amount)) throw new BadRequestException('Valor do pagamento não confere com o pedido.');
      await this.finalizeOrder(tx, payment.tenantId, payment.storeId, '00000000-0000-0000-0000-000000000000', payment.orderId, payment.id);
      const updated = await tx.$queryRaw<DbPayment[]>`UPDATE "PaymentIntent" SET "status"='APPROVED'::"PaymentStatus","providerReference"=${providerReference},"paidAt"=NOW(),"updatedAt"=NOW() WHERE "id"=${payment.id}::uuid RETURNING *`;
      await tx.auditLog.create({ data: { tenantId: payment.tenantId, action: 'PAYMENT_EVENT', entityType: 'PaymentIntent', entityId: payment.id, before: { status: payment.status }, after: { status: 'APPROVED', providerStatus, providerReference } } });
      return this.serialize(updated[0]);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private async finalizeOrder(tx: Prisma.TransactionClient, tenantId: string, storeId: string, actorId: string, orderId: string, paymentId: string) {
    const order = await tx.order.findFirst({ where: { id: orderId, tenantId, storeId, status: OrderStatus.PENDING_PAYMENT }, include: { items: true } });
    if (!order) throw new NotFoundException('Pedido pendente de pagamento não encontrado.');
    if (order.expiresAt && order.expiresAt <= new Date()) throw new BadRequestException('Pedido expirou e não pode ser confirmado.');
    for (const item of order.items) {
      if (!item.reservationId) throw new BadRequestException('Pedido com item sem reserva de estoque.');
      const reservation = await tx.stockReservation.findFirst({ where: { id: item.reservationId, tenantId, storeId, status: ReservationStatus.ACTIVE } });
      if (!reservation) throw new BadRequestException('Reserva de estoque inválida para o pedido.');
      await tx.$queryRaw`SELECT "id" FROM "StockBalance" WHERE "storeId"=${storeId}::uuid AND "productId"=${item.productId}::uuid FOR UPDATE`;
      const balance = await tx.stockBalance.findUnique({ where: { storeId_productId: { storeId, productId: item.productId } } });
      if (!balance || balance.reservedQuantity.lt(item.quantity) || balance.physicalQuantity.lt(item.quantity)) throw new BadRequestException('Inconsistência de estoque detectada durante a confirmação.');
      const before = balance.physicalQuantity;
      const after = before.minus(item.quantity);
      let remaining = item.quantity;
      const lots = await tx.productLot.findMany({ where: { tenantId, storeId, productId: item.productId, status: 'ACTIVE', quantity: { gt: 0 }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, orderBy: [{ expiresAt: 'asc' }, { receivedAt: 'asc' }] });
      for (const lot of lots) {
        if (remaining.lte(0)) break;
        await tx.$queryRaw`SELECT "id" FROM "ProductLot" WHERE "id"=${lot.id}::uuid FOR UPDATE`;
        const lockedLot = await tx.productLot.findUnique({ where: { id: lot.id } });
        if (!lockedLot || lockedLot.status !== 'ACTIVE' || (lockedLot.expiresAt && lockedLot.expiresAt <= new Date())) continue;
        const available = lockedLot.quantity.minus(lockedLot.reservedQuantity);
        if (available.lte(0)) continue;
        const allocated = Prisma.Decimal.min(available, remaining);
        const nextQuantity = lockedLot.quantity.minus(allocated);
        await tx.productLot.update({ where: { id: lockedLot.id }, data: { quantity: nextQuantity, status: nextQuantity.eq(0) ? 'EXHAUSTED' : lockedLot.status } });
        await tx.orderItemLot.create({ data: { orderItemId: item.id, lotId: lockedLot.id, quantity: allocated } });
        await tx.stockMovement.create({ data: { tenantId, storeId, productId: item.productId, lotId: lockedLot.id, type: StockMovementType.SALE, quantity: allocated.negated(), quantityBefore: before, quantityAfter: after, reason: 'Pedido confirmado por pagamento e FEFO', reference: order.id, actorUserId: actorId } });
        remaining = remaining.minus(allocated);
      }
      if (lots.length > 0 && remaining.gt(0)) throw new BadRequestException('Não há lote FEFO válido suficiente; lotes vencidos não podem ser vendidos.');
      await tx.stockBalance.update({ where: { id: balance.id }, data: { physicalQuantity: after, reservedQuantity: balance.reservedQuantity.minus(item.quantity) } });
      await tx.stockReservation.update({ where: { id: reservation.id }, data: { status: ReservationStatus.CONFIRMED } });
      if (lots.length === 0) await tx.stockMovement.create({ data: { tenantId, storeId, productId: item.productId, type: StockMovementType.SALE, quantity: item.quantity.negated(), quantityBefore: before, quantityAfter: after, reason: 'Pedido confirmado por pagamento', reference: order.id, actorUserId: actorId } });
    }
    const confirmed = await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.CONFIRMED, confirmedAt: new Date(), expiresAt: null } });
    await tx.auditLog.create({ data: { tenantId, actorId: actorId === '00000000-0000-0000-0000-000000000000' ? null : actorId, action: 'STATUS_CHANGE', entityType: 'Order', entityId: order.id, before: { status: order.status }, after: { status: confirmed.status, paymentId } } });
    return confirmed;
  }

  private async findByIdempotency(tenantId: string, storeId: string, key: string) {
    const rows = await this.prisma.$queryRaw<DbPayment[]>`SELECT * FROM "PaymentIntent" WHERE "tenantId"=${tenantId}::uuid AND "storeId"=${storeId}::uuid AND "idempotencyKey"=${key} LIMIT 1`;
    return rows[0];
  }

  private notificationUrl() {
    const base = this.config.get<string>('PUBLIC_API_URL');
    return base ? `${base.replace(/\/$/, '')}/payments/webhooks/mercado-pago` : undefined;
  }

  private mapProviderStatus(status: string): string {
    const value = status.toLowerCase();
    if (['approved','authorized'].includes(value)) return 'APPROVED';
    if (['rejected','cancelled','failed'].includes(value)) return 'REJECTED';
    if (['refunded'].includes(value)) return 'REFUNDED';
    if (['expired'].includes(value)) return 'EXPIRED';
    return 'PENDING';
  }

  private serialize(payment: DbPayment) {
    return {
      id: payment.id, orderId: payment.orderId, amount: payment.amount.toString(), currency: payment.currency, status: payment.status, method: payment.method, provider: payment.provider, paymentUrl: payment.paymentUrl, pixCopyPaste: payment.pixCopyPaste, pixQrCodeBase64: payment.pixQrCodeBase64, changeAmount: payment.changeAmount?.toString() ?? null, expiresAt: payment.expiresAt, paidAt: payment.paidAt, refundedAmount: payment.refundedAmount.toString(), createdAt: payment.createdAt,
    };
  }
}
