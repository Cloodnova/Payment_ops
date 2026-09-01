"""Address intelligence engine boundary.

Responsibility (planned): SWIFT/address structuring and candidate address repair. No
logic implemented in Week 1.
"""

from __future__ import annotations

from abc import ABC, abstractmethod


class IAddressEngine(ABC):
    @abstractmethod
    def kind(self) -> str:
        raise NotImplementedError
