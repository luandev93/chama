import { ConflictException } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { PrismaService } from '../../core/database/prisma.service';

function buildPrismaMock(brands: any[], orderItems: any[]) {
  return {
    brand: {
      findMany: jest.fn().mockResolvedValue(brands),
      create: jest.fn().mockResolvedValue({ id: 'brand-1', name: 'Itambé', slug: 'itambe' }),
    },
    orderItem: { findMany: jest.fn().mockResolvedValue(orderItems) },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn().mockImplementation((fn: (tx: unknown) => unknown) => fn(undefined as unknown as never)),
  };
}

describe('BrandsService', () => {
  it('joins product counts with 30-day sales per brand', async () => {
    const brands = [
      { id: 'brand-1', name: 'Itambé', _count: { products: 3 } },
      { id: 'brand-2', name: 'Sem vendas', _count: { products: 1 } },
    ];
    const orderItems = [
      { quantity: 2, lineTotal: 10, product: { brandId: 'brand-1' } },
      { quantity: 1, lineTotal: 5, product: { brandId: 'brand-1' } },
      { quantity: 4, lineTotal: 8, product: { brandId: null } },
    ];
    const prisma = buildPrismaMock(brands, orderItems);
    const service = new BrandsService(prisma as unknown as PrismaService);

    const result = await service.list('tenant-1', 'store-1');

    expect(result).toEqual([
      { id: 'brand-1', name: 'Itambé', productsCount: 3, salesVolume: 3, revenue: 15 },
      { id: 'brand-2', name: 'Sem vendas', productsCount: 1, salesVolume: 0, revenue: 0 },
    ]);
  });

  it('caches the list per tenant/store', async () => {
    const prisma = buildPrismaMock([], []);
    const service = new BrandsService(prisma as unknown as PrismaService);

    await service.list('tenant-1', 'store-1');
    await service.list('tenant-1', 'store-1');

    expect(prisma.brand.findMany).toHaveBeenCalledTimes(1);
  });

  it('rejects creating a brand name that already exists for the tenant', async () => {
    const prisma = buildPrismaMock([], []);
    prisma.$transaction.mockRejectedValue(Object.assign(new Error('duplicate'), { code: 'P2002' }));
    const service = new BrandsService(prisma as unknown as PrismaService);

    await expect(service.create('tenant-1', 'user-1', { name: 'Itambé' })).rejects.toBeInstanceOf(ConflictException);
  });
});
