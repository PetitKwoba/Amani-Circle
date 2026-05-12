from __future__ import annotations

import hashlib
import secrets
import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from .schemas import (
    CaseStatusResponse,
    PublicBucket,
    PublicStats,
    PublicWeeklyTrend,
    ReportCreate,
    ReportCreateResponse,
    ReportStatus,
    ResponderReport,
    ResponderStatusUpdate,
)
from .settings import settings

DATABASE_PATH = (
    Path(settings.database_url.removeprefix("sqlite:///")).resolve()
    if settings.database_url.startswith("sqlite:///")
    else Path(__file__).resolve().parent.parent / "amani_circle.sqlite3"
)
PUBLIC_MIN_BUCKET_COUNT = settings.public_bucket_threshold
PUBLIC_REGION_MIN_BUCKET_COUNT = settings.public_bucket_threshold


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                case_id TEXT NOT NULL UNIQUE,
                client_report_id TEXT NOT NULL UNIQUE,
                follow_up_hash TEXT NOT NULL,
                category TEXT NOT NULL,
                urgency TEXT NOT NULL,
                status TEXT NOT NULL,
                details TEXT NOT NULL,
                rough_location TEXT NOT NULL,
                rough_region TEXT,
                nearby_landmark TEXT,
                location_place_type TEXT,
                evidence_notes TEXT,
                contact_preference TEXT NOT NULL,
                contact_method TEXT,
                contact_details TEXT,
                exact_location_consent INTEGER NOT NULL DEFAULT 0,
                exact_latitude REAL,
                exact_longitude REAL,
                responder_notes TEXT,
                reporter_message TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS report_status_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                report_id INTEGER NOT NULL,
                previous_status TEXT,
                new_status TEXT NOT NULL,
                actor TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(report_id) REFERENCES reports(id)
            )
            """
        )
        connection.commit()


def hash_follow_up_code(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def generate_case_id() -> str:
    year = datetime.now(UTC).year
    return f"AC-{year}-{secrets.token_hex(5).upper()}"


def create_report(report: ReportCreate) -> ReportCreateResponse:
    init_db()
    created_at = now_iso()

    with get_connection() as connection:
        existing = connection.execute(
            "SELECT case_id, status FROM reports WHERE client_report_id = ?",
            (report.client_report_id,),
        ).fetchone()
        if existing:
            return ReportCreateResponse(
                case_id=existing["case_id"],
                follow_up_code=report.follow_up_secret,
                status=ReportStatus(existing["status"]),
            )

        case_id = generate_case_id()
        follow_up_code = report.follow_up_secret
        coordinates = report.current_location if report.exact_location_consent else None
        reporter_message = "Your report has been received."

        for _ in range(5):
            try:
                connection.execute(
                    """
                    INSERT INTO reports (
                        case_id, client_report_id, follow_up_hash, category, urgency, status,
                        details, rough_location, rough_region, nearby_landmark, location_place_type,
                        evidence_notes, contact_preference, contact_method, contact_details,
                        exact_location_consent, exact_latitude, exact_longitude,
                        responder_notes, reporter_message, created_at, updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        case_id,
                        report.client_report_id,
                        hash_follow_up_code(follow_up_code),
                        report.category.value,
                        report.urgency.value,
                        ReportStatus.received.value,
                        report.details,
                        report.rough_location,
                        report.rough_region,
                        report.nearby_landmark,
                        report.location_place_type,
                        report.evidence_notes,
                        report.contact_preference.value,
                        report.contact_method.value if report.contact_method else None,
                        report.contact_details if report.contact_preference.value != "none" else None,
                        1 if coordinates else 0,
                        coordinates.latitude if coordinates else None,
                        coordinates.longitude if coordinates else None,
                        None,
                        reporter_message,
                        created_at,
                        created_at,
                    ),
                )
                break
            except sqlite3.IntegrityError:
                case_id = generate_case_id()
        else:
            raise RuntimeError("Could not allocate a unique case ID.")
        report_id = connection.execute("SELECT id FROM reports WHERE case_id = ?", (case_id,)).fetchone()["id"]
        connection.execute(
            """
            INSERT INTO report_status_history (report_id, previous_status, new_status, actor, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (report_id, None, ReportStatus.received.value, "community", created_at),
        )
        connection.commit()

    return ReportCreateResponse(
        case_id=case_id,
        follow_up_code=follow_up_code,
        status=ReportStatus.received,
    )


def lookup_case_status(case_id: str, follow_up_code: str) -> CaseStatusResponse | None:
    init_db()
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT case_id, status, reporter_message, updated_at
            FROM reports
            WHERE case_id = ? AND follow_up_hash = ?
            """,
            (case_id, hash_follow_up_code(follow_up_code)),
        ).fetchone()

    if not row:
        return None

    return CaseStatusResponse(
        case_id=row["case_id"],
        status=ReportStatus(row["status"]),
        reporter_message_code="report.received" if row["status"] == ReportStatus.received.value else "report.updated",
        reporter_message=row["reporter_message"],
        updated_at=row["updated_at"],
    )


def row_to_responder_report(row: sqlite3.Row) -> ResponderReport:
    return ResponderReport(
        id=row["id"],
        case_id=row["case_id"],
        category=row["category"],
        urgency=row["urgency"],
        status=row["status"],
        rough_location=row["rough_location"],
        rough_region=row["rough_region"],
        nearby_landmark=row["nearby_landmark"],
        location_place_type=row["location_place_type"],
        details=row["details"],
        evidence_notes=row["evidence_notes"],
        contact_preference=row["contact_preference"],
        contact_method=row["contact_method"],
        contact_details=row["contact_details"],
        has_exact_location=bool(row["exact_location_consent"]),
        exact_latitude=row["exact_latitude"],
        exact_longitude=row["exact_longitude"],
        responder_notes=row["responder_notes"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def list_responder_reports(
    *,
    status: str | None = None,
    category: str | None = None,
    urgency: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[ResponderReport]:
    init_db()
    clauses: list[str] = []
    parameters: list[object] = []
    if status:
        clauses.append("status = ?")
        parameters.append(status)
    if category:
        clauses.append("category = ?")
        parameters.append(category)
    if urgency:
        clauses.append("urgency = ?")
        parameters.append(urgency)
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    with get_connection() as connection:
        rows = connection.execute(
            f"SELECT * FROM reports {where} ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (*parameters, limit, offset),
        ).fetchall()

    return [row_to_responder_report(row) for row in rows]


def update_report_status(report_id: int, update: ResponderStatusUpdate, actor: str = "responder") -> ResponderReport | None:
    init_db()
    updated_at = now_iso()
    with get_connection() as connection:
        existing = connection.execute("SELECT status FROM reports WHERE id = ?", (report_id,)).fetchone()
        if not existing:
            return None
        connection.execute(
            """
            UPDATE reports
            SET status = ?, responder_notes = ?, reporter_message = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                update.status.value,
                update.responder_notes,
                update.reporter_message or "Your report status has been updated.",
                updated_at,
                report_id,
            ),
        )
        connection.execute(
            """
            INSERT INTO report_status_history (report_id, previous_status, new_status, actor, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (report_id, existing["status"], update.status.value, actor, updated_at),
        )
        connection.commit()
        row = connection.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()

    return row_to_responder_report(row) if row else None


def aggregate_bucket(connection: sqlite3.Connection, column: str) -> list[PublicBucket]:
    rows = connection.execute(
        f"""
        SELECT COALESCE({column}, 'not_provided') AS key, COUNT(*) AS count
        FROM reports
        GROUP BY COALESCE({column}, 'not_provided')
        HAVING COUNT(*) >= ?
        ORDER BY count DESC
        """,
        (PUBLIC_MIN_BUCKET_COUNT,),
    ).fetchall()
    return [PublicBucket(key=row["key"], count=row["count"]) for row in rows]


def aggregate_region_bucket(connection: sqlite3.Connection) -> list[PublicBucket]:
    rows = connection.execute(
        """
        SELECT COALESCE(rough_region, 'not_provided') AS key, COUNT(*) AS count
        FROM reports
        GROUP BY COALESCE(rough_region, 'not_provided')
        HAVING COUNT(*) >= ?
        ORDER BY count DESC
        """,
        (PUBLIC_REGION_MIN_BUCKET_COUNT,),
    ).fetchall()
    return [PublicBucket(key=row["key"], count=row["count"]) for row in rows]


def aggregate_weekly_trend(connection: sqlite3.Connection) -> list[PublicWeeklyTrend]:
    rows = connection.execute(
        """
        SELECT date(created_at, 'weekday 1', '-7 days') AS week_start, COUNT(*) AS count
        FROM reports
        GROUP BY date(created_at, 'weekday 1', '-7 days')
        ORDER BY week_start DESC
        LIMIT 12
        """
    ).fetchall()
    return [PublicWeeklyTrend(week_start=row["week_start"], count=row["count"]) for row in rows]


def get_public_stats() -> PublicStats:
    init_db()
    with get_connection() as connection:
        total = connection.execute("SELECT COUNT(*) AS count FROM reports").fetchone()["count"]
        return PublicStats(
            total_reports=total,
            by_category=aggregate_bucket(connection, "category"),
            by_urgency=aggregate_bucket(connection, "urgency"),
            by_status=aggregate_bucket(connection, "status"),
            by_region=aggregate_region_bucket(connection),
            by_week=aggregate_weekly_trend(connection),
        )


def reset_db_for_tests(path: Path | None = None) -> None:
    target = path or DATABASE_PATH
    if target.exists():
        target.unlink()
