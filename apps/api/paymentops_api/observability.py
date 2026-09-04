"""Application metrics.

Low-cardinality labels only. Never label with IBANs, names, message IDs, account numbers, or
case IDs. Labels are limited to status, message_type, and rule_category.
"""

from __future__ import annotations

from prometheus_client import Counter, Histogram

analysis_total = Counter(
    "paymentops_analysis_total",
    "Total payment analyses",
    ("status", "message_type"),
)
analysis_duration = Histogram(
    "paymentops_analysis_duration_seconds",
    "Payment analysis duration",
    ("message_type",),
)
validation_failures_total = Counter(
    "paymentops_validation_failures_total",
    "Total XSD/validation failures",
    ("message_type",),
)
rule_findings_total = Counter(
    "paymentops_rule_findings_total",
    "Total rule findings",
    ("rule_category", "severity"),
)
address_resolution_total = Counter(
    "paymentops_address_resolution_total",
    "Address resolution outcomes",
    ("readiness",),
)
repair_candidates_total = Counter(
    "paymentops_repair_candidates_total",
    "Repair candidates generated",
    ("status",),
)
