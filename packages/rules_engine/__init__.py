"""CloudNova rules engine: deterministic, versioned, customer-independent.

Rules are externalized from the API layer. No arbitrary Python execution from customer
input; rules are code with a fixed versioned ruleset.
"""

from __future__ import annotations

from rules_engine.base import (
    RULESET_VERSION,
    Rule,
    RuleEngine,
    RuleFinding,
    Severity,
)
from rules_engine.rules import ADDRESS_RULESET, build_address_ruleset

__all__ = [
    "ADDRESS_RULESET",
    "RULESET_VERSION",
    "Rule",
    "RuleEngine",
    "RuleFinding",
    "Severity",
    "build_address_ruleset",
]
