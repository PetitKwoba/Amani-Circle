"""Add responder/admin public approval gates."""

from alembic import op

revision = "20260513_0004"
down_revision = "20260513_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE reports ADD COLUMN responder_public_approved INTEGER NOT NULL DEFAULT 0")
    op.execute("ALTER TABLE reports ADD COLUMN admin_public_approved INTEGER NOT NULL DEFAULT 0")
    op.execute("ALTER TABLE reports ADD COLUMN public_approved_at TEXT")


def downgrade() -> None:
    pass
