import { Transform } from 'class-transformer';
import { IsBoolean, IsDecimal, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;
}

export class CreateSectionDto {
  @IsUUID()
  categoryId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;
}

export class UpsertSectionPricingPolicyDto {
  @IsUUID()
  sectionId!: string;

  @Transform(({ value }) => String(value))
  @IsDecimal({ decimal_digits: '0,4', force_decimal: false })
  markupPercent!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
