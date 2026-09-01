# CloudNova PaymentOps — Architecture Overview

This is the Week 1 (Phase 1) baseline architecture. It establishes a foundation that later
phases build on without a rewrite. It deliberately implements **no** payment-processing
logic.

## Purpose

CloudNova PaymentOps is a **non-transactional** payment-data intelligence platform. It
analyses, validates, structures, and auditable-corrects inbound payment data. It never
executes or authorizes payments.

## Logical pipeline (target)

```
Bank input (XML/JSON/CSV/API)
   └→ mapping_engine → canonical model (packages/payment_domain)
        └→ iso_engine    (deterministic ISO 20022 validation)
             └→ rules_engine (bank-specific, via integration profiles)
                  └→ address_engine (intelligence)
                       └→ matching_engine (fuzzy/entity analysis)
                            └→ AI explanations (optional, NON-authoritative)
                                 └→ candidate repair
                                      └→ deterministic re-validation
                                           └→ human review
                                                └→ corrected output + report + audit
```

Only the **boundaries** for most of these exist in Week 1 (see `packages/`).

## Components

| Component | Tech | Location |
|-----------|------|----------|
| API        | FastAPI (ASGI / uvicorn) | `apps/api` |
| Web UI     | Next.js + React + TypeScript | `apps/web` |
| Worker     | Celery (Redis broker) | `apps/worker` |
| Shared libs| Python packages | `packages/*` |
| Database   | PostgreSQL (SQLAlchemy 2 + Alembic) | via `apps/api` |
| Cache/queue| Redis | via worker/API config |

## Modular monolith (ADR-001)

The application is a **modular monolith**, not a microservices fleet. Shared logic lives in
installable Python packages (`packages/`); command/query entrypoints are thin
(`apps/api`, `apps/worker`). Cross-cutting concerns are clean boundaries, not network calls.

## Canonical payment model (ADR-004)

`packages/payment_domain` defines the canonical internal representation. All input mappings
converge onto it. It is a pydantic model whose repr/log output is redacted for financial
fields.

## AI is non-authoritative (ADR-005)

`packages/ai_gateway` defines a provider abstraction (Ollama / vLLM / customer-approved).
AI may only produce **suggestions** for human review. Deterministic validation is the
single source of truth, and the platform is fully usable with AI disabled (`AI_ENABLED=false`).

## Observability

- `GET /metrics` exposes Prometheus metrics (request count, status bucket, duration, service
  version). Labels are low-cardinality and never derived from payloads or identifiers.
- Structured JSON logging with redaction (see `docs/security/security-principles.md`).
- No new Prometheus/Grafana/Loki are introduced in Week 1; a later phase integrates with
  the existing cluster monitoring.

## Security model

See `docs/security/security-principles.md`. Highlights: non-root containers, no embedded
secrets, restrictive CORS/headers, generic error responses with correlation ids, and no
payload data in logs.

## Deployment & GitOps

The application deploys to a Kubernetes cluster managed by **Flux GitOps**. The GitOps
manifests live in the **homeserver** repository, following the existing CloudNova
conventions (Envoy Gateway `public-gateway`, `base/` + `overlays/<env>` layout, hardened
pods with explicit requests/limits and probes).

Logical environments: `paymentops-dev`, `paymentops-test`, `paymentops-demo`. There is no
`paymentops-prod` yet.

## Current cluster limitations (Week 1, honest)

The `loudnova` cluster is a **single-node K3s** with 2 vCPU and ~5.2 GiB memory, already
over-committed on resource limits. Consequences:

- Multiple replicas of stateless services provide **process-level** redundancy and
  rolling-update safety, **not** infrastructure HA (no node failover).
- Capacity is constrained: requests are sized conservatively; a single environment
  (`paymentops-dev`) is deployed in Week 1.
- There is no existing Prometheus/Grafana/Loki stack to scrape `/metrics`; the endpoint is
  ready for when one is added.

## Deferred to later phases

Full pacs.008 parsing, XSD business validation, Swift address structuring, full address
repair, fuzzy reconciliation, the bank Integration Studio UI, AI explanation logic, payment
execution, SWIFT connectivity, sanctions/AML decisioning, large batch processing, custom ML
models, Kafka, and IBM MQ.
