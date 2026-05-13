from __future__ import annotations

import hashlib
import json
import secrets
import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from .schemas import (
    AdminUserSummary,
    AccountContactType,
    AccountSignup,
    AreaAssignment,
    AreaAssignmentCreate,
    CaseStatusResponse,
    ContentStatus,
    ContentAssetScanStatus,
    ContentAssetType,
    ContentType,
    PublicBucket,
    PublicContent,
    PublicContentAsset,
    PublicContentCreate,
    PublicContentReview,
    PublicContentUpdate,
    PublicReviewUpdate,
    PublicStats,
    PublicWeeklyTrend,
    ReportCategory,
    ReportCategoryUpdate,
    ReportCreate,
    ReportCreateResponse,
    ReportStatus,
    ResponderNotification,
    ResponderReport,
    ResponderStatusUpdate,
    UserRole,
)
from .settings import settings

DATABASE_PATH = (
    Path(settings.database_url.removeprefix("sqlite:///")).resolve()
    if settings.database_url.startswith("sqlite:///")
    else Path(__file__).resolve().parent.parent / "amani_circle.sqlite3"
)
PUBLIC_MIN_BUCKET_COUNT = settings.public_bucket_threshold
PUBLIC_REGION_MIN_BUCKET_COUNT = settings.public_bucket_threshold
CASE_ID_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"


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
                reporter_category_text TEXT,
                assigned_category TEXT,
                assigned_category_label TEXT,
                category_edited_by TEXT,
                category_edited_at TEXT,
                category_edit_note TEXT,
                urgency TEXT NOT NULL,
                status TEXT NOT NULL,
                details TEXT NOT NULL,
                rough_location TEXT NOT NULL,
                country TEXT NOT NULL,
                city TEXT,
                village TEXT,
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
                responder_public_approved INTEGER NOT NULL DEFAULT 0,
                admin_public_approved INTEGER NOT NULL DEFAULT 0,
                public_approved_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        existing_report_columns = {
            row["name"] for row in connection.execute("PRAGMA table_info(reports)").fetchall()
        }
        for column_name, column_definition in {
            "country": "TEXT NOT NULL DEFAULT 'unknown'",
            "city": "TEXT",
            "village": "TEXT",
            "responder_public_approved": "INTEGER NOT NULL DEFAULT 0",
            "admin_public_approved": "INTEGER NOT NULL DEFAULT 0",
            "public_approved_at": "TEXT",
            "reporter_category_text": "TEXT",
            "assigned_category": "TEXT",
            "assigned_category_label": "TEXT",
            "category_edited_by": "TEXT",
            "category_edited_at": "TEXT",
            "category_edit_note": "TEXT",
        }.items():
            if column_name not in existing_report_columns:
                connection.execute(f"ALTER TABLE reports ADD COLUMN {column_name} {column_definition}")
        connection.execute("UPDATE reports SET assigned_category = category WHERE assigned_category IS NULL")
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL UNIQUE,
                contact_type TEXT NOT NULL DEFAULT 'email',
                contact TEXT NOT NULL UNIQUE DEFAULT '',
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                contact_verified_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        existing_user_columns = {
            row["name"] for row in connection.execute("PRAGMA table_info(users)").fetchall()
        }
        for column_name, column_definition in {
            "contact_type": "TEXT NOT NULL DEFAULT 'email'",
            "contact": "TEXT NOT NULL DEFAULT ''",
            "is_active": "INTEGER NOT NULL DEFAULT 1",
            "contact_verified_at": "TEXT",
        }.items():
            if column_name not in existing_user_columns:
                connection.execute(f"ALTER TABLE users ADD COLUMN {column_name} {column_definition}")
        connection.execute("UPDATE users SET contact = email WHERE contact = ''")
        connection.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_contact ON users(contact)")
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token_hash TEXT NOT NULL UNIQUE,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                revoked_at TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS responder_area_assignments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                scope_type TEXT NOT NULL,
                country TEXT NOT NULL,
                city TEXT,
                village TEXT,
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS responder_notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                report_id INTEGER NOT NULL,
                notification_type TEXT NOT NULL,
                read_at TEXT,
                created_at TEXT NOT NULL,
                UNIQUE(user_id, report_id, notification_type),
                FOREIGN KEY(user_id) REFERENCES users(id),
                FOREIGN KEY(report_id) REFERENCES reports(id)
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS public_content (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content_type TEXT NOT NULL,
                title TEXT NOT NULL,
                hero_message TEXT,
                summary TEXT NOT NULL,
                body TEXT,
                body_json TEXT,
                body_text TEXT,
                meeting_starts_at TEXT,
                meeting_location TEXT,
                country TEXT,
                city TEXT,
                village TEXT,
                status TEXT NOT NULL,
                created_by_user_id INTEGER NOT NULL,
                submitted_at TEXT,
                reviewed_by_user_id INTEGER,
                reviewed_at TEXT,
                admin_review_note TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(created_by_user_id) REFERENCES users(id),
                FOREIGN KEY(reviewed_by_user_id) REFERENCES users(id)
            )
            """
        )
        existing_content_columns = {
            row["name"] for row in connection.execute("PRAGMA table_info(public_content)").fetchall()
        }
        for column_name, column_definition in {
            "hero_message": "TEXT",
            "body_json": "TEXT",
            "body_text": "TEXT",
        }.items():
            if column_name not in existing_content_columns:
                connection.execute(f"ALTER TABLE public_content ADD COLUMN {column_name} {column_definition}")
        connection.execute("UPDATE public_content SET body_text = body WHERE body_text IS NULL AND body IS NOT NULL")
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS public_content_assets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content_id INTEGER NOT NULL,
                asset_type TEXT NOT NULL,
                original_filename TEXT NOT NULL,
                stored_filename TEXT NOT NULL,
                mime_type TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                sha256_hash TEXT NOT NULL,
                scan_status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(content_id) REFERENCES public_content(id)
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
    bootstrap_default_users()


def normalize_area(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = " ".join(value.strip().lower().split())
    return cleaned or None


def normalize_contact(contact_type: AccountContactType | str, contact: str) -> str:
    cleaned = contact.strip().lower()
    if str(contact_type) == AccountContactType.phone.value:
        prefix = "+" if cleaned.startswith("+") else ""
        return prefix + "".join(ch for ch in cleaned if ch.isdigit())
    return cleaned


def create_user(
    username: str,
    contact_type: AccountContactType,
    contact: str,
    password_hash: str,
    role: UserRole,
    *,
    verified: bool = False,
) -> int:
    created_at = now_iso()
    normalized_contact = normalize_contact(contact_type, contact)
    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO users (
                username, email, contact_type, contact, password_hash, role,
                is_active, contact_verified_at, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
            """,
            (
                username.strip(),
                normalized_contact if contact_type == AccountContactType.email else f"{username}@local.invalid",
                contact_type.value,
                normalized_contact,
                password_hash,
                role.value,
                created_at if verified else None,
                created_at,
                created_at,
            ),
        )
        connection.commit()
        return int(cursor.lastrowid)


def signup_user(signup: AccountSignup, password_hash: str) -> int:
    init_db()
    return create_user(signup.username, signup.contact_type, signup.contact, password_hash, UserRole.reporter)


def bootstrap_default_users() -> None:
    from .auth import hash_password

    with get_connection() as connection:
        count = connection.execute("SELECT COUNT(*) AS count FROM users").fetchone()["count"]
        if count:
            return
    create_user(
        settings.bootstrap_admin_username,
        AccountContactType.email,
        settings.bootstrap_admin_email,
        hash_password(settings.bootstrap_admin_password),
        UserRole.admin,
        verified=True,
    )
    create_user(
        settings.default_responder_username,
        AccountContactType.email,
        settings.default_responder_email,
        hash_password(settings.default_responder_password),
        UserRole.responder,
        verified=True,
    )


def find_user_by_username(username: str) -> sqlite3.Row | None:
    init_db()
    with get_connection() as connection:
        return connection.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()


def find_user_for_login(identifier: str) -> sqlite3.Row | None:
    init_db()
    cleaned = identifier.strip().lower()
    phone_cleaned = normalize_contact(AccountContactType.phone, identifier)
    with get_connection() as connection:
        return connection.execute(
            """
            SELECT * FROM users
            WHERE username = ? OR contact = ? OR contact = ?
            """,
            (identifier.strip(), cleaned, phone_cleaned),
        ).fetchone()


def list_admin_users() -> list[AdminUserSummary]:
    init_db()
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT id, username, contact_type, contact, role, contact_verified_at FROM users ORDER BY username ASC"
        ).fetchall()
    return [
        AdminUserSummary(
            id=row["id"],
            username=row["username"],
            contact_type=row["contact_type"],
            contact=row["contact"],
            role=row["role"],
            contact_verified=bool(row["contact_verified_at"]),
        )
        for row in rows
    ]


def _hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(48)
    created_at = now_iso()
    expires_at = datetime.now(UTC).timestamp() + settings.session_ttl_seconds
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO user_sessions (token_hash, user_id, created_at, expires_at)
            VALUES (?, ?, ?, ?)
            """,
            (_hash_session_token(token), user_id, created_at, datetime.fromtimestamp(expires_at, UTC).isoformat()),
        )
        connection.commit()
    return token


def get_session_user(token: str) -> sqlite3.Row | None:
    init_db()
    with get_connection() as connection:
        return connection.execute(
            """
            SELECT users.*
            FROM user_sessions
            JOIN users ON users.id = user_sessions.user_id
            WHERE user_sessions.token_hash = ?
              AND user_sessions.revoked_at IS NULL
              AND user_sessions.expires_at > ?
            """,
            (_hash_session_token(token), now_iso()),
        ).fetchone()


def revoke_session(token: str) -> None:
    with get_connection() as connection:
        connection.execute(
            "UPDATE user_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL",
            (now_iso(), _hash_session_token(token)),
        )
        connection.commit()


def hash_follow_up_code(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def generate_case_id() -> str:
    first = "".join(secrets.choice(CASE_ID_ALPHABET) for _ in range(4))
    second = "".join(secrets.choice(CASE_ID_ALPHABET) for _ in range(4))
    return f"AC-{first}-{second}"


def normalize_case_id(case_id: str) -> str:
    compact = "".join(character for character in case_id.strip().upper() if character.isalnum())
    if compact.startswith("AC") and len(compact) == 10:
        return f"AC-{compact[2:6]}-{compact[6:10]}"
    if compact.startswith("AC") and len(compact) > 10 and compact[2:6].isdigit():
        return f"AC-{compact[2:6]}-{compact[6:]}"
    return case_id.strip().upper().replace(" ", "")


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
                        case_id, client_report_id, follow_up_hash, category, reporter_category_text,
                        assigned_category, assigned_category_label, urgency, status,
                        details, rough_location, country, city, village, rough_region, nearby_landmark, location_place_type,
                        evidence_notes, contact_preference, contact_method, contact_details,
                        exact_location_consent, exact_latitude, exact_longitude,
                        responder_notes, reporter_message, created_at, updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        case_id,
                        report.client_report_id,
                        hash_follow_up_code(follow_up_code),
                        report.category.value,
                        report.reporter_category_text,
                        report.category.value,
                        None,
                        report.urgency.value,
                        ReportStatus.received.value,
                        report.details,
                        report.rough_location,
                        normalize_area(report.country) or report.country.strip().lower(),
                        normalize_area(report.city),
                        normalize_area(report.village),
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
        create_report_notifications(connection, report_id, case_id, report)
        connection.commit()

    return ReportCreateResponse(
        case_id=case_id,
        follow_up_code=follow_up_code,
        status=ReportStatus.received,
    )


def lookup_case_status(case_id: str, follow_up_code: str) -> CaseStatusResponse | None:
    init_db()
    normalized_case_id = normalize_case_id(case_id)
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT case_id, status, reporter_message, updated_at
            FROM reports
            WHERE case_id = ? AND follow_up_hash = ?
            """,
            (normalized_case_id, hash_follow_up_code(follow_up_code)),
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
        reporter_category_text=row["reporter_category_text"],
        assigned_category=row["assigned_category"] or row["category"],
        assigned_category_label=row["assigned_category_label"],
        category_edited_by=row["category_edited_by"],
        category_edited_at=row["category_edited_at"],
        category_edit_note=row["category_edit_note"],
        urgency=row["urgency"],
        status=row["status"],
        rough_location=row["rough_location"],
        country=row["country"],
        city=row["city"],
        village=row["village"],
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
        responder_public_approved=bool(row["responder_public_approved"]),
        admin_public_approved=bool(row["admin_public_approved"]),
        public_approved_at=row["public_approved_at"],
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
        clauses.append("COALESCE(assigned_category, category) = ?")
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


def update_report_category(
    report_id: int,
    update: ReportCategoryUpdate,
    actor: str = "responder",
) -> ResponderReport | None:
    init_db()
    updated_at = now_iso()
    with get_connection() as connection:
        existing = connection.execute("SELECT category FROM reports WHERE id = ?", (report_id,)).fetchone()
        if not existing:
            return None
        assigned_category = update.assigned_category
        connection.execute(
            """
            UPDATE reports
            SET assigned_category = ?,
                assigned_category_label = ?,
                category_edited_by = ?,
                category_edited_at = ?,
                category_edit_note = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (
                assigned_category,
                update.assigned_category_label,
                actor,
                updated_at,
                update.category_edit_note,
                updated_at,
                report_id,
            ),
        )
        connection.execute(
            """
            INSERT INTO report_status_history (report_id, previous_status, new_status, actor, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (report_id, existing["category"], f"category:{assigned_category}", actor, updated_at),
        )
        connection.commit()
        row = connection.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()
    return row_to_responder_report(row) if row else None


def update_responder_public_review(
    report_id: int,
    update: PublicReviewUpdate,
    actor: str = "responder",
) -> ResponderReport | None:
    init_db()
    updated_at = now_iso()
    with get_connection() as connection:
        existing = connection.execute("SELECT id FROM reports WHERE id = ?", (report_id,)).fetchone()
        if not existing:
            return None
        connection.execute(
            """
            UPDATE reports
            SET responder_public_approved = ?,
                admin_public_approved = CASE WHEN ? = 0 THEN 0 ELSE admin_public_approved END,
                public_approved_at = CASE WHEN ? = 0 THEN NULL ELSE public_approved_at END,
                updated_at = ?
            WHERE id = ?
            """,
            (1 if update.approved else 0, 1 if update.approved else 0, 1 if update.approved else 0, updated_at, report_id),
        )
        connection.execute(
            """
            INSERT INTO report_status_history (report_id, previous_status, new_status, actor, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (report_id, None, "public_review_recommended" if update.approved else "public_review_removed", actor, updated_at),
        )
        connection.commit()
        row = connection.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()
    return row_to_responder_report(row) if row else None


def update_admin_public_approval(
    report_id: int,
    update: PublicReviewUpdate,
    actor: str = "admin",
) -> ResponderReport | None:
    init_db()
    updated_at = now_iso()
    with get_connection() as connection:
        existing = connection.execute(
            "SELECT responder_public_approved FROM reports WHERE id = ?",
            (report_id,),
        ).fetchone()
        if not existing:
            return None
        if update.approved and not bool(existing["responder_public_approved"]):
            return None
        connection.execute(
            """
            UPDATE reports
            SET admin_public_approved = ?,
                public_approved_at = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (1 if update.approved else 0, updated_at if update.approved else None, updated_at, report_id),
        )
        connection.execute(
            """
            INSERT INTO report_status_history (report_id, previous_status, new_status, actor, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (report_id, None, "public_approved" if update.approved else "public_approval_removed", actor, updated_at),
        )
        connection.commit()
        row = connection.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()
    return row_to_responder_report(row) if row else None


def create_area_assignment(user_id: int, assignment: AreaAssignmentCreate) -> AreaAssignment:
    init_db()
    created_at = now_iso()
    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO responder_area_assignments
                (user_id, scope_type, country, city, village, active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 1, ?, ?)
            """,
            (
                user_id,
                assignment.scope_type.value,
                normalize_area(assignment.country) or assignment.country.strip().lower(),
                normalize_area(assignment.city),
                normalize_area(assignment.village),
                created_at,
                created_at,
            ),
        )
        connection.commit()
        row = connection.execute(
            "SELECT * FROM responder_area_assignments WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()
    return row_to_area_assignment(row)


def row_to_area_assignment(row: sqlite3.Row) -> AreaAssignment:
    return AreaAssignment(
        id=row["id"],
        user_id=row["user_id"],
        scope_type=row["scope_type"],
        country=row["country"],
        city=row["city"],
        village=row["village"],
        active=bool(row["active"]),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def list_area_assignments(user_id: int) -> list[AreaAssignment]:
    init_db()
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM responder_area_assignments WHERE user_id = ? AND active = 1 ORDER BY created_at DESC",
            (user_id,),
        ).fetchall()
    return [row_to_area_assignment(row) for row in rows]


def delete_area_assignment(user_id: int, assignment_id: int) -> bool:
    with get_connection() as connection:
        cursor = connection.execute(
            """
            UPDATE responder_area_assignments
            SET active = 0, updated_at = ?
            WHERE id = ? AND user_id = ? AND active = 1
            """,
            (now_iso(), assignment_id, user_id),
        )
        connection.commit()
    return cursor.rowcount > 0


def _matching_assignment_clause(report: ReportCreate) -> tuple[str, tuple[str | None, ...]]:
    country = normalize_area(report.country) or report.country.strip().lower()
    city = normalize_area(report.city)
    village = normalize_area(report.village)
    return (
        """
        (
            (scope_type = 'country' AND country = ?)
            OR (scope_type = 'city' AND country = ? AND city = ?)
            OR (scope_type = 'village' AND country = ? AND city = ? AND village = ?)
        )
        """,
        (country, country, city, country, city, village),
    )


def create_report_notifications(connection: sqlite3.Connection, report_id: int, case_id: str, report: ReportCreate) -> None:
    from .notifications import send_new_report_email

    clause, params = _matching_assignment_clause(report)
    rows = connection.execute(
        f"""
        SELECT DISTINCT users.id, users.email
        FROM responder_area_assignments
        JOIN users ON users.id = responder_area_assignments.user_id
        WHERE responder_area_assignments.active = 1
          AND users.role IN ('responder', 'admin')
          AND {clause}
        """,
        params,
    ).fetchall()
    created_at = now_iso()
    for row in rows:
        connection.execute(
            """
            INSERT OR IGNORE INTO responder_notifications
                (user_id, report_id, notification_type, read_at, created_at)
            VALUES (?, ?, 'new_report', NULL, ?)
            """,
            (row["id"], report_id, created_at),
        )
        send_new_report_email(
            recipient=row["email"],
            case_id=case_id,
            category=report.category.value,
            urgency=report.urgency.value,
            country=normalize_area(report.country) or report.country.strip().lower(),
            city=normalize_area(report.city),
            village=normalize_area(report.village),
            created_at=created_at,
        )


def list_notifications(user_id: int) -> list[ResponderNotification]:
    init_db()
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT notifications.id, notifications.report_id, reports.case_id, notifications.notification_type,
                   notifications.read_at, notifications.created_at
            FROM responder_notifications AS notifications
            JOIN reports ON reports.id = notifications.report_id
            WHERE notifications.user_id = ?
            ORDER BY notifications.created_at DESC
            """,
            (user_id,),
        ).fetchall()
    return [
        ResponderNotification(
            id=row["id"],
            report_id=row["report_id"],
            case_id=row["case_id"],
            notification_type=row["notification_type"],
            read_at=row["read_at"],
            created_at=row["created_at"],
        )
        for row in rows
    ]


def mark_notification_read(user_id: int, notification_id: int) -> ResponderNotification | None:
    read_at = now_iso()
    with get_connection() as connection:
        connection.execute(
            """
            UPDATE responder_notifications
            SET read_at = COALESCE(read_at, ?)
            WHERE id = ? AND user_id = ?
            """,
            (read_at, notification_id, user_id),
        )
        row = connection.execute(
            """
            SELECT notifications.id, notifications.report_id, reports.case_id, notifications.notification_type,
                   notifications.read_at, notifications.created_at
            FROM responder_notifications AS notifications
            JOIN reports ON reports.id = notifications.report_id
            WHERE notifications.id = ? AND notifications.user_id = ?
            """,
            (notification_id, user_id),
        ).fetchone()
        connection.commit()
    if not row:
        return None
    return ResponderNotification(
        id=row["id"],
        report_id=row["report_id"],
        case_id=row["case_id"],
        notification_type=row["notification_type"],
        read_at=row["read_at"],
        created_at=row["created_at"],
    )


def row_to_public_content(row: sqlite3.Row) -> PublicContent:
    assets = list_content_assets(row["id"])
    body_json = json.loads(row["body_json"]) if row["body_json"] else None
    body_text = row["body_text"] or row["body"]
    return PublicContent(
        id=row["id"],
        content_type=ContentType(row["content_type"]),
        title=row["title"],
        hero_message=row["hero_message"],
        summary=row["summary"],
        body=row["body"],
        body_json=body_json,
        body_text=body_text,
        meeting_starts_at=row["meeting_starts_at"],
        meeting_location=row["meeting_location"],
        country=row["country"],
        city=row["city"],
        village=row["village"],
        status=ContentStatus(row["status"]),
        created_by_username=row["created_by_username"],
        submitted_at=row["submitted_at"],
        reviewed_by_username=row["reviewed_by_username"],
        reviewed_at=row["reviewed_at"],
        admin_review_note=row["admin_review_note"],
        assets=assets,
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def row_to_content_asset(row: sqlite3.Row) -> PublicContentAsset:
    return PublicContentAsset(
        id=row["id"],
        content_id=row["content_id"],
        asset_type=ContentAssetType(row["asset_type"]),
        original_filename=row["original_filename"],
        mime_type=row["mime_type"],
        file_size=row["file_size"],
        sha256_hash=row["sha256_hash"],
        scan_status=ContentAssetScanStatus(row["scan_status"]),
        created_at=row["created_at"],
    )


def _public_content_select() -> str:
    return """
        SELECT content.*,
               creator.username AS created_by_username,
               reviewer.username AS reviewed_by_username
        FROM public_content AS content
        JOIN users AS creator ON creator.id = content.created_by_user_id
        LEFT JOIN users AS reviewer ON reviewer.id = content.reviewed_by_user_id
    """


def create_public_content(user_id: int, content: PublicContentCreate) -> PublicContent:
    init_db()
    created_at = now_iso()
    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO public_content (
                content_type, title, hero_message, summary, body, body_json, body_text, meeting_starts_at, meeting_location,
                country, city, village, status, created_by_user_id, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                content.content_type.value,
                content.title,
                content.hero_message,
                content.summary,
                content.body,
                json.dumps(content.body_json) if content.body_json else None,
                content.body_text,
                content.meeting_starts_at,
                content.meeting_location,
                normalize_area(content.country),
                normalize_area(content.city),
                normalize_area(content.village),
                ContentStatus.draft.value,
                user_id,
                created_at,
                created_at,
            ),
        )
        connection.commit()
        row = connection.execute(f"{_public_content_select()} WHERE content.id = ?", (cursor.lastrowid,)).fetchone()
    return row_to_public_content(row)


def create_content_asset(content_id: int, user_id: int, metadata: dict[str, object]) -> PublicContentAsset | None:
    init_db()
    created_at = now_iso()
    with get_connection() as connection:
        existing = connection.execute(
            """
            SELECT id, status
            FROM public_content
            WHERE id = ? AND created_by_user_id = ?
            """,
            (content_id, user_id),
        ).fetchone()
        if not existing or existing["status"] not in {ContentStatus.draft.value, ContentStatus.rejected.value}:
            return None
        cursor = connection.execute(
            """
            INSERT INTO public_content_assets (
                content_id, asset_type, original_filename, stored_filename, mime_type,
                file_size, sha256_hash, scan_status, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                content_id,
                metadata["asset_type"].value,
                metadata["original_filename"],
                metadata["stored_filename"],
                metadata["mime_type"],
                metadata["file_size"],
                metadata["sha256_hash"],
                metadata["scan_status"].value,
                created_at,
            ),
        )
        connection.commit()
        row = connection.execute("SELECT * FROM public_content_assets WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return row_to_content_asset(row)


def list_content_assets(content_id: int) -> list[PublicContentAsset]:
    init_db()
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM public_content_assets WHERE content_id = ? ORDER BY created_at ASC",
            (content_id,),
        ).fetchall()
    return [row_to_content_asset(row) for row in rows]


def delete_content_asset(content_id: int, asset_id: int, user_id: int) -> bool:
    init_db()
    with get_connection() as connection:
        existing = connection.execute(
            """
            SELECT assets.id
            FROM public_content_assets AS assets
            JOIN public_content ON public_content.id = assets.content_id
            WHERE assets.id = ? AND assets.content_id = ? AND public_content.created_by_user_id = ?
              AND public_content.status IN (?, ?)
            """,
            (asset_id, content_id, user_id, ContentStatus.draft.value, ContentStatus.rejected.value),
        ).fetchone()
        if not existing:
            return False
        connection.execute("DELETE FROM public_content_assets WHERE id = ?", (asset_id,))
        connection.commit()
    return True


def list_responder_content(user_id: int) -> list[PublicContent]:
    init_db()
    with get_connection() as connection:
        rows = connection.execute(
            f"{_public_content_select()} WHERE content.created_by_user_id = ? ORDER BY content.updated_at DESC",
            (user_id,),
        ).fetchall()
    return [row_to_public_content(row) for row in rows]


def update_public_content(user_id: int, content_id: int, update: PublicContentUpdate) -> PublicContent | None:
    init_db()
    updated_at = now_iso()
    with get_connection() as connection:
        existing = connection.execute(
            "SELECT * FROM public_content WHERE id = ? AND created_by_user_id = ?",
            (content_id, user_id),
        ).fetchone()
        if not existing or existing["status"] not in {ContentStatus.draft.value, ContentStatus.rejected.value}:
            return None
        next_values = dict(existing)
        for key, value in update.model_dump(exclude_unset=True).items():
            if key == "body_json":
                next_values[key] = json.dumps(value) if value else None
            else:
                next_values[key] = normalize_area(value) if key in {"country", "city", "village"} else value
        if next_values.get("body_text"):
            next_values["body"] = next_values["body_text"]
        content_type = ContentType(existing["content_type"])
        if content_type == ContentType.article and (
            not next_values.get("hero_message")
            or not next_values.get("body_text")
            or not next_values.get("body_json")
        ):
            return None
        if content_type == ContentType.meeting and (not next_values.get("meeting_starts_at") or not next_values.get("meeting_location")):
            return None
        connection.execute(
            """
            UPDATE public_content
            SET title = ?, hero_message = ?, summary = ?, body = ?, body_json = ?, body_text = ?,
                meeting_starts_at = ?, meeting_location = ?,
                country = ?, city = ?, village = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                next_values["title"],
                next_values["hero_message"],
                next_values["summary"],
                next_values["body"],
                next_values["body_json"],
                next_values["body_text"],
                next_values["meeting_starts_at"],
                next_values["meeting_location"],
                next_values["country"],
                next_values["city"],
                next_values["village"],
                updated_at,
                content_id,
            ),
        )
        connection.commit()
        row = connection.execute(f"{_public_content_select()} WHERE content.id = ?", (content_id,)).fetchone()
    return row_to_public_content(row) if row else None


def submit_public_content(user_id: int, content_id: int) -> PublicContent | None:
    init_db()
    submitted_at = now_iso()
    with get_connection() as connection:
        existing = connection.execute(
            "SELECT status FROM public_content WHERE id = ? AND created_by_user_id = ?",
            (content_id, user_id),
        ).fetchone()
        if not existing or existing["status"] not in {ContentStatus.draft.value, ContentStatus.rejected.value}:
            return None
        connection.execute(
            """
            UPDATE public_content
            SET status = ?, submitted_at = ?, reviewed_by_user_id = NULL, reviewed_at = NULL,
                admin_review_note = NULL, updated_at = ?
            WHERE id = ?
            """,
            (ContentStatus.submitted.value, submitted_at, submitted_at, content_id),
        )
        connection.commit()
        row = connection.execute(f"{_public_content_select()} WHERE content.id = ?", (content_id,)).fetchone()
    return row_to_public_content(row) if row else None


def list_content_for_admin_review() -> list[PublicContent]:
    init_db()
    with get_connection() as connection:
        rows = connection.execute(
            f"{_public_content_select()} WHERE content.status = ? ORDER BY content.submitted_at ASC",
            (ContentStatus.submitted.value,),
        ).fetchall()
    return [row_to_public_content(row) for row in rows]


def review_public_content(
    content_id: int,
    reviewer_id: int,
    status: ContentStatus,
    review: PublicContentReview,
) -> PublicContent | None:
    init_db()
    reviewed_at = now_iso()
    with get_connection() as connection:
        existing = connection.execute("SELECT id FROM public_content WHERE id = ?", (content_id,)).fetchone()
        if not existing:
            return None
        if status == ContentStatus.approved:
            unsafe_asset = connection.execute(
                """
                SELECT id FROM public_content_assets
                WHERE content_id = ? AND scan_status != ?
                LIMIT 1
                """,
                (content_id, ContentAssetScanStatus.clean.value),
            ).fetchone()
            if unsafe_asset:
                return None
        connection.execute(
            """
            UPDATE public_content
            SET status = ?, reviewed_by_user_id = ?, reviewed_at = ?, admin_review_note = ?, updated_at = ?
            WHERE id = ?
            """,
            (status.value, reviewer_id, reviewed_at, review.note, reviewed_at, content_id),
        )
        connection.commit()
        row = connection.execute(f"{_public_content_select()} WHERE content.id = ?", (content_id,)).fetchone()
    return row_to_public_content(row) if row else None


def get_public_content_asset(content_id: int, asset_id: int) -> sqlite3.Row | None:
    init_db()
    with get_connection() as connection:
        return connection.execute(
            """
            SELECT assets.*
            FROM public_content_assets AS assets
            JOIN public_content ON public_content.id = assets.content_id
            WHERE assets.id = ?
              AND assets.content_id = ?
              AND assets.scan_status = ?
              AND public_content.status = ?
            """,
            (asset_id, content_id, ContentAssetScanStatus.clean.value, ContentStatus.approved.value),
        ).fetchone()


def list_public_content(content_type: str | None = None) -> list[PublicContent]:
    init_db()
    parameters: list[object] = [ContentStatus.approved.value]
    type_clause = ""
    if content_type:
        type_clause = " AND content.content_type = ?"
        parameters.append(content_type)
    with get_connection() as connection:
        rows = connection.execute(
            f"{_public_content_select()} WHERE content.status = ?{type_clause} ORDER BY content.reviewed_at DESC, content.created_at DESC",
            parameters,
        ).fetchall()
    return [row_to_public_content(row) for row in rows]


def get_approved_public_content(content_id: int) -> PublicContent | None:
    init_db()
    with get_connection() as connection:
        row = connection.execute(
            f"{_public_content_select()} WHERE content.id = ? AND content.status = ?",
            (content_id, ContentStatus.approved.value),
        ).fetchone()
    return row_to_public_content(row) if row else None


def aggregate_bucket(connection: sqlite3.Connection, column: str) -> list[PublicBucket]:
    rows = connection.execute(
        f"""
        SELECT COALESCE({column}, 'not_provided') AS key, COUNT(*) AS count
        FROM reports
        WHERE responder_public_approved = 1 AND admin_public_approved = 1
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
        WHERE responder_public_approved = 1 AND admin_public_approved = 1
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
        WHERE responder_public_approved = 1 AND admin_public_approved = 1
        GROUP BY date(created_at, 'weekday 1', '-7 days')
        ORDER BY week_start DESC
        LIMIT 12
        """
    ).fetchall()
    return [PublicWeeklyTrend(week_start=row["week_start"], count=row["count"]) for row in rows]


def get_public_stats() -> PublicStats:
    init_db()
    with get_connection() as connection:
        total = connection.execute(
            """
            SELECT COUNT(*) AS count
            FROM reports
            WHERE responder_public_approved = 1 AND admin_public_approved = 1
            """
        ).fetchone()["count"]
        return PublicStats(
            total_reports=total,
            by_category=aggregate_bucket(
                connection,
                "COALESCE(NULLIF(assigned_category_label, ''), NULLIF(assigned_category, ''), category)",
            ),
            by_urgency=aggregate_bucket(connection, "urgency"),
            by_status=aggregate_bucket(connection, "status"),
            by_region=aggregate_region_bucket(connection),
            by_week=aggregate_weekly_trend(connection),
        )


def reset_db_for_tests(path: Path | None = None) -> None:
    target = path or DATABASE_PATH
    if target.exists():
        target.unlink()
