import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, PricingMode } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  psychologicalSuggestion(costInput: string, minimumMarginInput: string, ending: string) {
    const cost = new Prisma.Decimal(costInput);
    const minimumMargin = new Prisma.Decimal(minimumMarginInput);
    if (!cost.isFinite() || cost.lt(0)) throw new BadRequestException('O custo deve ser válido e não negativo.');
    if (!minimumMargin.isFinite() || minimumMargin.lt(0) || minimumMargin.gte(100)) throw new BadRequestException('A margem mínima deve ficar entre 0% e menor que 100%.');
    const technicalPrice = minimumMargin.eq(0) ? cost : cost.div(new Prisma.Decimal(1).minus(minimumMargin.div(100)));
    const cents = new Prisma.Decimal(ending.replace(',', '.'));
    let candidate = technicalPrice.floor().plus(cents);
    if (candidate.lt(technicalPrice)) candidate = candidate.plus(1);
    const grossMarginPercent = candidate.eq(0) ? new Prisma.Decimal(0) : candidate.minus(cost).div(candidate).mul(100);
    return { costPrice: cost.toDecimalPlaces(4).toString(), minimumMarginPercent: minimumMargin.toDecimalPlaces(4).toString(), technicalPrice: technicalPrice.toDecimalPlaces(4).toString(), suggestedPrice: candidate.toDecimalPlaces(2).toString(), grossMarginPercent: grossMarginPercent.toDecimalPlaces(4).toString(), requiresApproval: grossMarginPercent.lt(minimumMargin) };
  }

  calculate(costInput: string, markupInput: string) {
    const cost = new Prisma.Decimal(costInput);
    const markupPercent = new Prisma.Decimal(markupInput);
    if (!cost.isFinite() || cost.lt(0)) throw new BadRequestException('O custo deve ser válido e não negativo.');
    if (!markupPercent.isFinite() || markupPercent.lt(0) || markupPercent.gt(10000)) {
      throw new BadRequestException('O acréscimo deve estar entre 0% e 10000%.');
    }
    const salePrice = cost.mul(markupPercent.div(100).add(1));
    const grossProfit = salePrice.minus(cost);
    const grossMarginPercent = salePrice.eq(0) ? new Prisma.Decimal(0) : grossProfit.div(salePrice).mul(100);
    return {
      costPrice: cost.toDecimalPlaces(4).toString(),
      markupPercent: markupPercent.toDecimalPlaces(4).toString(),
      salePrice: salePrice.toDecimalPlaces(4).toString(),
      grossProfit: grossProfit.toDecimalPlaces(4).toString(),
      grossMarginPercent: grossMarginPercent.toDecimalPlaces(4).toString(),
    };
  }

  reverse(costInput: string, saleInput: string) {
    const cost = new Prisma.Decimal(costInput);
    const salePrice = new Prisma.Decimal(saleInput);
    if (!cost.isFinite() || cost.lt(0)) throw new BadRequestException('O custo deve ser válido e não negativo.');
    if (!salePrice.isFinite() || salePrice.lt(0)) throw new BadRequestException('O preço de venda deve ser válido e não negativo.');
    const grossProfit = salePrice.minus(cost);
    const markupPercent = cost.eq(0) ? null : grossProfit.div(cost).mul(100);
    const grossMarginPercent = salePrice.eq(0) ? new Prisma.Decimal(0) : grossProfit.div(salePrice).mul(100);
    return {
      costPrice: cost.toDecimalPlaces(4).toString(),
      salePrice: salePrice.toDecimalPlaces(4).toString(),
      grossProfit: grossProfit.toDecimalPlaces(4).toString(),
      markupPercent: markupPercent?.toDecimalPlaces(4).toString() ?? null,
      grossMarginPercent: grossMarginPercent.toDecimalPlaces(4).toString(),
    };
  }

  async resolveForProduct(storeId: string, sectionId: string | undefined, costPrice?: string, salePrice?: string, requestedMode?: PricingMode, customMarkup?: string) {
    if (!costPrice) return { salePrice: salePrice ? new Prisma.Decimal(salePrice) : null, markupPercent: null, grossMarginPercent: null, pricingMode: requestedMode ?? PricingMode.DIRECT_SALE_PRICE };
    if (salePrice && (!requestedMode || requestedMode === PricingMode.DIRECT_SALE_PRICE)) {
      const result = this.reverse(costPrice, salePrice);
      return { salePrice: new Prisma.Decimal(result.salePrice), markupPercent: result.markupPercent ? new Prisma.Decimal(result.markupPercent) : null, grossMarginPercent: new Prisma.Decimal(result.grossMarginPercent), pricingMode: PricingMode.DIRECT_SALE_PRICE };
    }
    let markup = customMarkup;
    const pricingMode = requestedMode ?? (markup ? PricingMode.CUSTOM_MARKUP : PricingMode.SECTION_DEFAULT);
    if (pricingMode === PricingMode.SECTION_DEFAULT) {
      if (!sectionId) throw new BadRequestException('A seção é obrigatória para usar a precificação padrão da seção.');
      const policy = await this.prisma.sectionPricingPolicy.findFirst({ where: { storeId, sectionId, active: true }, select: { markupPercent: true } });
      if (!policy) throw new BadRequestException('Esta seção ainda não possui uma política de preço ativa para a loja.');
      markup = policy.markupPercent.toString();
    }
    if (pricingMode === PricingMode.CUSTOM_MARKUP && !markup) throw new BadRequestException('Informe o acréscimo personalizado do produto.');
    if (!markup) return { salePrice: null, markupPercent: null, grossMarginPercent: null, pricingMode };
    const result = this.calculate(costPrice, markup);
    return { salePrice: new Prisma.Decimal(result.salePrice), markupPercent: new Prisma.Decimal(result.markupPercent), grossMarginPercent: new Prisma.Decimal(result.grossMarginPercent), pricingMode };
  }
}
