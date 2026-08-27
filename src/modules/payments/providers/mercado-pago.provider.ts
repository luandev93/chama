import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { CreateProviderPaymentInput, PaymentProvider, ProviderPaymentResult, ProviderPaymentSnapshot } from './payment-provider';

@Injectable()
export class MercadoPagoProvider implements PaymentProvider {
  readonly name = 'MERCADO_PAGO' as const;
  private readonly accessToken: string;
  private readonly webhookSecret: string;

  constructor(private readonly config: ConfigService) {
    this.accessToken = this.config.getOrThrow<string>('MERCADO_PAGO_ACCESS_TOKEN');
    this.webhookSecret = this.config.getOrThrow<string>('MERCADO_PAGO_WEBHOOK_SECRET');
  }

  async createPayment(input: CreateProviderPaymentInput): Promise<ProviderPaymentResult> {
    if (input.method === 'PIX') return this.createPix(input);
    return this.createPaymentLink(input);
  }

  async getPayment(reference: string): Promise<ProviderPaymentSnapshot> {
    const response = await this.request(`/v1/payments/${encodeURIComponent(reference)}`, { method: 'GET' });
    return {
      providerReference: String(response.id),
      externalReference: typeof response.external_reference === 'string' ? response.external_reference : undefined,
      amount: response.transaction_amount !== undefined ? String(response.transaction_amount) : undefined,
      currency: typeof response.currency_id === 'string' ? response.currency_id : undefined,
      status: typeof response.status === 'string' ? response.status : 'pending',
      raw: response,
    };
  }

  async cancelPayment(reference: string): Promise<void> {
    await this.request(`/v1/payments/${encodeURIComponent(reference)}`, { method: 'PUT', body: JSON.stringify({ status: 'cancelled' }) });
  }

  async refundPayment(reference: string, amount?: string): Promise<void> {
    const body = amount ? { amount: Number(amount) } : {};
    await this.request(`/v1/payments/${encodeURIComponent(reference)}/refunds`, { method: 'POST', body: JSON.stringify(body) });
  }

  verifyWebhook(input: { xSignature?: string; xRequestId?: string; dataId?: string }): boolean {
    if (!input.xSignature || !input.xRequestId || !input.dataId) return false;
    const parts = new Map(input.xSignature.split(',').map((part) => {
      const [key, ...value] = part.trim().split('=');
      return [key, value.join('=')];
    }));
    const ts = parts.get('ts');
    const v1 = parts.get('v1');
    if (!ts || !v1) return false;
    const manifest = `id:${input.dataId};request-id:${input.xRequestId};ts:${ts};`;
    const expected = createHmac('sha256', this.webhookSecret).update(manifest).digest('hex');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const receivedBuffer = Buffer.from(v1, 'utf8');
    return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
  }

  private async createPix(input: CreateProviderPaymentInput): Promise<ProviderPaymentResult> {
    const response = await this.request('/v1/payments', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': input.idempotencyKey },
      body: JSON.stringify({
        transaction_amount: Number(input.amount),
        description: input.description.slice(0, 255),
        payment_method_id: 'pix',
        external_reference: input.externalReference,
        notification_url: input.notificationUrl,
        date_of_expiration: input.expiresAt?.toISOString(),
        payer: { email: input.payerEmail ?? 'cliente@chama.local' },
      }),
    });
    const data = this.record(response.point_of_interaction);
    const transaction = this.record(data.transaction_data);
    return {
      providerReference: String(response.id),
      status: String(response.status ?? 'pending'),
      paymentUrl: typeof transaction.ticket_url === 'string' ? transaction.ticket_url : undefined,
      pixCopyPaste: typeof transaction.qr_code === 'string' ? transaction.qr_code : undefined,
      pixQrCodeBase64: typeof transaction.qr_code_base64 === 'string' ? transaction.qr_code_base64 : undefined,
      raw: response,
    };
  }

  private async createPaymentLink(input: CreateProviderPaymentInput): Promise<ProviderPaymentResult> {
    const response = await this.request('/checkout/preferences', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': input.idempotencyKey },
      body: JSON.stringify({
        external_reference: input.externalReference,
        notification_url: input.notificationUrl,
        expires: Boolean(input.expiresAt),
        expiration_date_to: input.expiresAt?.toISOString(),
        items: [{ title: input.description.slice(0, 256), quantity: 1, unit_price: Number(input.amount), currency_id: input.currency }],
      }),
    });
    return {
      providerReference: String(response.id),
      status: 'pending',
      paymentUrl: typeof response.init_point === 'string' ? response.init_point : typeof response.sandbox_init_point === 'string' ? response.sandbox_init_point : undefined,
      raw: response,
    };
  }

  private async request(path: string, init: RequestInit): Promise<Record<string, unknown>> {
    const response = await fetch(`https://api.mercadopago.com${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.accessToken}`, Accept: 'application/json', 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
    const text = await response.text();
    let body: Record<string, unknown> = {};
    try { body = text ? JSON.parse(text) as Record<string, unknown> : {}; } catch { body = { raw: text }; }
    if (!response.ok) throw new ServiceUnavailableException({ message: 'Falha no provedor de pagamento.', provider: this.name, status: response.status, code: body.code });
    return body;
  }

  private record(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }
}