"""ISO 20022 engine boundary.

Responsibility (planned): deterministic ISO 20022 parsing/validation against XSD schemas
(pacs.008, pain.001, ...). Never authoritative on its own; produces deterministic results.
No real validation logic is implemented in Week 1.
"""

from __future__ import annotations

from abc import ABC, abstractmethod


class IISOEngine(ABC):
    @abstractmethod
    def name(self) -> str:
        """Human-readable engine name."""
        raise NotImplementedError
