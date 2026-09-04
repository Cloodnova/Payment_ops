"""CloudNova address engine.

Deterministic normalization, evidence-based readiness classification, and the
:class:`AddressProvider` abstraction. Only the provider interface is consumed elsewhere;
Swift-specific details are isolated behind ``SwiftDerivedAddressProvider``.
"""

from __future__ import annotations

from address_engine.base import AddressAnalysis, AddressProvider
from address_engine.providers import CloudNovaAddressProvider, SwiftDerivedAddressProvider
from address_engine.readiness import classify_readiness

__all__ = [
    "AddressAnalysis",
    "AddressProvider",
    "CloudNovaAddressProvider",
    "SwiftDerivedAddressProvider",
    "classify_readiness",
]
