"""Bank-specific rules engine boundary.

Responsibility (planned): deterministic, configuration-driven bank-specific rules. Never
a fork per customer (ADR-008); rules are selected via integration profiles. No business
rules implemented in Week 1.
"""

from __future__ import annotations

from abc import ABC, abstractmethod


class IRulesEngine(ABC):
    @abstractmethod
    def profile_id(self) -> str:
        """Integration profile this engine instance serves."""
        raise NotImplementedError
