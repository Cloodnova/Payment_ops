"""ISO 20022 engine: secure XML ingestion, message identification, XSD validation, and the
pacs.008 adapter.

Everything here is deterministic. The XML/XSD validator is authoritative; it is never
overridden by AI or heuristic output (ADR-005).
"""

from __future__ import annotations

from iso_engine.pacs008.adapter import map_pacs008_to_canonical
from iso_engine.pacs008.identifier import identify_pacs008
from iso_engine.pacs008.namespace import SUPPORTED_PACS_008_VERSIONS, SupportedVersion
from iso_engine.xml_errors import (
    EncodingError,
    MalformedXmlError,
    PayloadTooLargeError,
    ProhibitedEntityError,
    UnsupportedMessageTypeError,
    XmlError,
)
from iso_engine.xml_security import SecureXmlDocument, secure_parse
from iso_engine.xsd_validator import SchemaIssue, SchemaValidationResult, validate_pacs008

__all__ = [
    "EncodingError",
    "MalformedXmlError",
    "PayloadTooLargeError",
    "ProhibitedEntityError",
    "SecureXmlDocument",
    "SchemaIssue",
    "SchemaValidationResult",
    "SUPPORTED_PACS_008_VERSIONS",
    "SupportedVersion",
    "UnsupportedMessageTypeError",
    "XmlError",
    "identify_pacs008",
    "map_pacs008_to_canonical",
    "secure_parse",
    "validate_pacs008",
]
