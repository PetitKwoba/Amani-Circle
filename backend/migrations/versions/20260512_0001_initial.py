"""Initial Amani Circle SQLite schema."""

from alembic import op

revision = "20260512_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
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
    op.execute(
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


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS report_status_history")
    op.execute("DROP TABLE IF EXISTS reports")
