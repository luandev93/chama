# CHAMA Backend Architecture

CHAMA is being built backend-first as a modular NestJS application.

## Initial boundaries
- `core`: configuration, security, tenancy, idempotency, audit and events.
- `catalog`: canonical product identity and commercial metadata.
- `inventory`: immutable movements, balances and reservations.
- future modules: ingestion, orders, sales, payments, deliveries and WhatsApp.

## Invariants
1. Protected business operations execute inside tenant context.
2. Client transport is not the final authority for tenant identity.
3. Stock changes occur through movements, never arbitrary balance writes.
4. External integrations enter through adapters.
5. API writes must become idempotent before payment, OCR and webhook integrations are introduced.
6. WhatsApp price and availability answers must come from authoritative backend queries at response time.

## Delivery order
Foundation -> Auth/RBAC -> Audit/Idempotency -> Catalog -> Inventory -> Ingestion -> Orders/Sales -> Payments -> Delivery -> CHAMA ZAP.
