"""Add rich article fields to public content."""

from alembic import op

revision = "20260513_0008"
down_revision = "20260513_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for column_name, column_definition in {
        "hero_message": "TEXT",
        "body_json": "TEXT",
        "body_text": "TEXT",
    }.items():
        op.execute(
            f"""
            ALTER TABLE public_content
            ADD COLUMN {column_name} {column_definition}
            """
        )
    op.execute("UPDATE public_content SET body_text = body WHERE body_text IS NULL AND body IS NOT NULL")


def downgrade() -> None:
    pass
