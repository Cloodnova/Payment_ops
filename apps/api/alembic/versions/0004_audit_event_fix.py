"""Audit event cleanup: drop the legacy 'event' column, require 'event_type'.

Revision ID: 0004_audit_event_fix
Revises: 0003_week3
Create Date: 2026-09-05
"""
from __future__ import annotations

from alembic import op

revision = "0004_audit_event_fix"
down_revision = "0003_week3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Backfill the new event_type from the legacy event column, then drop the legacy column
    # and enforce NOT NULL on event_type.
    op.execute("UPDATE audit_events SET event_type = event WHERE event_type IS NULL")
    op.drop_column("audit_events", "event")
    op.alter_column("audit_events", "event_type", nullable=False)


def downgrade() -> None:
    op.alter_column("audit_events", "event_type", nullable=True)
    op.add_column("audit_events", op.Column("event", op.String(length=64), nullable=True))
