"""Add category review fields for reports."""

from alembic import op

revision = "20260513_0005"
down_revision = "20260513_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE reports ADD COLUMN reporter_category_text TEXT")
    op.execute("ALTER TABLE reports ADD COLUMN assigned_category TEXT")
    op.execute("ALTER TABLE reports ADD COLUMN assigned_category_label TEXT")
    op.execute("ALTER TABLE reports ADD COLUMN category_edited_by TEXT")
    op.execute("ALTER TABLE reports ADD COLUMN category_edited_at TEXT")
    op.execute("ALTER TABLE reports ADD COLUMN category_edit_note TEXT")
    op.execute("UPDATE reports SET assigned_category = category WHERE assigned_category IS NULL")


def downgrade() -> None:
    pass
