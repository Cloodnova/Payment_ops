"""Swift-derived address provider (isolated adapter).

LEGAL / ARCHITECTURAL
---------------------
The upstream component is the open-source Swift Hybrid Postal Address Structuring model
(``Swift-SC/iso20022-address-structuring``). It is isolated behind :class:`AddressProvider`;
no Swift-specific type leaks into PaymentOps. It provides TOWN and COUNTRY intelligence
only (it does not fully structure every postal-address field).

In Week 2 the heavy PyTorch inference component is NOT vendored into the core API image
(see ADR-012). This provider is an adapter that can target a separately-containerized Swift
inference service. When the service is not configured/reachable it reports ``available=False``
and the pipeline falls back to the CloudNova deterministic provider. Vendoring the upstream
code/model resources and GeoNames data requires license verification (NOTICE/CHANGES).
"""

from __future__ import annotations

from address_engine.base import AddressAnalysis, AddressProvider
from payment_domain.models import AddressReadiness, EvidenceLevel, PostalAddress

PROVIDER_NAME = "swift_derived"
PROVIDER_VERSION = "0.1.0"  # CloudNova adapter version, not the upstream model version.


class SwiftDerivedAddressProvider(AddressProvider):
    """Adapter over a separately-deployed Swift town/country inference component."""

    name = PROVIDER_NAME
    version = PROVIDER_VERSION

    def __init__(self, endpoint_url: str | None = None, *, timeout_seconds: float = 2.0) -> None:
        self._endpoint = endpoint_url
        self._timeout = timeout_seconds

    @property
    def configured(self) -> bool:
        return bool(self._endpoint)

    def analyze(self, address: PostalAddress) -> AddressAnalysis:
        if not self.configured:
            return AddressAnalysis(
                provider=self.name,
                provider_version=self.version,
                readiness=AddressReadiness.UNRESOLVED,
                evidence_level=EvidenceLevel.LOW,
                available=False,
                note="Swift-derived component not configured; fallback to CloudNova provider",
            )
        # When a Swift inference service is configured, POST the address lines and parse the
        # town/country response. The transport/contract is documented in the vendor ADR.
        result = self._call_remote(address)
        if result is None:
            return AddressAnalysis(
                provider=self.name,
                provider_version=self.version,
                readiness=AddressReadiness.REVIEW_REQUIRED,
                evidence_level=EvidenceLevel.LOW,
                available=False,
                note="Swift-derived component unreachable",
            )
        return result

    def _call_remote(self, address: PostalAddress) -> AddressAnalysis | None:
        # Placeholder transport. If a real endpoint is configured, an HTTP POST to
        # {endpoint}/structure with the address lines would return town/country JSON.
        # Week 2 keeps this as an explicit, non-functional adapter.
        return None
