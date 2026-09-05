"""Profile-resolved analysis API (authenticated, tenant-scoped)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from paymentops_api.auth import AuthenticatedClient, get_api_client, get_db
from paymentops_api.services import integration_service
from paymentops_api.services.integration_analysis_service import analyze_profile

router = APIRouter(tags=["integrations"])


class AnalyzeRequest(BaseModel):
    payload: str = Field(..., description="Raw input payload (JSON/XML/CSV)")
    repair: bool = True
    include_candidate_xml: bool = False


@router.post("/api/v1/integrations/{profile_id}/analyze")
async def profile_analyze(
    profile_id: str,
    body: AnalyzeRequest,
    request: Request,
    client: AuthenticatedClient = Depends(get_api_client),
    session: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    # Client must be authorized for this profile.
    if client.allowed_profiles and profile_id not in client.allowed_profiles:
        raise HTTPException(status_code=403, detail="profile not authorized for client") from None

    try:
        profile = await integration_service.get_profile(session, client.organization_id, profile_id)
    except LookupError:
        raise HTTPException(status_code=404, detail="profile not found") from None
    if profile.status.value != "PUBLISHED":
        raise HTTPException(status_code=409, detail="profile not published") from None

    return analyze_profile(
        profile,
        body.payload.encode("utf-8"),
        settings=request.app.state.settings,
        repair=body.repair,
        include_candidate_xml=body.include_candidate_xml,
    )
