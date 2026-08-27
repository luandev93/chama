export type PaymentProviderName = 'MERCADO_PAGO' | 'MANUAL';
export type PaymentMethodName = 'PIX' | 'PAYMENT_LINK' | 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'VOUCHER';

export interface CreateProviderPaymentInput {
  paymentIntentId: string;
  externalReference: string;
  idempotencyKey: string;
  amount: string;
  currency: string;
  method: PaymentMethodName;
  description: string;
  notificationUrl?: string;
  payerEmail?: string;
  expiresAt?: Date | null;
}

export interface ProviderPaymentResult {
  providerReference: string;
  status: string;
  paymentUrl?: string;
  pixCopyPaste?: string;
  pixQrCodeBase64?: string;
  raw: Record<string, unknown>;
}

export interface ProviderPaymentSnapshot {
  providerReference: string;
  externalReference?: string;
  amount?: string;
  currency?: string;
  status: string;
  raw: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  createPayment(input: CreateProviderPaymentInput): Promise<ProviderPaymentResult>;
  getPayment(reference: string): Promise<ProviderPaymentSnapshot>;
  cancelPayment(reference: string): Promise<void>;
  refundPayment(reference: string, amount?: string): Promise<void>;
  verifyWebhook(input: { xSignature?: string; xRequestId?: string; dataId?: string }): boolean;
}