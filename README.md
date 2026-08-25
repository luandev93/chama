# CHAMA

Backend-first foundation for the CHAMA platform: multi-tenant inventory, orders, payments, delivery and WhatsApp commerce.

## Security baseline

- Tenant context is explicit and mandatory for protected domain operations.
- Input validation is centralized.
- Security headers, rate limiting and CORS allowlists are enforced at the API edge.
- Secrets are loaded from environment variables and never committed.
- Audit logging is append-only by application policy.
- Domain writes are designed to be idempotent.

See `docs/ARCHITECTURE.md` and `docs/SECURITY.md`.
