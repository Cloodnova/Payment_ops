"""Integration tests for POST /api/v1/payments/analyze."""

from __future__ import annotations

from tests.conftest import load_fixture


def test_analyze_valid_structured(client):
    xml = load_fixture("valid_structured").decode()
    r = client.post("/api/v1/payments/analyze", json={"xml": xml, "repair": True, "persist": False})
    assert r.status_code == 200
    body = r.json()
    assert body["message_type"] == "pacs.008.001.08"
    assert body["original_validation_status"] == "valid"
    assert body["address_readiness"] == "READY"
    assert body["repair_status"] == "VALIDATED"
    assert body["candidate_validation_status"] == "VALIDATED"
    assert body["candidate_diff"] == []
    assert body["input_hash"]
    assert "correlation_id" in body or body["case_id"]


def test_analyze_country_full_name_generates_candidate(client):
    xml = load_fixture("country_full_name").decode()
    r = client.post(
        "/api/v1/payments/analyze",
        json={"xml": xml, "repair": True, "persist": False, "include_candidate_xml": True},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["original_validation_status"] == "invalid"
    assert any(d["path"].endswith("/Ctry") and d["after"] == "IT" for d in body["candidate_diff"])
    assert body["candidate_validation_status"] == "VALIDATED"
    assert body["candidate_xml"]


def test_analyze_adrline_only_repair(client):
    xml = load_fixture("address_adrline_only").decode()
    r = client.post("/api/v1/payments/analyze", json={"xml": xml, "repair": True, "persist": False})
    assert r.status_code == 200
    body = r.json()
    assert body["address_readiness"] == "REPAIRABLE"
    assert body["candidate_diff"]
    assert body["candidate_validation_status"] == "VALIDATED"


def test_analyze_persist_false_does_not_persist(client):
    xml = load_fixture("valid_structured").decode()
    r = client.post("/api/v1/payments/analyze", json={"xml": xml, "repair": True, "persist": False})
    assert r.status_code == 200
    assert r.json()["input_hash"]


def test_analyze_malformed_xml_returns_structured_error(client):
    r = client.post("/api/v1/payments/analyze", json={"xml": "<not-xml", "persist": False})
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "XML-001"


def test_analyze_unsupported_version(client):
    xml = load_fixture("unsupported_namespace").decode()
    r = client.post("/api/v1/payments/analyze", json={"xml": xml, "persist": False})
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "XML-004"


def test_analyze_multiple_transactions(client):
    xml = load_fixture("multiple_txns").decode()
    r = client.post("/api/v1/payments/analyze", json={"xml": xml, "persist": False})
    assert r.status_code == 200
    assert r.json()["message_type"] == "pacs.008.001.08"


def test_analyze_does_not_expose_internals(client):
    xml = load_fixture("valid_structured").decode()
    r = client.post("/api/v1/payments/analyze", json={"xml": xml, "persist": False})
    assert "Traceback" not in r.text
    assert "Exception" not in r.text
