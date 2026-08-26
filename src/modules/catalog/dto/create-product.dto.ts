import { Transform } from 'class-transformer';
import { IsBoolean, IsDecimal, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

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
