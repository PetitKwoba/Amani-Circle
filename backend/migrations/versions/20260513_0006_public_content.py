"""Add approved public content workflow."""

from alembic import op

revision = "20260513_0006"
down_revision = "20260513_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS public_content (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content_type TEXT NOT NULL,
            title TEXT NOT NULL,
            summary TEXT NOT NULL,
            body TEXT,
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


def downgrade() -> None:
    pass
