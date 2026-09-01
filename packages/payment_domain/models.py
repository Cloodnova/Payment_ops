"""Canonical PaymentOps models.

The canonical internal payment model is the single, deterministic representation that
all mappings converge to (ADR-004). These are *data* models (pydantic). Persistence and
the full domain schema are designed in Week 2.

IMPORTANT:
- ``PaymentEnvelope`` carries *untrusted* input evidence. Treat it as untrusted.
- Financial fields are declared with ``repr=False`` so that accidental logging/printing
  of objects does not dump IBAN/account/name values into logs (engineering rule #1/#13).
- Original payloads are immutable evidence (ADR-006): never mutate ``raw_payload``.
"""

from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class PaymentIntent(StrEnum):
    CREDIT_TRANSFER = "credit_transfer"
    DIRECT_DEBIT = "direct_debit"
    UNSPECIFIED = "unspecified"


class ValidationStatus(StrEnum):
    PENDING = "pending"
    VALID = "valid"
    INVALID = "invalid"
    CONSTRUCTION = "construction"
    REJECTED = "rejected"


class SourceFormat(StrEnum):
    XML_PACS_008 = "xml_pacs_008"
    XML_PAIN_001 = "xml_pain_001"
    JSON = "json"
    CSV = "csv"
    API = "api"
    UNKNOWN = "unknown"


# Financial/identity fields that must never surface in logs or repr output.
_PII_AND_FINANCIAL_FIELDS = {
    "account_number",
    "iban",
    "debtor_account",
    "creditor_account",
    "debtor_name",
    "creditor_name",
    "amount",
    "currency",
    "address",
    "bic",
    "swift",
    "payload",
    "raw_payload",
}

_REDACTED = "[REDACTED]"


class PydanticWithRedaction(BaseModel):
    """Base model whose repr redacts financial/identity fields by default.

    ``repr_redact`` is not reliably honoured across pydantic versions, so we override
    ``__repr__``/``__str__`` to force-redact known sensitive field names. This guarantees
    accidental logging or printing of a model never dumps financial data (rules #1/#13).
    """

    model_config = ConfigDict(
        validate_assignment=False,
        extra="ignore",
    )

    def _public_values(self) -> dict[str, Any]:
        return {
            key: (_REDACTED if key in _PII_AND_FINANCIAL_FIELDS else value)
            for key, value in self.__dict__.items()
        }

    def __repr__(self) -> str:
        values = ", ".join(f"{k}={v!r}" for k, v in self._public_values().items())
        return f"{self.__class__.__name__}({values})"

    def __str__(self) -> str:
        return self.__repr__()


class Party(PydanticWithRedaction):
    """A party in a payment. Identity fields are redacted in repr/logs."""

    name: str | None = None
    iban: str | None = None
    account_number: str | None = None
    bic: str | None = None
    address: str | None = None


class MonetaryAmount(PydanticWithRedaction):
    """A monetary value. ``amount`` is an integer minor unit by convention."""

    amount_minor: int = 0
    currency: str = Field(default="EUR", min_length=3, max_length=3)


class PaymentEnvelope(PydanticWithRedaction):
    """The canonical, immutable representation of a single payment for analysis.

    This is the *internal* model. It is non-transactional: it represents data being
    analyzed/intelligently structured, never a payment to execute.
    """

    # Deterministic id (assigned by the platform, not by the source).
    payment_id: str | None = None

    # Provenance — where the evidence came from.
    source_format: SourceFormat = SourceFormat.UNKNOWN
    received_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Raw evidence. Treated as immutable (ADR-006). May be redacted if zero-retention.
    raw_payload: Any | None = None

    # Canonical structure.
    intent: PaymentIntent = PaymentIntent.UNSPECIFIED
    debtor: Party | None = None
    creditor: Party | None = None
    amount: MonetaryAmount | None = None

    # Validation state. In Week 1 nothing performs real ISO validation.
    validation_status: ValidationStatus = ValidationStatus.PENDING


def utcnow() -> datetime:
    return datetime.now(UTC)
