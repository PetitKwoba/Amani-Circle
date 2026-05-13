"""Add account signup contact fields."""

from alembic import op

revision = "20260513_0003"
down_revision = "20260513_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN contact_type TEXT NOT NULL DEFAULT 'email'")
    op.execute("ALTER TABLE users ADD COLUMN contact TEXT NOT NULL DEFAULT ''")
    op.execute("ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1")
    op.execute("ALTER TABLE users ADD COLUMN contact_verified_at TEXT")
    op.execute("UPDATE users SET contact = email WHERE contact = ''")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_contact ON users(contact)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_users_contact")
