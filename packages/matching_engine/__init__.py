"""Fuzzy/entity matching engine boundary.

Responsibility (planned): fuzzy reconciliation and entity analysis. Produces *candidate*
matches only; never a decision. No logic implemented in Week 1.
"""

from __future__ import annotations

from abc import ABC, abstractmethod


class IMatchingEngine(ABC):
    @abstractmethod
    def kind(self) -> str:
        raise NotImplementedError
