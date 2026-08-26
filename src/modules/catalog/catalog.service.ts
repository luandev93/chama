import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, storeId: string, actorId: string, dto: CreateProductDto) {
    const duplicate = dto.gtin
      ? await this.prisma.product.findFirst({ where: { tenantId, gtin: dto.gtin } })
      : null;
    if (duplicate) throw new ConflictException('Já existe um produto com este GTIN neste tenant.');

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          tenantId,
          name: dto.name.trim(),
          gtin: dto.gtin,
          category: dto.category?.trim(),
          unit: dto.unit.trim().toUpperCase(),
          active: dto.active ?? true,
        },
      });
      await tx.productStore.create({
        data: {
          productId: product.id,
          storeId,
          costPrice: dto.costPrice,
          salePrice: dto.salePrice,
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
          after: { name: product.name, gtin: product.gtin, storeId },
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
      include: { stores: { where: { storeId }, select: { salePrice: true, costPrice: true, minimumQty: true, reorderPoint: true } }, balances: { where: { storeId }, select: { physicalQuantity: true, reservedQuantity: true } } },
      orderBy: { name: 'asc' },
      take: 100,
    });
  }

  async get(tenantId: string, storeId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId, stores: { some: { storeId } } },
      include: { stores: { where: { storeId } }, balances: { where: { storeId } } },
    });
    if (!product) throw new NotFoundException('Produto não encontrado.');
    return product;
  }
}
