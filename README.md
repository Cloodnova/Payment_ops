# CloudNova PaymentOps

CloudNova PaymentOps is a **non-transactional payment-data intelligence platform**. It
ingests bank XML / JSON / CSV / API payloads, maps them to a canonical internal model, and
performs deterministic ISO 20022 validation, bank-specific rules, address intelligence,
fuzzy/entity analysis, optional (non-authoritative) AI explanation, candidate repair, and
human review — producing corrected output, reports, and an auditable trail.

## What PaymentOps is

- A payment **data intelligence** and **analytics/repair** platform.
- Deterministic validation with a canonical internal payment model.
- Designed for human-in-the-loop review and auditable correction.
- Able to run with generative AI **completely disabled**.

## What PaymentOps is **not**

- It does **not** initiate, authorize, send, or settle payments.
- It does **not** connect directly to settlement systems or release SWIFT messages.
- It does **not** make sanctions/AML clearance decisions.
- It is not a transaction execution or payments-rail system.

> PaymentOps is non-transactional. It does not execute or authorize payments.

## Architecture

The application is a **modular monolith** (ADR-001). Components are separated into
installable Python packages and app entrypoints rather than microservices:

```
apps/api      FastAPI HTTP API (ASGI, uvicorn)
apps/web      Next.js + TypeScript frontend
apps/worker   Celery + Redis background worker
packages/     Shared, reusable domain + engine boundaries
```

`packages/` contains the canonical payment model (`payment_domain`) and the boundaries for
later engines (`iso_engine`, `rules_engine`, `address_engine`, `mapping_engine`,
`matching_engine`, `ai_gateway`, `masking`, `audit`). See `docs/architecture/overview.md`
for detail. Architectural decision records live in `docs/adr/`.

## Local development

Backend (Python 3.12+):

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -e ".[dev]"
# copy local config
copy .env.example .env
# run the API
uvicorn paymentops_api.main:app --host 0.0.0.0 --port 8000
```

Frontend (Node 22+ / pnpm):

```powershell
cd apps/web
pnpm install
pnpm dev    # http://localhost:3000
```

Full stack via Docker Compose (PostgreSQL, Redis, API, worker, web):

```powershell
docker compose up --build
```

## Tests

Backend:

```powershell
pytest                     # unit + integration
ruff check . && ruff format --check .
mypy
```

Frontend:

```powershell
cd apps/web
pnpm lint
pnpm typecheck
pnpm build
```

## Environment variables

Configuration is read from the environment (and an optional `.env` in development). See
`.env.example`. **Never commit `.env` or real credentials.** All secrets are placeholders
there.

## Repository layout

```
apps/                api, web, worker
packages/            shared Python packages (payment_domain, iso_engine, rules_engine,
                     address_engine, repair_engine, analysis, mapping_engine, ...)
schemas/             bundled ISO 20022 subset schemas (schemas/iso20022/...)
rules/               reserved (configuration-driven bank rules)
tests/               unit, integration, security, regression, fixtures
docs/                adr, architecture, security
deploy/              deployment support
```

## Week 2: analysis vertical slice

The first complete production-quality slice is implemented:

- `POST /api/v1/payments/analyze` — secure pacs.008 XML ingestion, XSD validation, canonical
  mapping, deterministic rule findings, address readiness analysis, CloudNova address
  normalization, repair candidate generation, deterministic re-validation, structured diff,
  and hashes/audit metadata.
- Supported version: **`pacs.008.001.08`** (see `docs/adr/ADR-011`).
- Address providers: `CloudNovaAddressProvider` (default, deterministic) and the isolated
  `SwiftDerivedAddressProvider` (see `docs/adr/ADR-012` and `THIRD_PARTY.md`).
- Repair lifecycle: REPAIR_CANDIDATE -> VALIDATED_CANDIDATE (see `docs/adr/ADR-013`).
- Zero-retention by default: `persist=false` never stores raw XML.

Example:

```json
POST /api/v1/payments/analyze
{ "xml": "<pacs.008.../>", "repair": true, "persist": false }
```

See `docs/architecture/overview.md` for the full flow and `docs/security/security-principles.md`
for XML-security and zero-retention details.

## Kubernetes / GitOps deployment

Deployment targets a Kubernetes cluster managed by **Flux GitOps**, reusing the existing
CloudNova cluster conventions (Envoy Gateway routing, `base/` + `overlays/<env>` layout,
non-root hardened pods, explicit resources and probes). The GitOps overlay lives in the
**homeserver** repository under `clusters/loudnova/apps/paymentops/`. Logical environments:
`paymentops-dev`, `paymentops-test`, `paymentops-demo`. There is **no** `paymentops-prod`
yet. See `docs/architecture/overview.md` for the deployment model and current limitations.

## Week 1 limitations

Week 1 establishes the **foundation only**:

- No ISO/payment-processing logic, no pacs.008 parsing, no XSD validation, no address
  repair, no fuzzy reconciliation, no AI logic.
- Minimal database tables (`organizations`, `app_metadata`) — the real domain schema is
  designed and delivered in Week 2.
- Authentication is a placeholder (Keycloak / OIDC is planned).
- Single-node Kubernetes cluster: multiple replicas provide process-level HA, not
  infrastructure HA.
