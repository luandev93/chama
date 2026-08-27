import { Transform } from 'class-transformer';
import { IsDecimal, IsEnum } from 'class-validator';

export enum PsychologicalEndingDto {
  NINETY_NINE = '.99',
  NINETY = '.90',
  NINETY_FIVE = '.95',
  FORTY_NINE = '.49',
  SEVENTY_NINE = '.79',
}

export class PsychologicalPriceDto {
  @Transform(({ value }) => String(value))
  @IsDecimal({ decimal_digits: '0,4', force_decimal: false })
  costPrice!: string;

  @Transform(({ value }) => String(value))
  @IsDecimal({ decimal_digits: '0,4', force_decimal: false })
  minimumMarginPercent!: string;

  @IsEnum(PsychologicalEndingDto)
  ending!: PsychologicalEndingDto;
}
