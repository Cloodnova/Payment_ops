"""API client management (admin bootstrap)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from paymentops_api.auth import generate_client_id, get_db, hash_secret
from paymentops_api.db.models import ApiClient

router = APIRouter(tags=["clients"])


class CreateClientRequest(BaseModel):
    organization_id: str
    allowed_profiles: list[str] = Field(default_factory=list)


@router.post("/api/v1/clients", status_code=201)
async def create_client(
    body: CreateClientRequest, session: AsyncSession = Depends(get_db)
) -> dict[str, object]:
    """Create an API client. Returns the plaintext secret once (never stored)."""
    client_id = generate_client_id()
    secret = uuid.uuid4().hex + uuid.uuid4().hex
    row = ApiClient(
        client_id=client_id,
        secret_hash=hash_secret(secret),
        organization_id=body.organization_id,
        allowed_profiles=body.allowed_profiles or [],
        status="ACTIVE",
    )
    session.add(row)
    await session.commit()
    return {"client_id": client_id, "secret": secret, "organization_id": body.organization_id}


@router.get("/api/v1/clients")
async def list_clients(session: AsyncSession = Depends(get_db)) -> list[dict[str, object]]:
    result = await session.execute(select(ApiClient))
    return [
        {
            "client_id": c.client_id,
            "organization_id": str(c.organization_id),
            "allowed_profiles": c.allowed_profiles or [],
            "status": c.status,
        }
        for c in result.scalars().all()
    ]
