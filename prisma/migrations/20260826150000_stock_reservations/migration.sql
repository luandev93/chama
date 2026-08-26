CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'CONFIRMED', 'RELEASED', 'EXPIRED', 'CANCELLED');

CREATE TABLE "StockReservation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "quantity" DECIMAL(14,3) NOT NULL,
  "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
  "reference" TEXT,
  "expiresAt" TIMESTAMPTZ,
  "createdBy" UUID,
  "releasedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockReservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StockReservation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StockReservation_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StockReservation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StockReservation_quantity_positive" CHECK ("quantity" > 0)
);
CREATE INDEX "StockReservation_tenantId_storeId_productId_status_idx" ON "StockReservation"("tenantId", "storeId", "productId", "status");
CREATE INDEX "StockReservation_expiresAt_status_idx" ON "StockReservation"("expiresAt", "status");
