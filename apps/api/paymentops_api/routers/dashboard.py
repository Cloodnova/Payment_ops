"""Operator dashboard summary API (tenant-scoped, real DB data)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from paymentops_api.auth import AuthenticatedClient, get_api_client, get_db
from paymentops_api.db.models import BatchJob, PaymentCase

router = APIRouter(tags=["dashboard"])


@router.get("/api/v1/dashboard")
async def dashboard(
    client: AuthenticatedClient = Depends(get_api_client),
    session: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    org = client.organization_id

    readiness = await _count_by(session, PaymentCase.address_readiness, org)
    open_cases = await session.scalar(
        select(func.count())
        .select_from(PaymentCase)
        .where(
            PaymentCase.organization_id == org,
            PaymentCase.status.in_(["NEW", "ANALYZED", "REPAIR_PROPOSED", "REVIEW_REQUIRED"]),
        )
    )
    running_batches = await session.scalar(
        select(func.count())
        .select_from(BatchJob)
        .where(BatchJob.organization_id == org, BatchJob.status == "RUNNING")
    )

    # Top rule findings from the most recent cases (via rule_findings).
    top_findings: dict[str, int] = {}
    from paymentops_api.db.models import RuleFinding

    result = await session.execute(
        select(RuleFinding.rule_id, func.count())
        .where(RuleFinding.organization_id == org)
        .group_by(RuleFinding.rule_id)
    )
    for rule_id, count in result.all():
        top_findings[str(rule_id)] = int(count)

    return {
        "analyzed": int(sum(readiness.values())),
        "ready": readiness.get("READY", 0),
        "repairable": readiness.get("REPAIRABLE", 0),
        "review_required": readiness.get("REVIEW_REQUIRED", 0),
        "unresolved": readiness.get("UNRESOLVED", 0),
        "open_cases": int(open_cases or 0),
        "running_batches": int(running_batches or 0),
        "top_findings": dict(sorted(top_findings.items(), key=lambda x: -x[1])[:10]),
    }


async def _count_by(session: AsyncSession, column: Any, org: str) -> dict[str, int]:
    result = await session.execute(
        select(column, func.count()).where(PaymentCase.organization_id == org).group_by(column)
    )
    return {str(k): int(v) for k, v in result.all()}
    return {str(k): int(v) for k, v in result.all()}
