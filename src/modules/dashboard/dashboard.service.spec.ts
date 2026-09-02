import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../core/database/prisma.service';

function buildPrismaMock(order: any) {
  return {
    order: { findMany: jest.fn().mockResolvedValue([order]) },
    productLot: { count: jest.fn().mockResolvedValue(0) },
    stockBalance: { findMany: jest.fn().mockResolvedValue([]) },
    promotion: { count: jest.fn().mockResolvedValue(0) },
  };
}

function buildOrder(overrides: Partial<{ totalAmount: number; quantity: number; unitCost: number; unitPrice: number }> = {}) {
  const quantity = overrides.quantity ?? 2;
  const unitCost = overrides.unitCost ?? 3;
  const unitPrice = overrides.unitPrice ?? 5;
  const lineTotal = quantity * unitPrice;
  return {
    id: 'order-1',
    totalAmount: overrides.totalAmount ?? lineTotal,
    createdAt: new Date(),
    items: [
      {
        productId: 'product-1',
        productName: 'Produto teste',
        quantity,
        lineTotal,
        product: {
          name: 'Produto teste',
          category: 'Categoria teste',
          categoryRef: null,
          section: null,
          stores: [{ costPrice: unitCost, salePrice: unitPrice }],
        },
      },
    ],
  };
}

describe('DashboardService', () => {
  it('aggregates revenue, cost and margin from orders in the period', async () => {
    const order = buildOrder({ quantity: 2, unitCost: 3, unitPrice: 5 }); // revenue 10, cost 6, profit 4
    const prisma = buildPrismaMock(order);
    const service = new DashboardService(prisma as unknown as PrismaService);

    const overview = await service.overview('tenant-1', 'store-1');

    expect(overview.cards.revenue).toBe(10);
    expect(overview.cards.estimatedProfit).toBe(4);
    expect(overview.cards.estimatedMargin).toBeCloseTo(40);
    expect(overview.topProducts).toHaveLength(1);
    expect(overview.topProducts[0]).toMatchObject({ productId: 'product-1', qty: 2, revenue: 10, profit: 4 });
  });

  it('serves repeat requests for the same tenant/store from cache instead of re-querying', async () => {
    const prisma = buildPrismaMock(buildOrder());
    const service = new DashboardService(prisma as unknown as PrismaService);

    await service.overview('tenant-1', 'store-1');
    await service.overview('tenant-1', 'store-1');

    expect(prisma.order.findMany).toHaveBeenCalledTimes(1);
  });

  it('does not share cache entries across different stores', async () => {
    const prisma = buildPrismaMock(buildOrder());
    const service = new DashboardService(prisma as unknown as PrismaService);

    await service.overview('tenant-1', 'store-1');
    await service.overview('tenant-1', 'store-2');

    expect(prisma.order.findMany).toHaveBeenCalledTimes(2);
  });
});
