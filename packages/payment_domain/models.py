"""Canonical PaymentOps domain models.

The canonical internal payment model is the single, deterministic representation that all
mappings converge to (ADR-004). These are *data* models (pydantic v2). Persistence is a
separate concern (see apps/api db models).

PRINCIPLES
----------
- ``PaymentMessage`` is the in-memory canonical form. The product never depends internally
  on raw XML structures; pacs.008 is just one adapter.
- Original source values are always preserved. ``FieldValue`` distinguishes ``original``
  from ``normalized`` and records provenance (``source_path``, ``status``).
- Models are immutable-or-treated-immutably (use ``model_copy`` / frozen where appropriate).
- Financial/identity fields are redacted in repr/log output (rules #1/#13).
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
    XML_PACS_009 = "xml_pacs_009"
    XML_PAIN_001 = "xml_pain_001"
    JSON = "json"
    CSV = "csv"
    API = "api"
    UNKNOWN = "unknown"


class MessageType(StrEnum):
    PACS_008 = "pacs.008"
    UNKNOWN = "unknown"


class AddressReadiness(StrEnum):
    """Deterministic address-readiness state (evidence-based, not a numeric confidence)."""

    READY = "READY"  # required structured fields already valid
    REPAIRABLE = "REPAIRABLE"  # missing fields, reliable candidate derivable
    REVIEW_REQUIRED = "REVIEW_REQUIRED"  # candidate exists but evidence insufficient
    UNRESOLVED = "UNRESOLVED"  # cannot be determined safely


class EvidenceLevel(StrEnum):
    """Uncalibrated evidence strength. Not a probability."""

    HIGH = "HIGH"  # deterministic / schema / rule-derived
    MEDIUM = "MEDIUM"  # single reliable provider signal
    LOW = "LOW"  # ambiguous / multiple conflicting signals


class FieldOrigin(StrEnum):
    SOURCE = "SOURCE"  # as received
    NORMALIZED = "NORMALIZED"  # deterministic normalization
    REPAIRED = "REPAIRED"  # proposed repair candidate


class FieldStatus(StrEnum):
    ORIGINAL = "ORIGINAL"
    NORMALIZED = "NORMALIZED"
    REPAIRED = "REPAIRED"


class CandidateStatus(StrEnum):
    PROPOSED = "PROPOSED"  # a repair candidate, not yet validated
    VALIDATED = "VALIDATED"  # schema + rules both pass
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    UNRESOLVED = "UNRESOLVED"


# Financial/identity fields that must never surface in logs or repr output.
_PII_AND_FINANCIAL_FIELDS = {
    "account_number",
    "iban",
    "debtor_account",
    "creditor_account",
    "debtor_name",
    "creditor_name",
    "amount",
    "amount_minor",
    "currency",
    "address",
    "street_name",
    "building_number",
    "postcode",
    "town_name",
    "country",
    "country_name",
    "bic",
    "swift",
    "payload",
    "raw_payload",
    "account",
    "debtor",
    "creditor",
    "financial_institution",
}

_REDACTED = "[REDACTED]"


class PydanticWithRedaction(BaseModel):
    """Base model whose repr redacts financial/identity fields by default."""

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


class FieldValue(PydanticWithRedaction):
    """A single field value carrying original + normalized evidence and provenance.

    ``original`` is immutable source evidence (ADR-006). ``normalized`` is a deterministic
    derivation. ``status`` records whether the value is original, normalized, or a repair
    candidate. ``source_path`` is the XML path it came from (for diff/audit).
    """

    original: Any = None
    normalized: Any = None
    status: FieldStatus = FieldStatus.ORIGINAL
    source_path: str | None = None

    @property
    def value(self) -> Any:
        return self.normalized if self.normalized is not None else self.original


class MonetaryAmount(PydanticWithRedaction):
    """A monetary value. ``amount_minor`` is integer minor units."""

    amount_minor: int = 0
    currency: str = Field(default="EUR", min_length=3, max_length=3)


class PostalAddress(PydanticWithRedaction):
    """A postal address in ISO 20022 PostalAddress24 terms.

    Preserves original evidence via ``original_fields``/``address_lines`` and records the
    deterministic normalization result in the structured fields and ``normalized_fields``.
    Never overwrites original values.
    """

    street_name: str | None = None
    building_number: str | None = None
    postcode: str | None = None
    town_name: str | None = None
    country: str | None = None  # ISO 3166-1 alpha-2 code (normalized)
    country_name: str | None = None  # original full country name if provided
    address_lines: list[str] = Field(default_factory=list)  # as-provided AdrLine values

    # Provenance / analysis
    source_path: str | None = None
    readiness: AddressReadiness = AddressReadiness.UNRESOLVED
    evidence_level: EvidenceLevel = EvidenceLevel.LOW
    original_fields: dict[str, str] = Field(default_factory=dict)
    normalized_fields: dict[str, str] = Field(default_factory=dict)

    def to_field_value(self, name: str) -> FieldValue | None:
        """Return a FieldValue for a structured field, if any evidence exists."""
        if name not in self.original_fields and not getattr(self, name, None):
            return None
        return FieldValue(
            original=self.original_fields.get(name),
            normalized=getattr(self, name, None),
            status=FieldStatus.NORMALIZED
            if name in self.normalized_fields
            else FieldStatus.ORIGINAL,
        )


class Account(PydanticWithRedaction):
    """An account (IBAN or other)."""

    iban: str | None = None
    other_identification: str | None = None
    currency: str | None = None
    name: str | None = None
    source_path: str | None = None


class FinancialInstitution(PydanticWithRedaction):
    """A financial institution (agent)."""

    bic: str | None = None
    clearing_system_member: str | None = None
    name: str | None = None
    postal_address: PostalAddress | None = None
    source_path: str | None = None


class Party(PydanticWithRedaction):
    """A party in a payment. Identity fields are redacted in repr/logs."""

    name: str | None = None
    identification: list[str] = Field(default_factory=list)
    postal_address: PostalAddress | None = None
    account: Account | None = None
    financial_institution: FinancialInstitution | None = None
    source_path: str | None = None


class RemittanceInformation(PydanticWithRedaction):
    """Remittance information (unstructured lines + reference)."""

    unstructured: list[str] = Field(default_factory=list)
    reference: str | None = None
    source_path: str | None = None


class PaymentTransaction(PydanticWithRedaction):
    """A single credit transfer transaction within a message."""

    instruction_id: str | None = None
    end_to_end_id: str | None = None
    transaction_id: str | None = None
    amount: MonetaryAmount | None = None
    debtor: Party | None = None
    creditor: Party | None = None
    debtor_account: Account | None = None
    creditor_account: Account | None = None
    debtor_agent: FinancialInstitution | None = None
    creditor_agent: FinancialInstitution | None = None
    remittance: RemittanceInformation | None = None
    requested_execution_date: datetime | None = None
    source_path: str | None = None

    @property
    def debtor_name(self) -> str | None:
        return self.debtor.name if self.debtor else None

    @property
    def creditor_name(self) -> str | None:
        return self.creditor.name if self.creditor else None


class PaymentMessage(PydanticWithRedaction):
    """The canonical representation of a complete inbound payment message.

    ``message_type`` is a fully-qualified identifier such as ``pacs.008.001.08``. The
    canonical form is independent of the source XML representation.
    """

    message_type: str | None = None
    message_id: str | None = None
    creation_datetime: datetime | None = None
    transactions: list[PaymentTransaction] = Field(default_factory=list)

    # Provenance / analysis metadata
    source_format: SourceFormat = SourceFormat.UNKNOWN
    received_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    validation_status: ValidationStatus = ValidationStatus.PENDING
    ruleset_version: str | None = None
    address_provider: str | None = None
    address_provider_version: str | None = None
    source_metadata: dict[str, str] = Field(default_factory=dict)


# Backwards-compatible Week 1 envelope kept for the existing domain/masking tests.
class PaymentEnvelope(PydanticWithRedaction):
    """Week 1 compatibility envelope. See ``PaymentMessage`` for the canonical form."""

    payment_id: str | None = None
    source_format: SourceFormat = SourceFormat.UNKNOWN
    received_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    raw_payload: Any | None = None
    intent: PaymentIntent = PaymentIntent.UNSPECIFIED
    debtor: Party | None = None
    creditor: Party | None = None
    amount: MonetaryAmount | None = None
    validation_status: ValidationStatus = ValidationStatus.PENDING


# --------------------------------------------------------------------------- Week 5 lifecycle


class LifecycleEventType(StrEnum):
    """PaymentOps analytical lifecycle event categories (not raw ISO codes)."""

    INITIATED = "INITIATED"
    INTERBANK_TRANSFER = "INTERBANK_TRANSFER"
    FI_TRANSFER = "FI_TRANSFER"
    STATUS_RECEIVED = "STATUS_RECEIVED"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    UNKNOWN_STATUS = "UNKNOWN_STATUS"


class PaymentStatus(StrEnum):
    """Normalized PaymentOps analytical status (never a raw ISO code)."""

    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    PARTIALLY_ACCEPTED = "PARTIALLY_ACCEPTED"
    UNKNOWN = "UNKNOWN"


class CorrelationStatus(StrEnum):
    """Deterministic lifecycle-correlation result (Task 16)."""

    CORRELATED = "CORRELATED"
    POSSIBLE_CORRELATION = "POSSIBLE_CORRELATION"
    UNRESOLVED = "UNRESOLVED"
    CONFLICT = "CONFLICT"
    AMBIGUOUS = "AMBIGUOUS"


class StatusReason(PydanticWithRedaction):
    """A status reason code with provenance. Never inferred as legal/compliance meaning."""

    code: str | None = None
    proprietary_code: str | None = None
    additional_information: str | None = None
    originator: str | None = None
    normalized_category: str | None = None


class RelatedPaymentReference(PydanticWithRedaction):
    """A reference to a related payment message (for correlation)."""

    message_id: str | None = None
    message_definition: str | None = None
    message_version: str | None = None
    instruction_id: str | None = None
    end_to_end_id: str | None = None
    transaction_id: str | None = None
    amount: MonetaryAmount | None = None
    uetr: str | None = None


class TransactionStatus(PydanticWithRedaction):
    """A single transaction-level status within a pacs.002 status report."""

    original_instruction_id: str | None = None
    original_end_to_end_id: str | None = None
    original_transaction_id: str | None = None
    raw_iso_status: str | None = None
    normalized_status: PaymentStatus = PaymentStatus.UNKNOWN
    reasons: list[StatusReason] = Field(default_factory=list)
    amount: MonetaryAmount | None = None
    reference: RelatedPaymentReference | None = None


class LifecycleStatusReport(PydanticWithRedaction):
    """Canonical representation of a pacs.002 status report (NOT a PaymentMessage).

    This is a status report, not a payment instruction. Never forced into a fake transaction.
    """

    message_family: str | None = None
    message_definition: str | None = None
    message_version: str | None = None
    namespace: str | None = None
    message_id: str | None = None
    creation_datetime: datetime | None = None

    original_message_id: str | None = None
    original_message_definition: str | None = None
    group_status_raw: str | None = None
    group_status: PaymentStatus = PaymentStatus.UNKNOWN

    transaction_statuses: list[TransactionStatus] = Field(default_factory=list)

    @property
    def referenced_references(self) -> list[RelatedPaymentReference]:
        refs: list[RelatedPaymentReference] = []
        for tx in self.transaction_statuses:
            if tx.reference is not None:
                refs.append(tx.reference)
        return refs


class PaymentLifecycleEvent(PydanticWithRedaction):
    """A single analytical event in a payment lifecycle (metadata, not executable state)."""

    event_type: LifecycleEventType = LifecycleEventType.STATUS_RECEIVED
    message_family: str | None = None
    message_definition: str | None = None
    message_version: str | None = None
    message_id: str | None = None
    timestamp: datetime | None = None
    status: PaymentStatus = PaymentStatus.UNKNOWN
    raw_status_code: str | None = None
    reasons: list[StatusReason] = Field(default_factory=list)
    correlation_evidence: list[str] = Field(default_factory=list)
    source_hash: str | None = None


class PaymentLifecycle(PydanticWithRedaction):
    """Analytical payment lifecycle state (NOT a real executable payment state machine)."""

    lifecycle_id: str
    organization_id: str
    primary_reference: str | None = None
    end_to_end_id: str | None = None
    instruction_id: str | None = None
    transaction_id: str | None = None
    uetr: str | None = None
    original_message_id: str | None = None
    amount: MonetaryAmount | None = None
    debtor: Party | None = None
    creditor: Party | None = None
    events: list[PaymentLifecycleEvent] = Field(default_factory=list)
    current_status: PaymentStatus = PaymentStatus.UNKNOWN
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


def utcnow() -> datetime:
    return datetime.now(UTC)
