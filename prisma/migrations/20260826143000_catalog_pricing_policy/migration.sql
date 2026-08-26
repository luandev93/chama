CREATE TYPE "PricingMode" AS ENUM ('SECTION_DEFAULT', 'CUSTOM_MARKUP', 'DIRECT_SALE_PRICE');

CREATE TABLE "ProductCategory" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ProductCategory_tenantId_slug_key" UNIQUE ("tenantId", "slug")
);
CREATE INDEX "ProductCategory_tenantId_active_name_idx" ON "ProductCategory"("tenantId", "active", "name");

CREATE TABLE "ProductSection" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "categoryId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductSection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductSection_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ProductSection_categoryId_slug_key" UNIQUE ("categoryId", "slug")
);
CREATE INDEX "ProductSection_categoryId_active_name_idx" ON "ProductSection"("categoryId", "active", "name");

CREATE TABLE "SectionPricingPolicy" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "storeId" UUID NOT NULL,
  "sectionId" UUID NOT NULL,
  "markupPercent" DECIMAL(7,4) NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SectionPricingPolicy_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SectionPricingPolicy_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SectionPricingPolicy_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ProductSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SectionPricingPolicy_storeId_sectionId_key" UNIQUE ("storeId", "sectionId")
);
CREATE INDEX "SectionPricingPolicy_storeId_active_idx" ON "SectionPricingPolicy"("storeId", "active");

ALTER TABLE "Product" ADD COLUMN "categoryId" UUID;
ALTER TABLE "Product" ADD COLUMN "sectionId" UUID;
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ProductSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Product_tenantId_categoryId_sectionId_idx" ON "Product"("tenantId", "categoryId", "sectionId");

ALTER TABLE "ProductStore" ADD COLUMN "pricingMode" "PricingMode" NOT NULL DEFAULT 'SECTION_DEFAULT';
ALTER TABLE "ProductStore" ADD COLUMN "markupPercent" DECIMAL(7,4);
ALTER TABLE "ProductStore" ADD COLUMN "grossMarginPercent" DECIMAL(7,4);

UPDATE "ProductStore"
SET "pricingMode" = 'DIRECT_SALE_PRICE'
WHERE "salePrice" IS NOT NULL AND "costPrice" IS NULL;

UPDATE "ProductStore"
SET
  "markupPercent" = ROUND(("salePrice" / "costPrice" - 1) * 100, 4),
  "grossMarginPercent" = ROUND(("salePrice" - "costPrice") / "salePrice" * 100, 4),
  "pricingMode" = 'DIRECT_SALE_PRICE'
WHERE "salePrice" IS NOT NULL AND "costPrice" IS NOT NULL AND "costPrice" > 0;
