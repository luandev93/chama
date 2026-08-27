import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PricingMode } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { PricingService } from './pricing.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService, private readonly pricing: PricingService) {}

  async create(tenantId: string, storeId: string, actorId: string, dto: CreateProductDto) {
    const duplicate = dto.gtin
      ? await this.prisma.product.findFirst({ where: { tenantId, gtin: dto.gtin } })
      : null;
    if (duplicate) throw new ConflictException('Já existe um produto com este GTIN neste tenant.');

    if (dto.sectionId) {
      const section = await this.prisma.productSection.findFirst({ where: { id: dto.sectionId, active: true, category: { tenantId, active: true } }, select: { id: true, categoryId: true } });
      if (!section) throw new BadRequestException('Seção inválida para este tenant.');
      if (dto.categoryId && dto.categoryId !== section.categoryId) throw new BadRequestException('A seção selecionada não pertence à categoria informada.');
      dto.categoryId = section.categoryId;
    }
    if (dto.categoryId && !dto.sectionId) {
      const category = await this.prisma.productCategory.findFirst({ where: { id: dto.categoryId, tenantId, active: true }, select: { id: true } });
      if (!category) throw new BadRequestException('Categoria inválida para este tenant.');
    }

    const requestedMode = dto.pricingMode as PricingMode | undefined;
    const resolvedPricing = await this.pricing.resolveForProduct(storeId, dto.sectionId, dto.costPrice, dto.salePrice, requestedMode, dto.markupPercent);

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          tenantId,
          name: dto.name.trim(),
          gtin: dto.gtin,
          category: dto.category?.trim(),
          categoryId: dto.categoryId,
          sectionId: dto.sectionId,
          unit: dto.unit.trim().toUpperCase(),
          active: dto.active ?? true,
        },
      });
      await tx.productStore.create({
        data: {
          productId: product.id,
          storeId,
          costPrice: dto.costPrice,
          salePrice: resolvedPricing.salePrice,
          pricingMode: resolvedPricing.pricingMode,
          markupPercent: resolvedPricing.markupPercent,
          grossMarginPercent: resolvedPricing.grossMarginPercent,
          minimumQty: dto.minimumQty,
          reorderPoint: dto.reorderPoint,
        },
      });
      await tx.stockBalance.create({ data: { tenantId, storeId, productId: product.id } });
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId,
          action: 'CREATE',
          entityType: 'Product',
          entityId: product.id,
          after: {
            name: product.name,
            gtin: product.gtin,
            categoryId: product.categoryId,
            sectionId: product.sectionId,
            storeId,
            pricingMode: resolvedPricing.pricingMode,
            salePrice: resolvedPricing.salePrice?.toString() ?? null,
            markupPercent: resolvedPricing.markupPercent?.toString() ?? null,
            grossMarginPercent: resolvedPricing.grossMarginPercent?.toString() ?? null,
          },
        },
      });
      return product;
    });
  }

  async list(tenantId: string, storeId: string, query?: string) {
    return this.prisma.product.findMany({
      where: {
        tenantId,
        active: true,
        stores: { some: { storeId } },
        ...(query ? { OR: [{ name: { contains: query, mode: 'insensitive' } }, { gtin: { contains: query } }] } : {}),
      },
      include: {
        categoryRef: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
        stores: { where: { storeId }, select: { salePrice: true, costPrice: true, pricingMode: true, markupPercent: true, grossMarginPercent: true, minimumQty: true, maximumQty: true, reorderPoint: true } },
        promotions: { where: { storeId, status: 'ACTIVE', startsAt: { lte: new Date() }, OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] }, orderBy: { startsAt: 'desc' }, take: 1 },
        balances: { where: { storeId }, select: { physicalQuantity: true, reservedQuantity: true } },
      },
      orderBy: { name: 'asc' },
      take: 100,
    }).then((products) => products.map((product) => {
      const basePrice = product.stores[0]?.salePrice ?? null;
      const promotion = product.promotions[0];
      const effectivePrice = basePrice && promotion
        ? promotion.promotionalPrice ?? basePrice.minus(basePrice.mul(promotion.percentOff ?? 0).div(100))
        : basePrice;
      return { ...product, pricing: { basePrice, effectivePrice, promotion, isOffer: Boolean(promotion) } };
    }));
  }

  async get(tenantId: string, storeId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId, stores: { some: { storeId } } },
      include: { categoryRef: true, section: true, stores: { where: { storeId } }, promotions: { where: { storeId, status: 'ACTIVE', startsAt: { lte: new Date() }, OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] }, orderBy: { startsAt: 'desc' }, take: 1 }, balances: { where: { storeId } } },
    });
    if (!product) throw new NotFoundException('Produto não encontrado.');
    return product;
  }
}
