"""Analysis pipeline orchestrator.

Composes the deterministic vertical slice:

    secure parse -> identify -> XSD validate -> canonical map
    -> rules -> address analysis -> repair candidate -> revalidate
    -> structured AnalysisResult

The pipeline is pure/stateless; persistence and hashing are handled by the API service
layer. The XML/XSD validator is authoritative.
"""

from __future__ import annotations

from hashlib import sha256
from uuid import uuid4

from address_engine.base import AddressProvider
from analysis.models import (
    AnalysisAddress,
    AnalysisDiff,
    AnalysisIssue,
    AnalysisResult,
)
from iso_engine.pacs008.adapter import map_pacs008_to_canonical
from iso_engine.pacs008.identifier import identify_pacs008
from iso_engine.xml_security import SecureXmlDocument, secure_parse
from iso_engine.xsd_validator import SchemaValidationResult, validate_pacs008
from payment_domain.models import AddressReadiness, PaymentMessage, ValidationStatus
from repair_engine.generator import addresses, generate_candidate
from repair_engine.models import RepairCandidate
from rules_engine.base import RuleEngine


class AnalysisPipeline:
    def __init__(
        self,
        *,
        address_provider: AddressProvider,
        rules_engine: RuleEngine,
        max_payload_bytes: int = 1_048_576,
    ) -> None:
        self._address_provider = address_provider
        self._rules_engine = rules_engine
        self._max_payload_bytes = max_payload_bytes

    def analyze(
        self,
        payload: bytes,
        *,
        repair: bool = True,
        include_candidate_xml: bool = False,
    ) -> AnalysisResult:
        """Analyze a pacs.008 XML payload (existing entry point)."""
        doc = secure_parse(payload, max_bytes=self._max_payload_bytes)
        version = identify_pacs008(doc.root)
        xsd_result = validate_pacs008(doc.root, version)
        message = map_pacs008_to_canonical(doc.root, version)
        message.validation_status = (
            ValidationStatus.VALID if xsd_result.valid else ValidationStatus.INVALID
        )
        return self.analyze_message(
            message,
            doc=doc,
            xsd_result=xsd_result,
            message_type=version.identifier,
            message_version=version.identifier,
            repair=repair,
            include_candidate_xml=include_candidate_xml,
        )

    def analyze_message(
        self,
        message: PaymentMessage,
        *,
        doc: SecureXmlDocument | None = None,
        xsd_result: SchemaValidationResult | None = None,
        message_type: str | None = None,
        message_version: str | None = None,
        repair: bool = True,
        include_candidate_xml: bool = False,
    ) -> AnalysisResult:
        """Run the deterministic engine on an already-mapped canonical ``PaymentMessage``.

        Used by the mapping engine for JSON/CSV/custom-XML inputs. ``doc``/``xsd_result`` are
        provided when the source is ISO XML (pacs.008) so XML reconstruction + XSD revalidation
        can run; otherwise the candidate is re-validated against the rules on the model.
        """
        case_id = f"case-{uuid4().hex[:16]}"
        xsd_valid = xsd_result.valid if xsd_result else True

        findings = self._rules_engine.evaluate(message)

        address_analyses: list[AnalysisAddress] = []
        overall_readiness: list[AddressReadiness] = []
        any_fallback = False
        provider_used: str | None = None
        provider_version_used: str | None = None
        for tx in message.transactions:
            for label, addr in addresses(tx):
                analysis = self._address_provider.analyze(addr)
                overall_readiness.append(analysis.readiness)
                if analysis.fallback:
                    any_fallback = True
                if analysis.available:
                    provider_used = analysis.provider
                    provider_version_used = analysis.provider_version
                address_analyses.append(
                    AnalysisAddress(
                        party=label,
                        readiness=analysis.readiness.value,
                        evidence_level=analysis.evidence_level.value,
                        country_code=analysis.country_code,
                        town_name=analysis.town_name,
                        provider=analysis.provider,
                        provider_version=analysis.provider_version,
                        note=analysis.note,
                        fallback=analysis.fallback,
                    )
                )

        candidate: RepairCandidate | None = None
        if repair:
            candidate = generate_candidate(
                message,
                doc,
                address_provider=self._address_provider,
                rules_engine=self._rules_engine,
            )

        input_hash = _message_hash(message)
        output_hash = (
            sha256(candidate.xml.encode("utf-8")).hexdigest()
            if candidate and candidate.xml
            else None
        )

        return AnalysisResult(
            case_id=case_id,
            message_type=message_type or message.message_type,
            message_version=message_version,
            original_validation_status="valid" if xsd_valid else "invalid",
            schema_issues=[
                AnalysisIssue(code=i.code, severity=i.severity, path=i.path, message=i.message)
                for i in (xsd_result.issues if xsd_result else [])
            ],
            rule_findings=[f.to_dict() for f in findings],
            address_analyses=address_analyses,
            address_readiness=_aggregate_readiness(overall_readiness),
            repair_status=candidate.status.value if candidate else None,
            candidate_diff=[
                AnalysisDiff(
                    path=c.path,
                    before=c.before,
                    after=c.after,
                    source=c.source.value,
                    status=c.status.value,
                )
                for c in (candidate.changes if candidate else [])
            ],
            candidate_validation_status=candidate.status.value if candidate else None,
            candidate_xml=candidate.xml
            if (include_candidate_xml and candidate and candidate.xml)
            else None,
            ruleset_version=self._rules_engine.version,
            address_provider=provider_used,
            address_provider_version=provider_version_used,
            address_provider_fallback=any_fallback,
            input_hash=input_hash,
            output_hash=output_hash,
            warnings=_warnings(xsd_valid, candidate, any_fallback),
        )


def _message_hash(message: PaymentMessage) -> str:
    """Deterministic hash of a canonical message (used when no raw payload is hashed)."""
    return sha256(message.model_dump_json(exclude_none=True).encode("utf-8")).hexdigest()


def _aggregate_readiness(levels: list[AddressReadiness]) -> str:
    if not levels:
        return "UNRESOLVED"
    if all(x == AddressReadiness.READY for x in levels):
        return "READY"
    if AddressReadiness.UNRESOLVED in levels:
        return "UNRESOLVED"
    if AddressReadiness.REVIEW_REQUIRED in levels:
        return "REVIEW_REQUIRED"
    return "REPAIRABLE"


def _warnings(
    xsd_valid: bool, candidate: RepairCandidate | None, any_fallback: bool = False
) -> list[str]:
    warnings: list[str] = []
    if not xsd_valid:
        warnings.append("Original message did not pass XSD validation")
    if candidate and candidate.status.value == "REVIEW_REQUIRED":
        warnings.append("Repair candidate requires human review")
    if any_fallback:
        warnings.append("ADDRESS_PROVIDER_FALLBACK")
    return warnings
