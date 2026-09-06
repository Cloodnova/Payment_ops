"""ISO adapter registry foundation tests (Task 36-39)."""

from __future__ import annotations

import pytest

from iso_engine import (
    IsoMessageRegistry,
    UnsupportedMessageError,
    build_default_registry,
)


def test_default_registry_registers_pacs008():
    reg = build_default_registry()
    defs = reg.supported()
    assert len(defs) == 1
    assert defs[0].version == "pacs.008.001.08"
    assert defs[0].message_family == "pacs"
    assert defs[0].namespace == "urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08"


def test_resolve_by_identifier():
    reg = build_default_registry()
    msg = reg.resolve("pacs.008.001.08")
    assert msg.definition.version == "pacs.008.001.08"


def test_resolve_by_namespace():
    reg = build_default_registry()
    msg = reg.resolve_namespace("urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08")
    assert msg.definition.message_definition == "FIToFICustomerCreditTransferV08"


def test_unsupported_version_fails_clearly():
    reg = build_default_registry()
    with pytest.raises(UnsupportedMessageError):
        reg.resolve("pain.001.001.09")
    with pytest.raises(UnsupportedMessageError):
        reg.resolve("pacs.008.001.09")


def test_registry_accepts_future_message_without_core_change():
    # Future messages (pain.001 etc.) can be registered without touching the engine.
    from iso_engine.registry import MessageDefinition, RegisteredMessage

    reg = IsoMessageRegistry()
    reg.register(
        RegisteredMessage(
            definition=MessageDefinition(
                message_family="pain",
                message_definition="CustomerCreditTransferInitiationV09",
                version="pain.001.001.09",
                namespace="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09",
                adapter_version="0.0.1",
            ),
            adapter=lambda root, v: None,
            canonical_mapper=lambda *a, **k: None,
        )
    )
    assert "pain.001.001.09" in reg
    assert reg.resolve("pain.001.001.09").definition.message_family == "pain"
