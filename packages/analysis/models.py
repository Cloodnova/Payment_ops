"""Analysis result model (structured, serializable, non-sensitive)."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field


class AnalysisIssue(BaseModel):
    code: str
    severity: str
    path: str | None = None
    message: str


class AnalysisAddress(BaseModel):
    party: str | None = None
    readiness: str | None = None
    evidence_level: str | None = None
    country_code: str | None = None
    town_name: str | None = None
    provider: str | None = None
    provider_version: str | None = None
    note: str | None = None
    fallback: bool = False


class AnalysisDiff(BaseModel):
    path: str
    before: str | None = None
    after: str | None = None
    source: str | None = None
    status: str | None = None


class AnalysisResult(BaseModel):
    case_id: str
    message_type: str | None = None
    message_version: str | None = None
    original_validation_status: str  # valid | invalid
    schema_issues: list[AnalysisIssue] = Field(default_factory=list)
    rule_findings: list[dict[str, Any]] = Field(default_factory=list)
    address_analyses: list[AnalysisAddress] = Field(default_factory=list)
    address_readiness: str | None = None
    repair_status: str | None = None
    candidate_diff: list[AnalysisDiff] = Field(default_factory=list)
    candidate_validation_status: str | None = None
    candidate_xml: str | None = None
    ruleset_version: str | None = None
    address_provider: str | None = None
    address_provider_version: str | None = None
    address_provider_fallback: bool = False
    input_hash: str | None = None
    output_hash: str | None = None
    warnings: list[str] = Field(default_factory=list)
    processed_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
