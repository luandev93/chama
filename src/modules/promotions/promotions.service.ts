import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PromotionStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, storeId: string) {
    return this.prisma.promotion.findMany({
      where: { tenantId, storeId },
      include: { product: { select: { id: true, name: true, stores: { where: { storeId }, select: { salePrice: true } } } }, lot: { select: { id: true, code: true, expiresAt: true } } },
      orderBy: { startsAt: 'desc' },
    }).then(items => items.map(item => ({ ...item, productName: item.product.name, basePrice: item.product.stores[0]?.salePrice ?? null, promotionPrice: item.promotionalPrice, suggestedDiscountPercent: item.product.stores[0]?.salePrice && item.promotionalPrice ? item.product.stores[0].salePrice.minus(item.promotionalPrice).div(item.product.stores[0].salePrice).mul(100) : item.percentOff })));
  }

  async create(tenantId: string, storeId: string, actorId: string, dto: any) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (Number.isNaN(startsAt.getTime()) || (endsAt && Number.isNaN(endsAt.getTime()))) throw new BadRequestException('Datas de promoção inválidas.');
    if (endsAt && endsAt <= startsAt) throw new BadRequestException('O fim da promoção deve ser posterior ao início.');
    if (dto.promotionalPrice == null && dto.percentOff == null) throw new BadRequestException('Informe preço promocional ou percentual de desconto.');
    if (dto.promotionalPrice != null && Number(dto.promotionalPrice) <= 0) throw new BadRequestException('O preço promocional deve ser maior que zero.');
    if (dto.percentOff != null && (Number(dto.percentOff) <= 0 || Number(dto.percentOff) >= 100)) throw new BadRequestException('O desconto deve ser maior que zero e menor que 100%.');
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId, active: true, stores: { some: { storeId } } }, select: { id: true, name: true } });
    if (!product) throw new NotFoundException('Produto não encontrado nesta loja.');
    if (dto.lotId) {
      const lot = await this.prisma.productLot.findFirst({ where: { id: dto.lotId, tenantId, storeId, productId: product.id, status: 'ACTIVE' }, select: { id: true } });
      if (!lot) throw new BadRequestException('Lote inválido para o produto e loja selecionados.');
    }
    const promotion = await this.prisma.promotion.create({ data: { tenantId, storeId, productId: product.id, lotId: dto.lotId || null, title: String(dto.title || `Oferta: ${product.name}`).trim(), status: (dto.status as PromotionStatus) || 'DRAFT', promotionalPrice: dto.promotionalPrice == null ? null : dto.promotionalPrice, percentOff: dto.percentOff == null ? null : dto.percentOff, startsAt, endsAt } });
    await this.prisma.auditLog.create({ data: { tenantId, actorId, action: 'CREATE', entityType: 'Promotion', entityId: promotion.id, after: { productId: product.id, lotId: promotion.lotId, status: promotion.status, promotionalPrice: promotion.promotionalPrice?.toString() ?? null, percentOff: promotion.percentOff?.toString() ?? null, startsAt: promotion.startsAt, endsAt: promotion.endsAt } } });
    return promotion;
  }

  async setStatus(tenantId: string, storeId: string, actorId: string, id: string, status: PromotionStatus) {
    const current = await this.prisma.promotion.findFirst({ where: { id, tenantId, storeId } });
    if (!current) throw new NotFoundException('Promoção não encontrada.');
    const updated = await this.prisma.promotion.update({ where: { id }, data: { status } });
    await this.prisma.auditLog.create({ data: { tenantId, actorId, action: 'STATUS_CHANGE', entityType: 'Promotion', entityId: id, before: { status: current.status }, after: { status: updated.status } } });
    return updated;
  }
}
