"""Mapping engine (input → canonical model) boundary.

Responsibility (planned): mapping bank XML/JSON/CSV/API input to the CloudNova canonical
model. Must not permit arbitrary code execution through customer mappings (rule #14).
No mapping logic implemented in Week 1.
"""

from __future__ import annotations

from abc import ABC, abstractmethod


class IMappingEngine(ABC):
    @abstractmethod
    def label(self) -> str:
        raise NotImplementedError
