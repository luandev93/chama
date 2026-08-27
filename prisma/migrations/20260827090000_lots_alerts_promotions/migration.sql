CREATE TYPE "LotTrackingPolicy" AS ENUM ('NONE', 'OPTIONAL', 'REQUIRED');
CREATE TYPE "ProductLotStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'EXHAUSTED', 'EXPIRED');
CREATE TYPE "PromotionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED');

ALTER TABLE "Store" ADD COLUMN "lotTrackingPolicy" "LotTrackingPolicy", ADD COLUMN "minimumQty" DECIMAL(14,3), ADD COLUMN "maximumQty" DECIMAL(14,3), ADD COLUMN "reorderPoint" DECIMAL(14,3);
ALTER TABLE "ProductCategory" ADD COLUMN "lotTrackingPolicy" "LotTrackingPolicy", ADD COLUMN "minimumQty" DECIMAL(14,3), ADD COLUMN "maximumQty" DECIMAL(14,3), ADD COLUMN "reorderPoint" DECIMAL(14,3);
ALTER TABLE "ProductSection" ADD COLUMN "lotTrackingPolicy" "LotTrackingPolicy", ADD COLUMN "minimumQty" DECIMAL(14,3), ADD COLUMN "maximumQty" DECIMAL(14,3), ADD COLUMN "reorderPoint" DECIMAL(14,3);
ALTER TABLE "Product" ADD COLUMN "lotTrackingPolicy" "LotTrackingPolicy", ADD COLUMN "minimumMarginPercent" DECIMAL(7,4);
ALTER TABLE "ProductStore" ADD COLUMN "lotTrackingPolicy" "LotTrackingPolicy";
ALTER TABLE "StockMovement" ADD COLUMN "lotId" UUID;

CREATE TABLE "ProductLot" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "quantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
  "reservedQuantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
  "costPrice" DECIMAL(14,4),
  "status" "ProductLotStatus" NOT NULL DEFAULT 'ACTIVE',
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductLot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ProductLot_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ProductLot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ProductLot_non_negative" CHECK ("quantity" >= 0 AND "reservedQuantity" >= 0 AND "quantity" >= "reservedQuantity")
);
CREATE UNIQUE INDEX "ProductLot_storeId_productId_code_key" ON "ProductLot"("storeId", "productId", "code");
CREATE INDEX "ProductLot_tenantId_storeId_productId_status_expiresAt_idx" ON "ProductLot"("tenantId", "storeId", "productId", "status", "expiresAt");

CREATE TABLE "StockReservationLot" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "reservationId" UUID NOT NULL,
  "lotId" UUID NOT NULL,
  "quantity" DECIMAL(14,3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockReservationLot_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "StockReservation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StockReservationLot_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "ProductLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "StockReservationLot_reservationId_lotId_key" ON "StockReservationLot"("reservationId", "lotId");
CREATE INDEX "StockReservationLot_lotId_idx" ON "StockReservationLot"("lotId");

CREATE TABLE "OrderItemLot" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderItemId" UUID NOT NULL,
  "lotId" UUID NOT NULL,
  "quantity" DECIMAL(14,3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderItemLot_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrderItemLot_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "ProductLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OrderItemLot_orderItemId_lotId_key" ON "OrderItemLot"("orderItemId", "lotId");

CREATE TABLE "Promotion" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "lotId" UUID,
  "title" TEXT NOT NULL,
  "status" "PromotionStatus" NOT NULL DEFAULT 'ACTIVE',
  "promotionalPrice" DECIMAL(14,4),
  "percentOff" DECIMAL(7,4),
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Promotion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Promotion_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Promotion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Promotion_tenantId_storeId_productId_status_startsAt_endsAt_idx" ON "Promotion"("tenantId", "storeId", "productId", "status", "startsAt", "endsAt");
CREATE INDEX "Promotion_lotId_idx" ON "Promotion"("lotId");
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "ProductLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "StockMovement_lotId_idx" ON "StockMovement"("lotId");
