from pathlib import Path
from uuid import uuid4

from alembic import command
from alembic.config import Config


def test_alembic_upgrade_head_initializes_clean_database() -> None:
    backend_dir = Path(__file__).resolve().parents[1]
    db_path = backend_dir / "tests" / ".tmp" / f"migration-{uuid4().hex}.sqlite3"
    db_path.parent.mkdir(exist_ok=True)

    config = Config(str(backend_dir / "alembic.ini"))
    config.set_main_option("script_location", str(backend_dir / "migrations"))
    config.set_main_option("sqlalchemy.url", f"sqlite:///{db_path}")

    command.upgrade(config, "head")

    assert db_path.exists()
