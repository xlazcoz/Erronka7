"""Kargaguneen irudiak lokalizatu.

Wikimedia-ko URL zaharrak WebP fitxategi lokalengatik ordezten ditu.
Erabiltzaileek igotako irudiak ez dira ukitzen.

Revision ID: 0002_local_station_images
Revises: 0001_initial_schema
Create Date: 2026-11-05

"""

from alembic import op
from sqlalchemy import text

from media import IRUDIAK

revision: str = "0002_local_station_images"
down_revision: str | None = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()

    for station_id in range(1, 11):
        images = [
            IRUDIAK[(station_id - 1) % len(IRUDIAK)],
            IRUDIAK[station_id % len(IRUDIAK)],
            IRUDIAK[(station_id + 1) % len(IRUDIAK)],
        ]
        connection.execute(
            text(
                "UPDATE kargaguneak SET "
                "irudia1 = CASE WHEN irudia1 IS NULL "
                "OR irudia1 LIKE 'https://thumb.wikimedia.org/%' "
                "THEN :irudia1 ELSE irudia1 END, "
                "irudia2 = CASE WHEN irudia2 IS NULL "
                "OR irudia2 LIKE 'https://thumb.wikimedia.org/%' "
                "THEN :irudia2 ELSE irudia2 END, "
                "irudia3 = CASE WHEN irudia3 IS NULL "
                "OR irudia3 LIKE 'https://thumb.wikimedia.org/%' "
                "THEN :irudia3 ELSE irudia3 END "
                "WHERE id = :id"
            ),
            {
                "irudia1": images[0],
                "irudia2": images[1],
                "irudia3": images[2],
                "id": station_id,
            },
        )


def downgrade() -> None:
    # Bezeroek jada bide lokalak gorde dituzte; ez dago atzera-urrats segururik.
    pass
