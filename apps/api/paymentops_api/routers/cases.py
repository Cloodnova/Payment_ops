"""Operator case workflow API (tenant-scoped)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from paymentops_api.auth import AuthenticatedClient, get_api_client, get_db
from paymentops_api.services import case_service

router = APIRouter(tags=["cases"])


class CaseActionRequest(BaseModel):
    action: str = Field(..., description="approve | reject | close")
    operator: str | None = None
    note: str | None = None


@router.get("/api/v1/cases/{case_id}")
async def get_case(
    case_id: str,
    client: AuthenticatedClient = Depends(get_api_client),
    session: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    try:
        case = await case_service.get_case(session, client.organization_id, case_id)
    except LookupError:
        raise HTTPException(status_code=404, detail="case not found") from None
    return {
        "case_id": case.case_id,
        "organization_id": str(case.organization_id),
        "message_type": case.message_type,
        "validation_status": case.validation_status,
        "address_readiness": case.address_readiness,
        "repair_status": case.repair_status,
        "status": case.status,
        "address_provider": case.address_provider,
        "address_provider_coverage": case.address_provider_coverage,
        "input_hash": case.input_hash,
        "output_hash": case.output_hash,
        "disclaimer": "Approval in PaymentOps approves the data-repair candidate only. "
        "PaymentOps does not authorize or execute payments.",
    }


@router.post("/api/v1/cases/{case_id}/actions")
async def case_action(
    case_id: str,
    body: CaseActionRequest,
    client: AuthenticatedClient = Depends(get_api_client),
    session: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    try:
        case = await case_service.transition_case(
            session,
            client.organization_id,
            case_id,
            body.action,
            operator=body.operator,
            note=body.note,
        )
    except LookupError:
        raise HTTPException(status_code=404, detail="case not found") from None
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from None
    return {"case_id": case.case_id, "status": case.status, "action": body.action}
