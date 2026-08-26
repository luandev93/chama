import { Transform } from 'class-transformer';
import { IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateStockReservationDto {
  @IsUUID()
  productId!: string;

  @Transform(({ value }) => String(value))
  @IsString()
  quantity!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
