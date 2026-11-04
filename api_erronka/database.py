from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from media import IRUDIAK

DATABASE_URL = ("postgresql+psycopg://postgres:@localhost:5432/alokairu_sistema")

engine = create_engine(DATABASE_URL, echo=False)

SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


STATION_COORDINATES = {
    1: (43.3078, -1.9566),
    2: (43.3210, -1.9850),
    3: (43.3195, -1.9830),
    4: (43.3170, -1.9820),
    5: (43.3240, -1.9760),
    6: (43.2845, -2.1695),
    7: (43.2820, -2.1720),
    8: (43.2860, -2.1660),
    9: (43.2800, -2.1740),
    10: (43.2880, -2.1640),
}

STATION_NAMES = {
    3: ("Kargagunea Easo", "Easo Kalea, 10"),
    4: ("Kargagunea Urbieta", "Urbieta Kalea, 25"),
    5: ("Kargagunea Gros", "Gros Kalea, 5"),
    6: ("Kargagunea Zarautz Antiguo", "Antiguo Auzoa, 12"),
    7: ("Kargagunea Zarautz Amara", "Amara Kalea, 8"),
    8: ("Kargagunea Zarautz Egia", "Egia Kalea, 20"),
    9: ("Kargagunea Zarautz Aiete", "Aiete Pasealekua, 3"),
    10: ("Kargagunea Zarautz Intxaurrondo", "Intxaurrondo Kalea, 14"),
}


def ensure_schema():
    """Lehen faseko datu-basea zutik mantentzeko migrazio arina.

    SQLAlchemy-k ez ditu lehendik dauden tauletan zutabe berriak gehitzen,
    beraz mapa eta udalerriak gehitzeko beharrezko zutabeak hemen gehitzen ditugu.
    """
    with engine.begin() as connection:
        connection.execute(text(
            "ALTER TABLE kargaguneak ADD COLUMN IF NOT EXISTS udalerria_id INTEGER REFERENCES udalerriak(id)"
        ))
        connection.execute(text(
            "ALTER TABLE kargaguneak ADD COLUMN IF NOT EXISTS latitud DOUBLE PRECISION"
        ))
        connection.execute(text(
            "ALTER TABLE kargaguneak ADD COLUMN IF NOT EXISTS longitud DOUBLE PRECISION"
        ))
        connection.execute(text(
            "ALTER TABLE erabiltzaileak ADD COLUMN IF NOT EXISTS udalerria_id "
            "INTEGER REFERENCES udalerriak(id)"
        ))

        connection.execute(text(
            "UPDATE udalerriak SET izena = 'Zarautz' "
            "WHERE lower(izena) = 'errenteria' AND NOT EXISTS "
            "(SELECT 1 FROM udalerriak WHERE lower(izena) = 'zarautz')"
        ))
        connection.execute(text(
            "INSERT INTO udalerriak (izena, aktiboa) "
            "SELECT 'Donostia', TRUE WHERE NOT EXISTS "
            "(SELECT 1 FROM udalerriak WHERE lower(izena) = 'donostia')"
        ))
        connection.execute(text(
            "INSERT INTO udalerriak (izena, aktiboa) "
            "SELECT 'Zarautz', TRUE WHERE NOT EXISTS "
            "(SELECT 1 FROM udalerriak WHERE lower(izena) = 'zarautz')"
        ))

        connection.execute(text(
            "UPDATE kargaguneak SET udalerria_id = "
            "(SELECT id FROM udalerriak WHERE lower(izena) = 'donostia' LIMIT 1) "
            "WHERE udalerria_id IS NULL AND id <= 5"
        ))
        connection.execute(text(
            "UPDATE kargaguneak SET udalerria_id = "
            "(SELECT id FROM udalerriak WHERE lower(izena) = 'zarautz' LIMIT 1) "
            "WHERE udalerria_id IS NULL AND id > 5"
        ))

        for station_id, (latitud, longitud) in STATION_COORDINATES.items():
            connection.execute(
                text(
                    "UPDATE kargaguneak SET latitud = :latitud, longitud = :longitud "
                    "WHERE id = :id AND (latitud IS NULL OR longitud IS NULL "
                    "OR (:id > 5 AND longitud > -1.95))"
                ),
                {"latitud": latitud, "longitud": longitud, "id": station_id},
            )

        for station_id, (izena, helbidea) in STATION_NAMES.items():
            connection.execute(
                text(
                    "UPDATE kargaguneak SET izena = :izena, helbidea = :helbidea "
                    "WHERE id = :id AND izena LIKE 'Kargagunea Demo%'"
                ),
                {"izena": izena, "helbidea": helbidea, "id": station_id},
            )

        for station_id in range(1, 11):
            images = [
                IRUDIAK[(station_id - 1) % len(IRUDIAK)],
                IRUDIAK[station_id % len(IRUDIAK)],
                IRUDIAK[(station_id + 1) % len(IRUDIAK)],
            ]
            connection.execute(
                text(
                    "UPDATE kargaguneak SET irudia1 = :irudia1, irudia2 = :irudia2, "
                    "irudia3 = :irudia3 WHERE id = :id"
                ),
                {
                    "irudia1": images[0],
                    "irudia2": images[1],
                    "irudia3": images[2],
                    "id": station_id,
                },
            )

        # Udalerri-administratzaile demoak.
        connection.execute(text(
            "UPDATE erabiltzaileak SET rola = 'udalerri_admin', udalerria_id = "
            "(SELECT id FROM udalerriak WHERE lower(izena) = 'donostia' LIMIT 1) "
            "WHERE lower(login_email) = 'demo03@example.com' "
            "AND rola = 'user' AND udalerria_id IS NULL"
        ))
        connection.execute(text(
            "UPDATE erabiltzaileak SET rola = 'udalerri_admin', udalerria_id = "
            "(SELECT id FROM udalerriak WHERE lower(izena) = 'zarautz' LIMIT 1) "
            "WHERE lower(login_email) = 'demo04@example.com' "
            "AND rola = 'user' AND udalerria_id IS NULL"
        ))


def get_session():
    with SessionLocal() as session:
        yield session


