"""FastAPI application factory for PaymentOps."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from paymentops_api.db.base import Database
from paymentops_api.errors import register_exception_handlers
from paymentops_api.logging import configure_logging, get_logger
from paymentops_api.middleware import (
    CorrelationIdMiddleware,
    MetricsMiddleware,
    SecurityHeadersMiddleware,
)
from paymentops_api.routers import health, info, metrics
from paymentops_api.settings import Settings, get_settings

logger = get_logger("paymentops.app")


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build and configure the FastAPI application."""
    settings = settings or get_settings()
    configure_logging(settings.app_log_level)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        logger.info("application_started", version=settings.app_version)
        try:
            yield
        finally:
            await app.state.db.dispose()
            logger.info("application_stopped")

    app = FastAPI(
        title=settings.api_title,
        version=settings.app_version,
        description=(
            "CloudNova PaymentOps is a non-transactional payment-data intelligence "
            "platform. It does not execute, authorize, or settle payments."
        ),
        debug=settings.app_debug,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        lifespan=lifespan,
    )

    # Attach DB + settings at build time so they are available even without a running
    # lifespan (e.g. ASGITransport in tests) and so routes use THIS app's settings rather
    # than a globally-cached instance.
    app.state.settings = settings
    app.state.db = Database(settings)

    # --- Middleware (order matters: outermost last) ---
    app.add_middleware(CorrelationIdMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)

    cors_origins = settings.cors_allowed_origins
    if settings.is_production:
        cors_origins = [
            origin for origin in cors_origins if origin not in ("http://localhost:3000", "*")
        ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins if cors_origins else [],
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    if settings.metrics_enabled:
        app.add_middleware(MetricsMiddleware, settings=settings)

    register_exception_handlers(app)

    app.include_router(health.router)
    app.include_router(info.router)
    app.include_router(metrics.router)

    return app
