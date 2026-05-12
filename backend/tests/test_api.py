from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app import rate_limit, store

@pytest.fixture()
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    test_dir = Path(__file__).resolve().parent / ".tmp"
    test_dir.mkdir(exist_ok=True)
    db_path = test_dir / f"test-{uuid4().hex}.sqlite3"
    monkeypatch.setattr(store, "DATABASE_PATH", db_path)
    rate_limit.reset_rate_limits_for_tests()
    yield TestClient(app)


def report_payload(client_report_id: str = "client-report-001") -> dict:
    return {
        "client_report_id": client_report_id,
        "follow_up_secret": f"{client_report_id}-follow-up-secret-1234567890",
        "category": "resource_dispute",
        "urgency": "high",
        "details": "There is a growing dispute near the shared water point.",
        "rough_location": "North market water point",
        "rough_region": "North market",
        "nearby_landmark": "Clinic road",
        "location_place_type": "water_point",
        "evidence_notes": "A notice was posted nearby.",
        "contact_preference": "if_needed",
        "contact_method": "phone",
        "contact_details": "+254700000000",
        "exact_location_consent": True,
        "current_location": {
            "latitude": -1.2921,
            "longitude": 36.8219,
            "precision": "exact",
        },
    }


def test_health_endpoint_returns_ok(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_report_submission_follow_up_and_public_stats_are_privacy_safe(client: TestClient) -> None:
    submitted = client.post("/community/reports", json=report_payload())

    assert submitted.status_code == 201
    submitted_body = submitted.json()
    assert submitted_body["case_id"].startswith("AC-")
    assert submitted_body["follow_up_code"]
    assert submitted_body["status"] == "received"

    invalid_lookup = client.post(
        f"/community/reports/{submitted_body['case_id']}/status",
        json={"follow_up_code": "wrong-follow-up-secret-1234567890"},
    )
    assert invalid_lookup.status_code == 404

    valid_lookup = client.post(
        f"/community/reports/{submitted_body['case_id']}/status",
        json={"follow_up_code": submitted_body["follow_up_code"]},
    )
    assert valid_lookup.status_code == 200
    assert valid_lookup.json()["status"] == "received"

    public_stats = client.get("/public/stats")
    assert public_stats.status_code == 200
    public_body = public_stats.json()
    assert public_body["total_reports"] == 1
    assert public_body["by_week"]
    assert public_body["by_region"] == []
    assert "contact_details" not in str(public_body)
    assert "exact_latitude" not in str(public_body)
    assert "There is a growing dispute" not in str(public_body)


def test_responder_can_view_sensitive_fields_and_update_status(client: TestClient) -> None:
    client.post("/community/reports", json=report_payload())

    unauthorized_reports = client.get("/responder/reports")
    assert unauthorized_reports.status_code == 401

    login = client.post(
        "/responder/auth/login",
        json={"username": "responder", "password": "amani-responder-dev"},
    )
    assert login.status_code == 200

    reports = client.get("/responder/reports")

    assert reports.status_code == 200
    report = reports.json()[0]
    assert report["contact_details"] == "+254700000000"
    assert report["has_exact_location"] is True
    assert report["exact_latitude"] == -1.2921
    assert report["created_at"] == report["updated_at"]

    updated = client.patch(
        f"/responder/reports/{report['id']}/status",
        json={
            "status": "under_review",
            "responder_notes": "Assigned for triage.",
            "reporter_message": "Your report is under review.",
        },
    )

    assert updated.status_code == 200
    assert updated.json()["status"] == "under_review"
    assert updated.json()["updated_at"] != report["updated_at"]

    client.post("/responder/auth/logout")
    unauthorized_update = client.patch(
        f"/responder/reports/{report['id']}/status",
        json={"status": "closed"},
    )
    assert unauthorized_update.status_code == 401


def test_duplicate_client_report_id_returns_existing_case_without_new_follow_up_code(client: TestClient) -> None:
    first = client.post("/community/reports", json=report_payload("client-report-dup"))
    second = client.post("/community/reports", json=report_payload("client-report-dup"))

    assert first.status_code == 201
    assert second.status_code == 201
    assert second.json()["case_id"] == first.json()["case_id"]
    assert second.json()["follow_up_code"] == report_payload("client-report-dup")["follow_up_secret"]


def test_public_region_threshold_requires_three_reports(client: TestClient) -> None:
    client.post("/community/reports", json=report_payload("region-001"))
    client.post("/community/reports", json=report_payload("region-002"))

    below_threshold = client.get("/public/stats").json()
    assert below_threshold["by_region"] == []

    client.post("/community/reports", json=report_payload("region-003"))
    at_threshold = client.get("/public/stats").json()
    assert at_threshold["by_region"][0]["key"] == "North market"
    assert at_threshold["by_region"][0]["count"] == 3


def test_contact_fields_require_reporter_consent(client: TestClient) -> None:
    payload = report_payload("contact-without-consent")
    payload["contact_preference"] = "none"

    response = client.post("/community/reports", json=payload)

    assert response.status_code == 422


def test_contact_opt_in_requires_method_and_details(client: TestClient) -> None:
    payload = report_payload("contact-missing-details")
    payload["contact_details"] = ""

    response = client.post("/community/reports", json=payload)

    assert response.status_code == 422


def test_current_location_requires_exact_location_consent(client: TestClient) -> None:
    payload = report_payload("location-without-consent")
    payload["exact_location_consent"] = False

    response = client.post("/community/reports", json=payload)

    assert response.status_code == 422


def test_invalid_status_update_is_rejected(client: TestClient) -> None:
    client.post("/community/reports", json=report_payload("invalid-status-case"))
    client.post("/responder/auth/login", json={"username": "responder", "password": "amani-responder-dev"})
    report = client.get("/responder/reports").json()[0]

    response = client.patch(
        f"/responder/reports/{report['id']}/status",
        json={"status": "invalid_status"},
    )

    assert response.status_code == 422


def test_follow_up_lookup_is_rate_limited(client: TestClient) -> None:
    submitted = client.post("/community/reports", json=report_payload("rate-limit-case")).json()
    for _ in range(5):
        invalid = client.post(
            f"/community/reports/{submitted['case_id']}/status",
            json={"follow_up_code": "wrong-follow-up-secret-1234567890"},
        )
        assert invalid.status_code == 404

    limited = client.post(
        f"/community/reports/{submitted['case_id']}/status",
        json={"follow_up_code": submitted["follow_up_code"]},
    )
    assert limited.status_code == 429


def test_responder_filters_and_status_history_are_recorded(client: TestClient) -> None:
    client.post("/community/reports", json=report_payload("filter-one"))
    other = report_payload("filter-two")
    other["urgency"] = "low"
    other["category"] = "abuse"
    client.post("/community/reports", json=other)
    client.post("/responder/auth/login", json={"username": "responder", "password": "amani-responder-dev"})

    filtered = client.get("/responder/reports?urgency=low&category=abuse&limit=1&offset=0")
    assert filtered.status_code == 200
    assert len(filtered.json()) == 1
    assert filtered.json()[0]["urgency"] == "low"

    report_id = filtered.json()[0]["id"]
    updated = client.patch(f"/responder/reports/{report_id}/status", json={"status": "closed"})
    assert updated.status_code == 200

    with store.get_connection() as connection:
        count = connection.execute(
            "SELECT COUNT(*) AS count FROM report_status_history WHERE report_id = ?",
            (report_id,),
        ).fetchone()["count"]
    assert count == 2


def test_structured_validation_error_shape(client: TestClient) -> None:
    invalid = client.post("/community/reports", json={"client_report_id": "too-short"})
    assert invalid.status_code == 422
    assert invalid.json()["error"]["code"] == "VALIDATION_ERROR"
