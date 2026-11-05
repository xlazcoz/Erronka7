"""Hasierako eskema (baseline).

Alembic sartu aurretik `Base.metadata.create_all` eta `ensure_schema`
erabiltzen ziren. Migrazio hau ereduetan oinarritutako baseline bat da:
datu-base berrietan taula guztiak sortzen ditu. Lehendik dauden datu-baseak
`bootstrap_database()` funtzioak `alembic stamp head` bidez markatzen ditu.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-11-05

"""

from alembic import op

from models.models import Base

revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind())
