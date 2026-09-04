"""POST /api/v1/payments/analyze.

Accepts an untrusted pacs.008 XML payload, runs the deterministic analysis pipeline, and
returns a structured result. Raw XML is never persisted unless ``persist=true`` (metadata +
hashes only). Never exposes internal exception details.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from paymentops_api.db.base import Database
from paymentops_api.schemas.analysis import AnalyzeRequest, AnalyzeResponse
from paymentops_api.services.analysis_service import AnalysisService

router = APIRouter(tags=["analysis"])


def get_analysis_service(request: Request) -> AnalysisService:
    return AnalysisService(request.app.state.analysis_pipeline)


async def get_session(request: Request) -> AsyncGenerator[AsyncSession, None]:
    db: Database = request.app.state.db
    async for session in db.session():
        yield session


@router.post("/api/v1/payments/analyze", response_model=AnalyzeResponse)
async def analyze_payment(
    payload: AnalyzeRequest,
    request: Request,
    service: AnalysisService = Depends(get_analysis_service),
    session: AsyncSession = Depends(get_session),
) -> AnalyzeResponse:
    # ``persist`` is request-controlled; default is false (privacy-first). The session is
    # only used when persist is true; persist=false never touches the database.
    return await service.analyze(payload, session=session if payload.persist else None)
