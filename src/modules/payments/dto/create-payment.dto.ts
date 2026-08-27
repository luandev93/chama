import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';

export enum PaymentMethodDto {
  PIX = 'PIX',
  PAYMENT_LINK = 'PAYMENT_LINK',
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  VOUCHER = 'VOUCHER',
}

export class CreatePaymentDto {
  @IsEnum(PaymentMethodDto)
  method!: PaymentMethodDto;

  @IsString()
  @Length(8, 128)
  @Matches(/^[A-Za-z0-9._:-]+$/)
  idempotencyKey!: string;

  @IsOptional()
  @IsEmail()
  payerEmail?: string;
}

export class CashPaymentDto {
  @IsString()
  @Matches(/^\d+(\.\d{1,4})?$/)
  receivedAmount!: string;

  @IsString()
  @Length(8, 128)
  @Matches(/^[A-Za-z0-9._:-]+$/)
  idempotencyKey!: string;
}

export class RefundPaymentDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,4})?$/)
  amount?: string;
}

export class PaymentIdParamDto {
  @IsUUID()
  id!: string;
}