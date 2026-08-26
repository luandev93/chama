import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

enum ManualMovementType { PURCHASE = 'PURCHASE', ADJUSTMENT_IN = 'ADJUSTMENT_IN', ADJUSTMENT_OUT = 'ADJUSTMENT_OUT', LOSS = 'LOSS', EXPIRATION = 'EXPIRATION', RETURN = 'RETURN', INVENTORY_CORRECTION = 'INVENTORY_CORRECTION' }

export class CreateStockMovementDto {
  @IsUUID()
  productId!: string;

  @IsEnum(ManualMovementType)
  type!: ManualMovementType;

  @Transform(({ value }) => String(value))
  @IsString()
  quantity!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;
}
