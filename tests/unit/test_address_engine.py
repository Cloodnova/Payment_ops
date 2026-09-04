"""Unit tests for the address engine (normalization, readiness, provider abstraction)."""

from __future__ import annotations

from address_engine.base import AddressProvider
from address_engine.normalization import (
    extract_country_from_lines,
    normalize_country_field,
    normalize_unicode,
    normalize_whitespace,
)
from address_engine.providers import CloudNovaAddressProvider, SwiftDerivedAddressProvider
from payment_domain.models import AddressReadiness, EvidenceLevel, PostalAddress


def test_normalize_whitespace_and_unicode():
    assert normalize_whitespace("  a   b  ") == "a b"
    assert normalize_unicode("Ｈｅｌｌｏ") == "Hello"


def test_normalize_country_field_name_to_code():
    code, level, _ = normalize_country_field("Italy")
    assert code == "IT"
    assert level == EvidenceLevel.HIGH


def test_normalize_country_field_valid_code():
    code, level, _ = normalize_country_field("it")
    assert code == "IT"
    assert level == EvidenceLevel.HIGH


def test_extract_country_from_lines():
    code, level = extract_country_from_lines(["Via Roma 5, Roma, Italy"])
    assert code == "IT"
    assert level == EvidenceLevel.MEDIUM


def test_cloudnova_provider_ready():
    addr = PostalAddress(country="IT", town_name="Milano")
    analysis = CloudNovaAddressProvider().analyze(addr)
    assert analysis.readiness == AddressReadiness.READY
    assert analysis.country_code == "IT"
    assert analysis.town_name == "Milano"


def test_cloudnova_provider_repairable_invalid_country():
    addr = PostalAddress(country="Italy", town_name="Milano")
    analysis = CloudNovaAddressProvider().analyze(addr)
    assert analysis.readiness == AddressReadiness.REPAIRABLE
    assert analysis.country_code == "IT"


def test_cloudnova_provider_unresolved():
    addr = PostalAddress()
    analysis = CloudNovaAddressProvider().analyze(addr)
    assert analysis.readiness == AddressReadiness.UNRESOLVED


def test_swift_provider_isolated_and_disabled():
    provider = SwiftDerivedAddressProvider()
    assert isinstance(provider, AddressProvider)
    assert provider.configured is False
    analysis = provider.analyze(PostalAddress(country="IT", town_name="Milano"))
    assert analysis.available is False
    assert "not configured" in (analysis.note or "")


def test_swift_provider_not_used_by_default():
    # The default pipeline uses the CloudNova provider, never the Swift one.
    assert CloudNovaAddressProvider().name == "cloudnova"
    assert SwiftDerivedAddressProvider().name == "swift_derived"
