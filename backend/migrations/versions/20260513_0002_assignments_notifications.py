"""Add geographic routing, responder assignments, and notifications."""

from alembic import op

revision = "20260513_0002"
down_revision = "20260512_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE reports ADD COLUMN country TEXT NOT NULL DEFAULT 'unknown'")
    op.execute("ALTER TABLE reports ADD COLUMN city TEXT")
    op.execute("ALTER TABLE reports ADD COLUMN village TEXT")
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    op.execute(
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
    op.execute(
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
    op.execute(
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


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS responder_notifications")
    op.execute("DROP TABLE IF EXISTS responder_area_assignments")
    op.execute("DROP TABLE IF EXISTS user_sessions")
    op.execute("DROP TABLE IF EXISTS users")
