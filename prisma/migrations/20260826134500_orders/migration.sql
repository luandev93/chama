CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "OrderOrigin" AS ENUM ('POS', 'WHATSAPP', 'WEB', 'MANUAL');
CREATE TYPE "OrderType" AS ENUM ('PICKUP', 'DELIVERY');

CREATE TABLE "Order" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
  "origin" "OrderOrigin" NOT NULL,
  "type" "OrderType" NOT NULL DEFAULT 'PICKUP',
  "customerName" TEXT,
  "customerPhone" TEXT,
  "subtotal" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "deliveryFee" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "discountAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "expiresAt" TIMESTAMPTZ,
  "confirmedAt" TIMESTAMPTZ,
  "cancelledAt" TIMESTAMPTZ,
  "createdBy" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Order_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "OrderItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "productName" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "quantity" DECIMAL(14,3) NOT NULL,
  "unitPrice" DECIMAL(14,4) NOT NULL,
  "lineTotal" DECIMAL(14,4) NOT NULL,
  "reservationId" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "OrderItem_orderId_productId_key" ON "OrderItem"("orderId", "productId");
CREATE INDEX "Order_tenantId_storeId_status_createdAt_idx" ON "Order"("tenantId", "storeId", "status", "createdAt");
CREATE INDEX "Order_tenantId_customerPhone_createdAt_idx" ON "Order"("tenantId", "customerPhone", "createdAt");
CREATE INDEX "Order_expiresAt_status_idx" ON "Order"("expiresAt", "status");
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");
