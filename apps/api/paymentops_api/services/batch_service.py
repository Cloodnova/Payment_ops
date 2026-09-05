"""Batch processing service (CSV streaming, defensive limits, tenant-scoped)."""

from __future__ import annotations

import csv
import io
from datetime import UTC, datetime
from typing import cast

from paymentops_api.db.models import BatchJob
from paymentops_api.services.integration_analysis_service import analyze_profile
from paymentops_api.settings import Settings
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from integration_profiles.models import IntegrationProfile

MAX_FILE_BYTES = 2_000_000
MAX_ROWS = 5_000


class BatchLimitError(ValueError):
    pass


async def create_batch_job(
    session: AsyncSession,
    organization_id: str,
    profile_id: str,
    profile_version: int,
) -> BatchJob:
    row = BatchJob(
        organization_id=organization_id,
        profile_id=profile_id,
        profile_version=profile_version,
        status="QUEUED",
        created_at=datetime.now(UTC),
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return row


async def process_batch(
    session: AsyncSession,
    job: BatchJob,
    csv_text: str,
    profile: IntegrationProfile,
    settings: Settings,
) -> dict[str, object]:
    """Stream a CSV, map + analyze each record, update counts, build a report."""
    if len(csv_text.encode("utf-8")) > MAX_FILE_BYTES:
        raise BatchLimitError("batch file too large")
    reader = csv.DictReader(io.StringIO(csv_text))
    rows = list(reader)
    if len(rows) > MAX_ROWS:
        raise BatchLimitError("too many rows")

    counts = {"READY": 0, "REPAIRABLE": 0, "REVIEW_REQUIRED": 0, "UNRESOLVED": 0}
    failed = 0
    top_rules: dict[str, int] = {}
    job.status = "RUNNING"
    job.started_at = datetime.now(UTC)
    job.total_records = len(rows)
    await session.commit()

    for i, row in enumerate(rows):
        try:
            csv_text_row = "\n".join([",".join(row.keys()), ",".join(row.values())])
            result = analyze_profile(profile, csv_text_row.encode("utf-8"), settings=settings)
            status = str(result.get("address_readiness") or "UNRESOLVED")
            counts[status] = counts.get(status, 0) + 1
            for finding in cast(list[object], result.get("rule_findings") or []):
                rule_id = str(cast(dict[str, object], finding).get("rule_id"))
                top_rules[rule_id] = top_rules.get(rule_id, 0) + 1
        except Exception:  # noqa: BLE001 - per-record isolation
            failed += 1
        job.processed_records = i + 1
        await session.commit()

    job.status = "COMPLETED" if failed == 0 else "PARTIAL"
    job.completed_at = datetime.now(UTC)
    job.ready_count = counts.get("READY", 0)
    job.repairable_count = counts.get("REPAIRABLE", 0)
    job.review_required_count = counts.get("REVIEW_REQUIRED", 0)
    job.unresolved_count = counts.get("UNRESOLVED", 0)
    job.failed_count = failed
    job.report = {
        "total_records": len(rows),
        "ready": counts.get("READY", 0),
        "repairable": counts.get("REPAIRABLE", 0),
        "review_required": counts.get("REVIEW_REQUIRED", 0),
        "unresolved": counts.get("UNRESOLVED", 0),
        "failed": failed,
        "top_rule_findings": sorted(top_rules.items(), key=lambda x: -x[1])[:10],
    }
    await session.commit()
    return job.report


async def get_job(session: AsyncSession, organization_id: str, job_id: str) -> BatchJob:
    result = await session.execute(
        select(BatchJob).where(BatchJob.id == job_id, BatchJob.organization_id == organization_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise LookupError("job not found")
    return row
