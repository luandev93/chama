import { Transform } from 'class-transformer';
import { IsDecimal } from 'class-validator';

export class PriceFromMarkupDto {
  @Transform(({ value }) => String(value))
  @IsDecimal({ decimal_digits: '0,4', force_decimal: false })
  costPrice!: string;

  @Transform(({ value }) => String(value))
  @IsDecimal({ decimal_digits: '0,4', force_decimal: false })
  markupPercent!: string;
}

export class MarginFromPriceDto {
  @Transform(({ value }) => String(value))
  @IsDecimal({ decimal_digits: '0,4', force_decimal: false })
  costPrice!: string;

  @Transform(({ value }) => String(value))
  @IsDecimal({ decimal_digits: '0,4', force_decimal: false })
  salePrice!: string;
}
