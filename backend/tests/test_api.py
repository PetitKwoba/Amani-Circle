from pathlib import Path
from uuid import uuid4
import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app import location_search, notifications, rate_limit, store

@pytest.fixture()
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    test_dir = Path(__file__).resolve().parent / ".tmp"
    test_dir.mkdir(exist_ok=True)
    db_path = test_dir / f"test-{uuid4().hex}.sqlite3"
    monkeypatch.setattr(store, "DATABASE_PATH", db_path)
    rate_limit.reset_rate_limits_for_tests()
    notifications.reset_outbox_for_tests()
    location_search.reset_location_search_for_tests()
    yield TestClient(app)


def report_payload(client_report_id: str = "client-report-001") -> dict:
    return {
        "client_report_id": client_report_id,
        "follow_up_secret": f"{client_report_id}-follow-up-secret-1234567890",
        "category": "resource_dispute",
        "urgency": "high",
        "details": "There is a growing dispute near the shared water point.",
        "rough_location": "North market water point",
        "country": "Kenya",
        "city": "Nairobi",
        "village": "Westlands",
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


def rich_article_body() -> dict:
    return {
        "type": "doc",
        "content": [
            {
                "type": "heading",
                "attrs": {"level": 2},
                "content": [{"type": "text", "text": "Share water safely"}],
            },
            {
                "type": "paragraph",
                "content": [
                    {"type": "text", "text": "Use shared water points peacefully and ask trusted responders for support."}
                ],
            },
        ],
    }


def content_payload(**overrides: object) -> dict:
    payload = {
        "content_type": "article",
        "title": "Water point guidance",
        "hero_message": "Practical steps for safer shared water use.",
        "summary": "Community guidance for peaceful shared water point use.",
        "body_json": rich_article_body(),
        "body_text": "Share water safely. Use shared water points peacefully and ask trusted responders for support.",
        "country": "Kenya",
        "city": "Nairobi",
    }
    payload.update(overrides)
    return payload


def test_health_endpoint_returns_ok(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_report_submission_follow_up_and_public_stats_are_privacy_safe(client: TestClient) -> None:
    submitted = client.post("/community/reports", json=report_payload())

    assert submitted.status_code == 201
    submitted_body = submitted.json()
    assert re.fullmatch(r"AC-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}", submitted_body["case_id"])
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
    assert public_body["total_reports"] == 0
    assert public_body["by_week"] == []
    assert public_body["by_region"] == []
    assert "contact_details" not in str(public_body)
    assert "exact_latitude" not in str(public_body)
    assert "There is a growing dispute" not in str(public_body)


def test_follow_up_accepts_flexible_case_id_formats(client: TestClient) -> None:
    submitted = client.post("/community/reports", json=report_payload("case-normalize")).json()
    compact = submitted["case_id"].replace("-", "").lower()
    spaced = submitted["case_id"].replace("-", " ")

    compact_lookup = client.post(
        f"/community/reports/{compact}/status",
        json={"follow_up_code": submitted["follow_up_code"]},
    )
    spaced_lookup = client.post(
        f"/community/reports/{spaced}/status",
        json={"follow_up_code": submitted["follow_up_code"]},
    )

    assert compact_lookup.status_code == 200
    assert spaced_lookup.status_code == 200


def approve_report_for_public_stats(client: TestClient) -> None:
    client.post("/responder/auth/login", json={"username": "responder", "password": "amani-responder-dev"})
    report = next(report for report in client.get("/responder/reports").json() if not report["admin_public_approved"])
    responder_review = client.patch(f"/responder/reports/{report['id']}/public-review", json={"approved": True})
    assert responder_review.status_code == 200
    client.post("/responder/auth/logout")
    client.post("/auth/login", json={"username": "admin", "password": "amani-admin-dev-password"})
    admin_review = client.patch(f"/admin/reports/{report['id']}/public-approval", json={"approved": True})
    assert admin_review.status_code == 200
    client.post("/auth/logout")


def test_public_stats_require_responder_then_admin_approval(client: TestClient) -> None:
    client.post("/community/reports", json=report_payload("approval-flow"))

    assert client.get("/public/stats").json()["total_reports"] == 0

    client.post("/responder/auth/login", json={"username": "responder", "password": "amani-responder-dev"})
    report = client.get("/responder/reports").json()[0]
    responder_review = client.patch(f"/responder/reports/{report['id']}/public-review", json={"approved": True})
    assert responder_review.status_code == 200
    assert client.get("/public/stats").json()["total_reports"] == 0
    client.post("/responder/auth/logout")

    client.post("/auth/login", json={"username": "admin", "password": "amani-admin-dev-password"})
    admin_review = client.patch(f"/admin/reports/{report['id']}/public-approval", json={"approved": True})
    assert admin_review.status_code == 200
    public_body = client.get("/public/stats").json()
    assert public_body["total_reports"] == 1
    assert public_body["by_week"]


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


def test_reporter_can_signup_login_logout_and_cannot_access_responder_routes(client: TestClient) -> None:
    signup = client.post(
        "/auth/signup",
        json={
            "contact_type": "email",
            "contact": "reporter@example.test",
            "username": "reporter-one",
            "password": "strong-password-123",
        },
    )
    assert signup.status_code == 201
    assert signup.json()["role"] == "reporter"
    assert signup.json()["contact_verified"] is False

    blocked = client.get("/responder/reports")
    assert blocked.status_code == 401

    logout = client.post("/auth/logout")
    assert logout.status_code == 200
    assert logout.json()["authenticated"] is False

    login = client.post("/auth/login", json={"username": "reporter@example.test", "password": "strong-password-123"})
    assert login.status_code == 200
    assert login.json()["username"] == "reporter-one"


def test_user_can_signup_with_phone_and_duplicates_are_rejected(client: TestClient) -> None:
    payload = {
        "contact_type": "phone",
        "contact": "+254 700 000 111",
        "username": "phone-reporter",
        "password": "strong-password-123",
    }
    first = client.post("/auth/signup", json=payload)
    second = client.post("/auth/signup", json={**payload, "username": "phone-reporter-two"})

    assert first.status_code == 201
    assert first.json()["contact"] == "+254700000111"
    assert second.status_code == 409


def test_weak_signup_password_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/auth/signup",
        json={
            "contact_type": "email",
            "contact": "weak@example.test",
            "username": "weak-user",
            "password": "short",
        },
    )

    assert response.status_code == 422


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
    approve_report_for_public_stats(client)
    approve_report_for_public_stats(client)

    below_threshold = client.get("/public/stats").json()
    assert below_threshold["by_region"] == []

    client.post("/community/reports", json=report_payload("region-003"))
    approve_report_for_public_stats(client)
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


def test_city_and_village_are_required_for_new_reports(client: TestClient) -> None:
    payload = report_payload("missing-city-village")
    payload["city"] = ""
    payload["village"] = ""

    response = client.post("/community/reports", json=payload)

    assert response.status_code == 422


def test_other_category_requires_text_and_can_be_reclassified(client: TestClient) -> None:
    payload = report_payload("other-category-case")
    payload["category"] = "other"
    missing = client.post("/community/reports", json=payload)
    assert missing.status_code == 422

    payload["reporter_category_text"] = "blocked road access"
    submitted = client.post("/community/reports", json=payload)
    assert submitted.status_code == 201

    client.post("/responder/auth/login", json={"username": "responder", "password": "amani-responder-dev"})
    report = client.get("/responder/reports").json()[0]
    assert report["reporter_category_text"] == "blocked road access"

    updated = client.patch(
        f"/responder/reports/{report['id']}/category",
        json={"assigned_category": "custom", "assigned_category_label": "Road access", "category_edit_note": "Local pattern"},
    )

    assert updated.status_code == 200
    assert updated.json()["assigned_category"] == "custom"
    assert updated.json()["assigned_category_label"] == "Road access"

    client.patch(f"/responder/reports/{report['id']}/public-review", json={"approved": True})
    client.post("/responder/auth/logout")
    client.post("/auth/login", json={"username": "admin", "password": "amani-admin-dev-password"})
    client.patch(f"/admin/reports/{report['id']}/public-approval", json={"approved": True})
    stats = client.get("/public/stats").json()
    assert "blocked road access" not in str(stats)


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


def test_location_search_normalizes_provider_results(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_provider(_: str):
        return [
            location_search.normalize_nominatim_item(
                {
                    "display_name": "Westlands, Nairobi, Kenya",
                    "place_id": 123,
                    "address": {
                        "country": "Kenya",
                        "country_code": "ke",
                        "city": "Nairobi",
                        "suburb": "Westlands",
                        "road": "Waiyaki Way",
                    },
                }
            )
        ]

    monkeypatch.setattr(location_search, "_provider_search", fake_provider)

    response = client.get("/location/search?q=westlands")

    assert response.status_code == 200
    body = response.json()
    assert body[0]["country"] == "Kenya"
    assert body[0]["city"] == "Nairobi"
    assert body[0]["village"] == "Westlands"
    assert body[0]["landmark"] == "Waiyaki Way"


def test_assignment_matching_creates_notification_and_minimal_email(client: TestClient) -> None:
    admin_login = client.post(
        "/responder/auth/login",
        json={"username": "admin", "password": "amani-admin-dev-password"},
    )
    assert admin_login.status_code == 200
    users = client.get("/admin/users").json()
    responder = next(user for user in users if user["username"] == "responder")
    assignment = client.post(
        f"/admin/responders/{responder['id']}/assignments",
        json={"scope_type": "city", "country": "Kenya", "city": "Nairobi"},
    )
    assert assignment.status_code == 201
    client.post("/responder/auth/logout")

    submitted = client.post("/community/reports", json=report_payload("notification-case"))
    assert submitted.status_code == 201
    assert notifications.OUTBOX
    assert "There is a growing dispute" not in notifications.OUTBOX[0].body
    assert "nairobi" in notifications.OUTBOX[0].body

    responder_login = client.post(
        "/responder/auth/login",
        json={"username": "responder", "password": "amani-responder-dev"},
    )
    assert responder_login.status_code == 200
    response = client.get("/responder/notifications")
    assert response.status_code == 200
    notification = response.json()[0]
    assert notification["case_id"] == submitted.json()["case_id"]

    marked = client.post(f"/responder/notifications/{notification['id']}/read")
    assert marked.status_code == 200
    assert marked.json()["read_at"] is not None


def test_responder_content_requires_admin_approval_before_public_visibility(client: TestClient) -> None:
    client.post("/responder/auth/login", json={"username": "responder", "password": "amani-responder-dev"})
    created = client.post(
        "/responder/content",
        json=content_payload(),
    )
    assert created.status_code == 201
    content_id = created.json()["id"]
    assert client.get("/public/content").json() == []

    submitted = client.post(f"/responder/content/{content_id}/submit")
    assert submitted.status_code == 200
    client.post("/responder/auth/logout")

    client.post("/auth/login", json={"username": "admin", "password": "amani-admin-dev-password"})
    review_items = client.get("/admin/content/review")
    assert review_items.status_code == 200
    assert review_items.json()[0]["id"] == content_id

    approved = client.post(f"/admin/content/{content_id}/approve", json={"note": "Approved"})
    assert approved.status_code == 200
    public_items = client.get("/public/content").json()
    assert len(public_items) == 1
    assert public_items[0]["title"] == "Water point guidance"
    assert public_items[0]["hero_message"] == "Practical steps for safer shared water use."
    assert public_items[0]["body_json"]["type"] == "doc"
    assert "created_by_username" not in public_items[0]


def test_article_requires_hero_message_and_rich_body(client: TestClient) -> None:
    client.post("/responder/auth/login", json={"username": "responder", "password": "amani-responder-dev"})

    missing_hero = client.post(
        "/responder/content",
        json=content_payload(hero_message=""),
    )
    assert missing_hero.status_code == 422

    missing_body_json = client.post(
        "/responder/content",
        json=content_payload(title="Missing rich body", body_json=None),
    )
    assert missing_body_json.status_code == 422


def test_article_rejects_unsupported_rich_text_nodes(client: TestClient) -> None:
    client.post("/responder/auth/login", json={"username": "responder", "password": "amani-responder-dev"})

    response = client.post(
        "/responder/content",
        json=content_payload(body_json={"type": "doc", "content": [{"type": "image"}]}),
    )

    assert response.status_code == 422


def test_article_rich_text_allows_uploaded_image_references(client: TestClient) -> None:
    client.post("/responder/auth/login", json={"username": "responder", "password": "amani-responder-dev"})

    body = rich_article_body()
    body["content"].append({"type": "articleImage", "attrs": {"assetId": 1, "alt": "Water point image"}})
    response = client.post(
        "/responder/content",
        json=content_payload(body_json=body),
    )

    assert response.status_code == 201
    assert response.json()["body_json"]["content"][-1]["type"] == "articleImage"


def test_content_assets_require_clean_scan_before_admin_approval(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    upload_dir = Path(__file__).resolve().parent / ".tmp" / f"uploads-{uuid4().hex}"
    monkeypatch.setattr(store.settings, "media_upload_dir", str(upload_dir))
    monkeypatch.setattr(store.settings, "media_dev_mark_clean", False)

    client.post("/responder/auth/login", json={"username": "responder", "password": "amani-responder-dev"})
    created = client.post(
        "/responder/content",
        json=content_payload(
            title="Meeting safety note",
            hero_message="Choose safe ways to join public meetings.",
            summary="A short public update about safe meeting participation.",
            body_text="Attend public meetings only when safe and avoid sharing private report information.",
        ),
    )
    content_id = created.json()["id"]
    uploaded = client.post(
        f"/responder/content/{content_id}/assets",
        files={"file": ("notice.pdf", b"%PDF-1.4\nsafe test pdf", "application/pdf")},
    )
    assert uploaded.status_code == 201
    assert uploaded.json()["scan_status"] == "pending"
    client.post(f"/responder/content/{content_id}/submit")
    client.post("/responder/auth/logout")

    client.post("/auth/login", json={"username": "admin", "password": "amani-admin-dev-password"})
    blocked = client.post(f"/admin/content/{content_id}/approve", json={"note": "Needs clean scan"})
    assert blocked.status_code == 404
    assert client.get("/public/content").json() == []


def test_content_asset_upload_rejects_unsafe_file_type(client: TestClient) -> None:
    client.post("/responder/auth/login", json={"username": "responder", "password": "amani-responder-dev"})
    created = client.post(
        "/responder/content",
        json=content_payload(
            title="Safe update",
            hero_message="A safe public update for file validation.",
            summary="A short public update for testing file validation.",
            body_text="This article is long enough for validation and should not expose reports.",
        ),
    )
    content_id = created.json()["id"]
    rejected = client.post(
        f"/responder/content/{content_id}/assets",
        files={"file": ("bad.html", b"<script>alert(1)</script>", "text/html")},
    )
    assert rejected.status_code == 415


def test_meeting_content_validation_and_non_admin_approval_block(client: TestClient) -> None:
    client.post("/responder/auth/login", json={"username": "responder", "password": "amani-responder-dev"})
    invalid = client.post(
        "/responder/content",
        json={
            "content_type": "meeting",
            "title": "Village meeting",
            "summary": "A public discussion about peaceful resource sharing.",
        },
    )
    assert invalid.status_code == 422

    blocked = client.post("/admin/content/1/approve", json={"note": "not admin"})
    assert blocked.status_code == 403
