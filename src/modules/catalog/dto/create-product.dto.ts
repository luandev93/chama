import { Transform } from 'class-transformer';
import { IsBoolean, IsDecimal, IsEnum, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export enum ProductPricingModeDto {
  SECTION_DEFAULT = 'SECTION_DEFAULT',
  CUSTOM_MARKUP = 'CUSTOM_MARKUP',
  DIRECT_SALE_PRICE = 'DIRECT_SALE_PRICE',
}

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(/^\d{8,14}$/)
  gtin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @IsOptional()
  @IsUUID()
  brandId?: string;

  @IsString()
  @MaxLength(16)
  unit!: string;

  @IsOptional()
  @Transform(({ value }) => String(value))
  @IsDecimal({ decimal_digits: '0,4', force_decimal: false })
  costPrice?: string;

  @IsOptional()
  @Transform(({ value }) => String(value))
  @IsDecimal({ decimal_digits: '0,4', force_decimal: false })
  salePrice?: string;

  @IsOptional()
  @Transform(({ value }) => String(value))
  @IsDecimal({ decimal_digits: '0,4', force_decimal: false })
  markupPercent?: string;

  @IsOptional()
  @IsEnum(ProductPricingModeDto)
  pricingMode?: ProductPricingModeDto;

  @IsOptional()
  @Transform(({ value }) => String(value))
  @IsDecimal({ decimal_digits: '0,3', force_decimal: false })
  minimumQty?: string;

  @IsOptional()
  @Transform(({ value }) => String(value))
  @IsDecimal({ decimal_digits: '0,3', force_decimal: false })
  reorderPoint?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
