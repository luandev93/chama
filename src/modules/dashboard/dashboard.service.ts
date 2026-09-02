import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';

const ACTIVE_STATUSES: OrderStatus[] = ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'];

// The dashboard aggregates 30 days of orders/items/stock in memory on every call. On the free
// tier that DB doesn't need to answer the same query every time someone opens the screen, so a
// short-lived per-store cache absorbs repeat loads (refreshes, multiple tabs) between real changes.
const CACHE_TTL_MS = 60_000;

type Rank = { qty: number; revenue: number; profit: number };
type ProductRank = Rank & { name: string; cost: number };
type Overview = Awaited<ReturnType<DashboardService['computeOverview']>>;

@Injectable()
export class DashboardService {
  private readonly cache = new Map<string, { data: Overview; expiresAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  async overview(tenantId: string, storeId: string): Promise<Overview> {
    const cacheKey = `${tenantId}:${storeId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    const data = await this.computeOverview(tenantId, storeId);
    this.cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return data;
  }

  private async computeOverview(tenantId: string, storeId: string) {
    const now = new Date();
    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);
    const start30 = new Date(now.getTime() - 30 * 86400000);

    const orders = await this.prisma.order.findMany({
      where: { tenantId, storeId, createdAt: { gte: start30 }, status: { in: ACTIVE_STATUSES } },
      include: {
        items: {
          include: {
            product: {
              include: {
                stores: { where: { storeId }, select: { costPrice: true, salePrice: true } },
                section: { include: { category: true } },
                categoryRef: true,
              },
            },
          },
        },
      },
    });

    let revenue = 0;
    let cost = 0;
    let ordersToday = 0;
    const products = new Map<string, ProductRank>();
    const brands = new Map<string, Rank>();
    const categories = new Map<string, Rank>();
    const days = new Map<string, { revenue: number; orders: Set<string>; profit: number }>();

    for (const o of orders) {
      revenue += Number(o.totalAmount ?? 0);
      if (o.createdAt >= startToday) ordersToday++;

      const day = o.createdAt.toISOString().slice(0, 10);
      const daily = days.get(day) ?? { revenue: 0, orders: new Set<string>(), profit: 0 };
      daily.revenue += Number(o.totalAmount ?? 0);
      daily.orders.add(o.id);
      days.set(day, daily);

      for (const i of o.items) {
        const q = Number(i.quantity);
        const line = Number(i.lineTotal ?? 0);
        const unitCost = Number(i.product.stores[0]?.costPrice ?? 0);
        const itemCost = unitCost * q;
        const profit = line - itemCost;
        cost += itemCost;

        const current = products.get(i.productId) ?? { name: i.productName || i.product.name, qty: 0, revenue: 0, cost: 0, profit: 0 };
        current.qty += q;
        current.revenue += line;
        current.cost += itemCost;
        products.set(i.productId, current);

        // TODO: no brand entity exists yet on Product — every item lands in "Sem marca" until one is modeled.
        const brand = 'Sem marca';
        const b = brands.get(brand) ?? { qty: 0, revenue: 0, profit: 0 };
        b.qty += q;
        b.revenue += line;
        b.profit += profit;
        brands.set(brand, b);

        const category = i.product.section?.category?.name ?? i.product.categoryRef?.name ?? i.product.category ?? 'Sem categoria';
        const c = categories.get(category) ?? { qty: 0, revenue: 0, profit: 0 };
        c.qty += q;
        c.revenue += line;
        c.profit += profit;
        categories.set(category, c);

        daily.profit += profit;
      }
    }

    const topProducts = [...products.entries()]
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 10)
      .map(([productId, v]) => ({ productId, ...v, profit: v.revenue - v.cost, margin: v.revenue ? ((v.revenue - v.cost) / v.revenue) * 100 : 0 }));
    const topBrands = [...brands.entries()]
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10)
      .map(([name, v]) => ({ name, ...v, margin: v.revenue ? (v.profit / v.revenue) * 100 : 0 }));
    const topCategories = [...categories.entries()]
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10)
      .map(([name, v]) => ({ name, ...v, margin: v.revenue ? (v.profit / v.revenue) * 100 : 0 }));
    const dailySales = [...days.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({ date, revenue: v.revenue, orders: v.orders.size, profit: v.profit }));
    const lowMarginProducts = topProducts.filter((p) => p.margin < 15 && p.qty > 0).sort((a, b) => b.qty - a.qty).slice(0, 10);
    const strategicProducts = topProducts.filter((p) => p.margin >= 20 && p.qty > 0).sort((a, b) => b.profit - a.profit || b.qty - a.qty).slice(0, 10);

    const expiringLots = await this.prisma.productLot.count({
      where: { tenantId, storeId, status: 'ACTIVE', quantity: { gt: 0 }, expiresAt: { not: null, lte: new Date(now.getTime() + 30 * 86400000) } },
    });

    const balances = await this.prisma.stockBalance.findMany({
      where: { tenantId, storeId },
      include: { product: { include: { stores: { where: { storeId }, select: { minimumQty: true, reorderPoint: true, salePrice: true, costPrice: true } } } } },
    });

    let stockouts = 0;
    let lowStock = 0;
    let inventoryValue = 0;
    const replenishment: Array<{
      productId: string;
      name: string;
      availableQuantity: number;
      minimumQuantity: number;
      reorderPoint: number;
      salesLast30Days: number;
      recommendedQuantity: number;
      reason: string;
    }> = [];

    for (const b of balances) {
      const available = Math.max(0, Number(b.physicalQuantity) - Number(b.reservedQuantity));
      const cfg = b.product.stores[0];
      const min = Number(cfg?.minimumQty ?? 0);
      const reorder = Number(cfg?.reorderPoint ?? min);
      if (available <= 0) stockouts++;
      if ((min > 0 && available < min) || (reorder > 0 && available <= reorder)) {
        lowStock++;
        const sold30 = products.get(b.productId)?.qty ?? 0;
        const recommended = Math.max(min, Math.ceil(sold30 * 1.5), reorder) - available;
        replenishment.push({
          productId: b.productId,
          name: b.product.name,
          availableQuantity: available,
          minimumQuantity: min,
          reorderPoint: reorder,
          salesLast30Days: sold30,
          recommendedQuantity: Math.max(0, recommended),
          reason: available <= 0 ? 'Produto em ruptura' : sold30 > 0 ? 'Estoque abaixo do ponto de reposição com histórico de giro' : 'Estoque abaixo do nível configurado',
        });
      }
      inventoryValue += available * Number(cfg?.salePrice ?? 0);
    }
    replenishment.sort((a, b) => {
      if (a.availableQuantity === 0 && b.availableQuantity !== 0) return -1;
      if (b.availableQuantity === 0 && a.availableQuantity !== 0) return 1;
      return b.salesLast30Days - a.salesLast30Days;
    });

    const promotions = await this.prisma.promotion.count({
      where: { tenantId, storeId, status: 'ACTIVE', startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
    });

    const recommendations = [
      ...replenishment.slice(0, 5).map((r) => ({
        type: 'REPLENISH',
        priority: r.availableQuantity === 0 ? 'HIGH' : 'MEDIUM',
        title: r.availableQuantity === 0 ? `Repor ${r.name}` : `Planejar reposição de ${r.name}`,
        description: r.reason,
        productId: r.productId,
        action: 'REVIEW_STOCK',
      })),
      ...lowMarginProducts.slice(0, 3).map((p) => ({
        type: 'MARGIN',
        priority: 'MEDIUM',
        title: `Revisar margem de ${p.name}`,
        description: `Vendeu ${p.qty} unidades, mas a margem estimada está em ${p.margin.toFixed(1)}%.`,
        productId: p.productId,
        action: 'REVIEW_PRICE',
      })),
      ...strategicProducts.slice(0, 3).map((p) => ({
        type: 'STRATEGIC',
        priority: 'LOW',
        title: `Proteger estoque de ${p.name}`,
        description: `Produto com ${p.margin.toFixed(1)}% de margem e ${p.qty} unidades vendidas no período.`,
        productId: p.productId,
        action: 'WATCH_REPLENISH',
      })),
    ];

    return {
      period: { from: start30, to: now },
      cards: {
        revenue,
        orders: orders.length,
        ordersToday,
        averageTicket: orders.length ? revenue / orders.length : 0,
        estimatedProfit: revenue - cost,
        estimatedMargin: revenue ? ((revenue - cost) / revenue) * 100 : 0,
        expiringLots,
        stockouts,
        lowStock,
        inventoryValue,
        activePromotions: promotions,
      },
      topProducts,
      topBrands,
      topCategories,
      dailySales,
      lowMarginProducts,
      strategicProducts,
      replenishment,
      recommendations,
    };
  }
}
