import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsISO8601, IsOptional, IsString, IsUUID, Length, MaxLength, ValidateNested } from 'class-validator';
import { OrderOrigin, OrderType } from '@prisma/client';

class CreateOrderItemDto {
  @IsUUID()
  productId!: string;

  @IsString()
  @MaxLength(32)
  quantity!: string;
}

export class CreateOrderDto {
  @IsEnum(OrderOrigin)
  origin!: OrderOrigin;

  @IsOptional()
  @IsEnum(OrderType)
  type?: OrderType;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  customerName?: string;

  @IsOptional()
  @IsString()
  @Length(8, 24)
  customerPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
