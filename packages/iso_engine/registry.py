"""ISO 20022 message registry (foundation for future messages).

Maps a fully-qualified message identifier / namespace to its parser adapter + canonical
mapper. Currently registers pacs.008.001.08 only. Future messages (pain.001, pacs.002,
pacs.009, camt.053, camt.054) can be added here without changing the core engine.

Unsupported versions fail clearly (never silently parsed).
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from lxml import etree


@dataclass(frozen=True)
class MessageDefinition:
    """Explicit metadata for a supported ISO message/version (Task 37)."""

    message_family: str  # e.g. "pacs", "pain", "camt"
    message_definition: str  # e.g. "FIToFICustomerCreditTransferV08"
    version: str  # fully-qualified, e.g. "pacs.008.001.08"
    namespace: str  # targetNamespace
    adapter_version: str  # implementation version of the adapter


@dataclass(frozen=True)
class RegisteredMessage:
    definition: MessageDefinition
    # Parses a secure XML tree -> canonical payload (adapter-specific type).
    adapter: Callable[[etree._Element, Any], Any]
    # Maps the adapter output -> canonical PaymentMessage.
    canonical_mapper: Callable[..., Any]
    # A parser identifier for the message (e.g. identify_pacs008).
    identifier: Callable[..., Any] | None = None


class IsoMessageRegistry:
    """Registry of supported ISO messages keyed by identifier and namespace."""

    def __init__(self) -> None:
        self._by_identifier: dict[str, RegisteredMessage] = {}
        self._by_namespace: dict[str, RegisteredMessage] = {}

    def register(self, message: RegisteredMessage) -> None:
        self._by_identifier[message.definition.version] = message
        self._by_namespace[message.definition.namespace] = message

    def resolve(self, identifier: str) -> RegisteredMessage:
        try:
            return self._by_identifier[identifier]
        except KeyError:
            raise UnsupportedMessageError(identifier) from None

    def resolve_namespace(self, namespace: str) -> RegisteredMessage:
        try:
            return self._by_namespace[namespace]
        except KeyError:
            raise UnsupportedMessageError(namespace) from None

    def supported(self) -> list[MessageDefinition]:
        return [m.definition for m in self._by_identifier.values()]

    def __contains__(self, identifier: str) -> bool:
        return identifier in self._by_identifier


class UnsupportedMessageError(Exception):
    """Raised for a known-but-unsupported or unknown ISO version (never silently parsed)."""

    def __init__(self, identifier: str) -> None:
        self.identifier = identifier
        super().__init__(f"unsupported ISO message/version: {identifier}")


def build_default_registry() -> IsoMessageRegistry:
    """Build the registry with the currently supported messages (pacs.008.001.08)."""
    from iso_engine.pacs008.adapter import map_pacs008_to_canonical
    from iso_engine.pacs008.identifier import identify_pacs008
    from iso_engine.pacs008.namespace import SUPPORTED_PACS_008_VERSIONS

    registry = IsoMessageRegistry()
    for version in SUPPORTED_PACS_008_VERSIONS.values():
        registry.register(
            RegisteredMessage(
                definition=MessageDefinition(
                    message_family="pacs",
                    message_definition=version.message_name,
                    version=version.identifier,
                    namespace=version.namespace,
                    adapter_version="0.1.0",
                ),
                adapter=map_pacs008_to_canonical,
                canonical_mapper=map_pacs008_to_canonical,
                identifier=identify_pacs008,
            )
        )
    return registry
