"""Add public content assets."""

from alembic import op

revision = "20260513_0007"
down_revision = "20260513_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
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


def downgrade() -> None:
    pass
