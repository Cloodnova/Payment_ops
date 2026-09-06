# ISO 20022 Support Roadmap

This document records the planned sequence of ISO 20022 message support. It is a **roadmap
only** — later messages are NOT implemented yet and this document must never claim they are.

## Architecture

`iso_engine/registry.py` defines `IsoMessageRegistry`, which maps a fully-qualified message
identifier / namespace to its parser adapter and canonical mapper. The core engine works on the
canonical `PaymentMessage` and is independent of any particular message. Adding a new message
requires registering a new adapter; it does not require changing the core engine.

Each supported message records explicit metadata (`MessageDefinition`):
`message_family`, `message_definition`, `version`, `namespace`, `adapter_version`.

Unsupported versions fail with a clear `UnsupportedMessageError` — never silently parsed.

## Current support

| Message | Version | Status |
|---------|---------|--------|
| pacs.008 | 001.08 | **Supported** (parser + XSD validation + canonical mapper) |

## Planned sequence (v1)

1. pacs.008 — **done**
2. pain.001 — planned
3. pacs.002 — planned
4. pacs.009 — planned
5. camt.053 — planned
6. camt.054 — planned

## Constraints

- Week 4 is **not** an ISO-expansion week. Only the registry/foundation was added.
- Do not begin full `pain.001`/`pacs.002`/`pacs.009`/`camt.*` adapters unless required for a
  minimal architecture test.
- No claim of support for messages not listed under "Current support".
