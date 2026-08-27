import { Transform } from 'class-transformer';
import { IsDateString, IsOptional, IsString, IsUUID, MaxLength, IsDecimal } from 'class-validator';

export class CreateProductLotDto {
  @IsUUID()
  productId!: string;

  @IsString()
  @MaxLength(80)
  code!: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @Transform(({ value }) => String(value))
  @IsDecimal({ decimal_digits: '0,3', force_decimal: false })
  quantity!: string;

  @IsOptional()
  @Transform(({ value }) => String(value))
  @IsDecimal({ decimal_digits: '0,4', force_decimal: false })
  costPrice?: string;
}
