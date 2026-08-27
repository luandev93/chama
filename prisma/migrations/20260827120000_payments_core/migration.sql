CREATE TYPE "PaymentProvider" AS ENUM ('MERCADO_PAGO', 'MANUAL');
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'PAYMENT_LINK', 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'VOUCHER');
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'EXPIRED');

CREATE TABLE "PaymentIntent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "amount" DECIMAL(14,4) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
  "method" "PaymentMethod" NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "providerReference" TEXT,
  "externalReference" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "paymentUrl" TEXT,
  "pixCopyPaste" TEXT,
  "pixQrCodeBase64" TEXT,
  "cashReceived" DECIMAL(14,4),
  "changeAmount" DECIMAL(14,4),
  "expiresAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "refundedAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaymentIntent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PaymentIntent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PaymentIntent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PaymentIntent_tenant_store_idempotency_key" ON "PaymentIntent"("tenantId", "storeId", "idempotencyKey");
CREATE UNIQUE INDEX "PaymentIntent_externalReference_key" ON "PaymentIntent"("externalReference");
CREATE UNIQUE INDEX "PaymentIntent_provider_providerReference_key" ON "PaymentIntent"("provider", "providerReference") WHERE "providerReference" IS NOT NULL;
CREATE INDEX "PaymentIntent_orderId_status_idx" ON "PaymentIntent"("orderId", "status");
CREATE INDEX "PaymentIntent_tenantId_storeId_status_createdAt_idx" ON "PaymentIntent"("tenantId", "storeId", "status", "createdAt");

CREATE TABLE "PaymentAttempt" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "paymentIntentId" UUID NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "providerReference" TEXT,
  "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
  "amount" DECIMAL(14,4) NOT NULL,
  "requestId" TEXT,
  "failureCode" TEXT,
  "failureMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaymentAttempt_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PaymentAttempt_paymentIntentId_createdAt_idx" ON "PaymentAttempt"("paymentIntentId", "createdAt");

CREATE TABLE "PaymentWebhookEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "provider" "PaymentProvider" NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "paymentReference" TEXT,
  "payload" JSONB NOT NULL,
  "signatureValid" BOOLEAN NOT NULL,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaymentWebhookEvent_provider_providerEventId_key" ON "PaymentWebhookEvent"("provider", "providerEventId");