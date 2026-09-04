"""Repair candidate generation (Task 12).

Flow:
    original -> analysis -> proposed field changes -> reconstruct candidate XML
             -> XSD validation -> CloudNova rule validation
             -> VALIDATED_CANDIDATE (only if schema + rules pass)

We never present a candidate as a "corrected payment" until deterministic validation succeeds.
"""

from __future__ import annotations

from uuid import uuid4

from address_engine.base import AddressProvider
from iso_engine.pacs008.identifier import identify_pacs008
from iso_engine.xml_security import SecureXmlDocument
from iso_engine.xsd_validator import validate_pacs008
from payment_domain.models import (
    CandidateStatus,
    PaymentMessage,
    PaymentTransaction,
    PostalAddress,
)
from repair_engine.models import ChangeSource, DiffEntry, RepairCandidate
from repair_engine.xml_reconstruction import apply_changes, serialize
from rules_engine.base import RuleEngine, RuleFinding


def addresses(transaction: PaymentTransaction) -> list[tuple[str, PostalAddress]]:
    pairs: list[tuple[str, PostalAddress]] = []
    for label, party in (("Dbtr", transaction.debtor), ("Cdtr", transaction.creditor)):
        if party and party.postal_address:
            pairs.append((label, party.postal_address))
    for label, agent in (
        ("DbtrAgt", transaction.debtor_agent),
        ("CdtrAgt", transaction.creditor_agent),
    ):
        if agent and agent.postal_address:
            pairs.append((label, agent.postal_address))
    return pairs


def generate_candidate(
    message: PaymentMessage,
    doc: SecureXmlDocument,
    *,
    address_provider: AddressProvider,
    rules_engine: RuleEngine,
) -> RepairCandidate:
    """Generate, reconstruct, and deterministically re-validate a repair candidate."""

    changes: list[DiffEntry] = []
    for tx in message.transactions:
        for _label, addr in addresses(tx):
            if not addr.source_path:
                continue
            analysis = address_provider.analyze(addr)
            base = addr.source_path
            raw_country = addr.original_fields.get("Ctry")
            raw_town = addr.original_fields.get("TwnNm")
            # Propose a change only when the deterministic candidate differs from the source.
            if analysis.country_code and raw_country != analysis.country_code:
                changes.append(
                    DiffEntry(
                        path=f"{base}/Ctry",
                        before=raw_country,
                        after=analysis.country_code,
                        source=ChangeSource.ADDRESS_PROVIDER,
                    )
                )
            if analysis.town_name and raw_town != analysis.town_name:
                changes.append(
                    DiffEntry(
                        path=f"{base}/TwnNm",
                        before=raw_town,
                        after=analysis.town_name,
                        source=ChangeSource.ADDRESS_PROVIDER,
                    )
                )

    candidate_id = f"RC-{uuid4().hex[:12]}"

    if not changes:
        return RepairCandidate(
            candidate_id=candidate_id,
            changes=[],
            xml=None,
            status=CandidateStatus.VALIDATED,
            note="No repair changes required",
        )

    # Reconstruct the candidate XML from the original tree (never mutating the original).
    new_root, applied = apply_changes(doc.root, changes)
    candidate_xml = serialize(new_root)

    # Deterministic re-validation.
    version = identify_pacs008(new_root)
    xsd_result = validate_pacs008(new_root, version)
    # Re-validate rules on the canonical form derived from the candidate.
    # (We re-map to a fresh canonical message so rule findings reflect the candidate.)
    from iso_engine.pacs008.adapter import map_pacs008_to_canonical

    candidate_message = map_pacs008_to_canonical(new_root, version)
    candidate_findings = rules_engine.evaluate(candidate_message)

    if xsd_result.valid and not _blocking_findings(candidate_findings):
        status = CandidateStatus.VALIDATED
    else:
        status = CandidateStatus.REVIEW_REQUIRED

    return RepairCandidate(
        candidate_id=candidate_id,
        changes=applied,
        xml=candidate_xml,
        status=status,
        xsd_result=xsd_result,
        rule_findings=candidate_findings,
    )


def _blocking_findings(findings: list[RuleFinding]) -> bool:
    from rules_engine.base import Severity

    return any(f.severity in (Severity.ERROR, Severity.CRITICAL) for f in findings)
