"""Shared pytest fixtures for PaymentOps."""

from __future__ import annotations

import os
import warnings

# Third-party dependency (anyio/starlette/fastapi) emits a DeprecationWarning at import
# time. This must be suppressed HERE, before the TestClient import below, because pytest's
# `filterwarnings` config is not yet applied during the very early conftest import phase.
for _module in ("anyio", "starlette", "fastapi"):
    warnings.filterwarnings("ignore", category=DeprecationWarning, module=r"^" + _module)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from paymentops_api.app.factory import create_app  # noqa: E402
from paymentops_api.settings import Settings  # noqa: E402


@pytest.fixture
def base_settings() -> Settings:
    """A non-production test settings object. No external dependencies are configured."""
    return Settings(
        app_environment="test",
        metrics_enabled=False,
        # No external deps required for unit/endpoint tests.
        ready_checks=["database", "redis"],
        database_password="test-only-fake",
        cors_allowed_origins=["http://localhost:3000"],
        app_debug=False,
    )


@pytest.fixture
def app(base_settings: Settings):
    return create_app(base_settings)


@pytest.fixture
def client(app) -> TestClient:
    with TestClient(app) as c:
        yield c


@pytest.fixture
def safe_client(app, monkeypatch):
    """A client whose dependency checks are stubbed healthy (no real DB/Redis needed)."""
    import paymentops_api.routers.health as health_router
    from paymentops_api.dependencies import Dependency

    async def _healthy(settings, db):
        return [Dependency("database", True, "ok"), Dependency("redis", True, "ok")]

    monkeypatch.setattr(health_router, "check_dependencies", _healthy)
    with TestClient(app) as c:
        yield c


@pytest.fixture
def test_database_url() -> str | None:
    """Optional real DB URL for integration tests. Tests are skipped when absent."""
    return os.environ.get("TEST_DATABASE_URL")


def load_fixture(name: str) -> bytes:
    """Load a synthetic pacs.008 fixture from tests/fixtures/pacs008/."""
    from pathlib import Path

    path = Path(__file__).resolve().parent / "fixtures" / "pacs008" / f"{name}.xml"
    return path.read_bytes()
