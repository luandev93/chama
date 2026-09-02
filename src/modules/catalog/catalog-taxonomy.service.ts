import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateCategoryDto, CreateSectionDto, UpsertSectionPricingPolicyDto } from './dto/catalog-taxonomy.dto';
import { slugify } from './slugify';

@Injectable()
export class CatalogTaxonomyService {
  constructor(private readonly prisma: PrismaService) {}

  async createCategory(tenantId: string, actorId: string, dto: CreateCategoryDto) {
    const slug = slugify(dto.name);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const category = await tx.productCategory.create({ data: { tenantId, name: dto.name.trim(), slug } });
        await tx.auditLog.create({ data: { tenantId, actorId, action: 'CREATE', entityType: 'ProductCategory', entityId: category.id, after: { name: category.name, slug } } });
        return category;
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Já existe uma categoria com este nome.');
      throw error;
    }
  }

  async createSection(tenantId: string, actorId: string, dto: CreateSectionDto) {
    const category = await this.prisma.productCategory.findFirst({ where: { id: dto.categoryId, tenantId, active: true }, select: { id: true } });
    if (!category) throw new NotFoundException('Categoria não encontrada.');
    const slug = slugify(dto.name);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const section = await tx.productSection.create({ data: { categoryId: category.id, name: dto.name.trim(), slug } });
        await tx.auditLog.create({ data: { tenantId, actorId, action: 'CREATE', entityType: 'ProductSection', entityId: section.id, after: { categoryId: category.id, name: section.name, slug } } });
        return section;
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Já existe uma seção com este nome nesta categoria.');
      throw error;
    }
  }

  async upsertPricingPolicy(tenantId: string, storeId: string, actorId: string, dto: UpsertSectionPricingPolicyDto) {
    const section = await this.prisma.productSection.findFirst({ where: { id: dto.sectionId, category: { tenantId } }, select: { id: true, name: true } });
    if (!section) throw new NotFoundException('Seção não encontrada para este tenant.');
    const result = await this.prisma.$transaction(async (tx) => {
      const policy = await tx.sectionPricingPolicy.upsert({
        where: { storeId_sectionId: { storeId, sectionId: section.id } },
        create: { storeId, sectionId: section.id, markupPercent: dto.markupPercent, active: dto.active ?? true },
        update: { markupPercent: dto.markupPercent, active: dto.active ?? true },
      });
      await tx.auditLog.create({ data: { tenantId, actorId, action: 'UPDATE', entityType: 'SectionPricingPolicy', entityId: policy.id, after: { storeId, sectionId: section.id, markupPercent: policy.markupPercent.toString(), active: policy.active } } });
      return policy;
    });
    return result;
  }

  async list(tenantId: string, storeId: string) {
    return this.prisma.productCategory.findMany({
      where: { tenantId, active: true },
      orderBy: { name: 'asc' },
      include: {
        sections: {
          where: { active: true },
          orderBy: { name: 'asc' },
          include: { policies: { where: { storeId }, select: { markupPercent: true, active: true } } },
        },
      },
    });
  }
}
