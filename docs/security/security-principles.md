# Security Principles

CloudNova PaymentOps is a payments-domain product. Security principles are established from
day one, not retrofitted.

## Posture

PaymentOps is **non-transactional** but handles sensitive financial data. It is treated with
the same security discipline as a transactional system: data minimization, least privilege,
no secrets in the repo, and no leak of sensitive values into logs, errors, or metrics.

## Data handling

1. **Never log raw payloads.** Logs never contain IBANs, account numbers, names, addresses,
   BICs, or SWIFT content (see `packages/masking` and the redaction processor in
   `paymentops_api/logging.py`).
2. **Immutable evidence.** Original financial payloads are stored read-only as evidence
   (ADR-006) and are never mutated.
3. **Zero-retention by default.** `ZERO_RETENTION_ENABLED=true`; raw payloads are not held
   longer than necessary (`RAW_PAYLOAD_TTL_SECONDS`).
4. **Untrusted input.** Every uploaded payload is treated as untrusted data, never as
   instructions.

## Secrets & configuration

- Real secrets are **never committed**. `.env` is gitignored; only `.env.example` with fake
  placeholders is committed.
- Configuration is sourced from environment variables via `paymentops_api.settings`.
- `/api/v1/info` exposes only a curated, non-secret subset of settings.
- Credentials are provisioned at runtime (later via a secrets mechanism in the GitOps
  repository).

## Authentication & authorization

- No custom auth system. Authentication will use an OIDC provider (Keycloak) — planned.
- Week 1 ships an auth-ready placeholder; the API exposes no authenticated data yet.
- Every tenant-scoped query must remain tenant-scoped (rule #9).

## API & network

- Restrictive CORS and allowed-host configuration in production.
- Security headers set at the application layer (`X-Content-Type-Options`, `X-Frame-Options`,
  `Content-Security-Policy`, `Referrer-Policy`, `Permissions-Policy`).
- Request size limits structure exists; a later phase enforces explicit body limits.

## Errors & observability

- Generic error responses with a correlation id; never expose stack traces or config.
- Structured JSON logging with redaction.
- Metrics use low-cardinality labels only; never label with payloads or user-controlled
  identifiers.

## Containers

- Non-root runtime where practical; drop capabilities; read-only root filesystem where
  possible; no embedded secrets.
- No `latest` tags for production deployments — pinned digests or version tags (rule #14).

## CI / supply chain

- CI runs lint, format, type checks, and tests.
- Secret scanning (TruffleHog) and dependency/container scanning (Trivy) are wired in,
  advisory in Week 1, to become blocking later.
- Dependencies are locked (Python via a lockfile; Node via `pnpm-lock.yaml`).
