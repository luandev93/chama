# CHAMA Security Baseline

## Edge
- Helmet is enabled.
- CORS uses an explicit environment allowlist; no wildcard with credentials.
- DTO validation strips or rejects unexpected input.
- Global rate limiting is enabled.

## Identity and tenancy
- Tenant context is mandatory outside public health checks.
- The current header transport is bootstrap-only. Production identity must derive tenancy from verified signed claims.
- Never authorize a tenant from a client-submitted request body field.

## Secrets and logs
- Secrets are environment-managed and never committed.
- Webhook signatures must be verified before trusting callbacks.
- Logs must not contain access tokens, authorization headers, payment credentials or unnecessary customer data.

## Integrations
- Payment and WhatsApp callbacks require signature verification and idempotency.
- State transitions are server-side.
- LLM tools are constrained commands; no direct database or unrestricted network access.

## Domain integrity
- Stock changes are movement-based.
- Audit history is append-oriented.
- Cross-tenant reads and writes must be denied by default.
