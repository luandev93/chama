import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { ACTIVE_ORDER_STATUSES } from '../../core/reporting/active-order-statuses';
import { slugify } from './slugify';
import { CreateBrandDto } from './dto/create-brand.dto';

// Same reasoning as DashboardService's cache: brand performance is read far more often than it
// changes, so a short TTL absorbs repeat loads of the "Marcas" screen without hitting Postgres.
const CACHE_TTL_MS = 60_000;

type BrandRow = { id: string; name: string; productsCount: number; salesVolume: number; revenue: number };

@Injectable()
export class BrandsService {
  private readonly cache = new Map<string, { data: BrandRow[]; expiresAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, actorId: string, dto: CreateBrandDto) {
    const slug = slugify(dto.name);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const brand = await tx.brand.create({ data: { tenantId, name: dto.name.trim(), slug } });
        await tx.auditLog.create({ data: { tenantId, actorId, action: 'CREATE', entityType: 'Brand', entityId: brand.id, after: { name: brand.name, slug } } });
        return brand;
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Já existe uma marca com este nome.');
      throw error;
    }
  }

  async list(tenantId: string, storeId: string): Promise<BrandRow[]> {
    const cacheKey = `${tenantId}:${storeId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    const [brands, items] = await Promise.all([
      this.prisma.brand.findMany({
        where: { tenantId, active: true },
        orderBy: { name: 'asc' },
        include: { _count: { select: { products: { where: { active: true } } } } },
      }),
      this.prisma.orderItem.findMany({
        where: { order: { tenantId, storeId, createdAt: { gte: new Date(Date.now() - 30 * 86400000) }, status: { in: ACTIVE_ORDER_STATUSES } } },
        select: { quantity: true, lineTotal: true, product: { select: { brandId: true } } },
      }),
    ]);

    const salesByBrand = new Map<string, { qty: number; revenue: number }>();
    for (const item of items) {
      const brandId = item.product.brandId;
      if (!brandId) continue;
      const agg = salesByBrand.get(brandId) ?? { qty: 0, revenue: 0 };
      agg.qty += Number(item.quantity);
      agg.revenue += Number(item.lineTotal);
      salesByBrand.set(brandId, agg);
    }

    const data = brands.map((b) => ({
      id: b.id,
      name: b.name,
      productsCount: b._count.products,
      salesVolume: salesByBrand.get(b.id)?.qty ?? 0,
      revenue: salesByBrand.get(b.id)?.revenue ?? 0,
    }));

    this.cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return data;
  }
}
