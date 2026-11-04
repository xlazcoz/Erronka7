import os

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from media import IRUDIAK

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://postgres:@localhost:5432/alokairu_sistema",
)

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
            "ALTER TABLE erabiltzaileak ADD COLUMN IF NOT EXISTS aktiboa "
            "BOOLEAN NOT NULL DEFAULT TRUE"
        ))
        connection.execute(text(
            "ALTER TABLE karga_postuak ADD COLUMN IF NOT EXISTS tamaina "
            "VARCHAR(100) NOT NULL DEFAULT 'estandar'"
        ))
        connection.execute(text(
            "ALTER TABLE powerbanks ADD COLUMN IF NOT EXISTS egoera "
            "VARCHAR(100) NOT NULL DEFAULT 'erabilgarri'"
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

        # Aurreko bertsioetako rolak egungo rolen eredura egokitu.
        connection.execute(text(
            "UPDATE erabiltzaileak SET rola = 'admin' WHERE rola = 'superadmin'"
        ))
        connection.execute(text(
            "UPDATE erabiltzaileak SET rola = 'udalerri_admin' "
            "WHERE rola = 'admin' AND udalerria_id IS NOT NULL"
        ))

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

        # Datu zaharrak estatu berrira normalizatu.
        connection.execute(text(
            "UPDATE kargaguneak SET egoera = replace(lower(egoera), ' ', '-')"
        ))

        # Lehen faseko erreserba zaharren datuak zuzendu murrizketak gehitu aurretik.
        connection.execute(text(
            "UPDATE erreserbak SET amaiera_data_ordua = "
            "hasiera_data_ordua + interval '1 hour' "
            "WHERE amaiera_data_ordua <= hasiera_data_ordua"
        ))
        connection.execute(text(
            "UPDATE erreserbak SET egikaritze_data_ordua = hasiera_data_ordua "
            "WHERE egikaritze_data_ordua IS NOT NULL "
            "AND egikaritze_data_ordua < hasiera_data_ordua"
        ))
        connection.execute(text(
            "UPDATE erreserbak SET amaitze_data_ordua = "
            "GREATEST(amaitze_data_ordua, hasiera_data_ordua, egikaritze_data_ordua) "
            "WHERE amaitze_data_ordua IS NOT NULL "
            "AND (amaitze_data_ordua < hasiera_data_ordua "
            "OR (egikaritze_data_ordua IS NOT NULL "
            "AND amaitze_data_ordua < egikaritze_data_ordua))"
        ))

        # Pasahitzen hash modernoek 100 karaktere baino gehiago izan ditzakete.
        connection.execute(text(
            "ALTER TABLE erabiltzaileak ALTER COLUMN login_pasahitza TYPE VARCHAR(255)"
        ))
        connection.execute(text(
            "ALTER TABLE kargaguneak ALTER COLUMN helbidea TYPE VARCHAR(255)"
        ))

        # QR kodea eta atzerapenaren datuak.
        connection.execute(text(
            "ALTER TABLE erreserbak ADD COLUMN IF NOT EXISTS qr_token VARCHAR(64)"
        ))
        connection.execute(text(
            "ALTER TABLE erreserbak ADD COLUMN IF NOT EXISTS berandu BOOLEAN NOT NULL DEFAULT FALSE"
        ))
        connection.execute(text(
            "ALTER TABLE erreserbak ADD COLUMN IF NOT EXISTS karga_extra DOUBLE PRECISION NOT NULL DEFAULT 0"
        ))
        connection.execute(text(
            "UPDATE erreserbak SET qr_token = "
            "md5(random()::text || id::text || clock_timestamp()::text) "
            "WHERE qr_token IS NULL"
        ))
        connection.execute(text(
            "ALTER TABLE erreserbak ALTER COLUMN qr_token SET NOT NULL"
        ))
        connection.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS erreserbak_qr_token_uidx "
            "ON erreserbak (qr_token)"
        ))
        # Erabiltzaile bakoitzak erreserba aktibo bakarra izan dezake.
        connection.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS erreserbak_erabiltzaile_aktibo_uidx "
            "ON erreserbak (erabiltzailea_id) WHERE egoera = 'aktiboa'"
        ))

        # Beharrezko murrizketak. Datu-basea berria bada, create_all-ek
        # sortu dituen murrizketa hauek ez dira berriro gehituko.
        connection.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'erabiltzaileak_rola_check'
                ) THEN
                    ALTER TABLE erabiltzaileak
                    ADD CONSTRAINT erabiltzaileak_rola_check
                    CHECK (rola IN ('user', 'udalerri_admin', 'admin'));
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'erabiltzaileak_udalerri_admin_check'
                ) THEN
                    ALTER TABLE erabiltzaileak
                    ADD CONSTRAINT erabiltzaileak_udalerri_admin_check
                    CHECK (rola <> 'udalerri_admin' OR udalerria_id IS NOT NULL);
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'kargaguneak_egoera_check'
                ) THEN
                    ALTER TABLE kargaguneak
                    ADD CONSTRAINT kargaguneak_egoera_check
                    CHECK (egoera IN ('erabilgarri', 'mantentze-lanetan', 'zerbitzutik-kanpo'));
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'kargaguneak_latitud_check'
                ) THEN
                    ALTER TABLE kargaguneak
                    ADD CONSTRAINT kargaguneak_latitud_check
                    CHECK (latitud IS NULL OR (latitud >= -90 AND latitud <= 90));
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'kargaguneak_longitud_check'
                ) THEN
                    ALTER TABLE kargaguneak
                    ADD CONSTRAINT kargaguneak_longitud_check
                    CHECK (longitud IS NULL OR (longitud >= -180 AND longitud <= 180));
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'karga_postuak_egoera_check'
                ) THEN
                    ALTER TABLE karga_postuak
                    ADD CONSTRAINT karga_postuak_egoera_check
                    CHECK (egoera IN ('hutsa', 'kargatuta', 'kargatzen'));
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'karga_postuak_tamaina_check'
                ) THEN
                    ALTER TABLE karga_postuak
                    ADD CONSTRAINT karga_postuak_tamaina_check
                    CHECK (tamaina IN ('txikia', 'ertaina', 'handia', 'estandar'));
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'powerbanks_karga_maila_check'
                ) THEN
                    ALTER TABLE powerbanks
                    ADD CONSTRAINT powerbanks_karga_maila_check
                    CHECK (karga_maila >= 0 AND karga_maila <= 100);
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'powerbanks_egoera_check'
                ) THEN
                    ALTER TABLE powerbanks
                    ADD CONSTRAINT powerbanks_egoera_check
                    CHECK (egoera IN ('erabilgarri', 'erreserbatua', 'erabiltzen', 'mantentze-lanetan', 'zerbitzutik-kanpo'));
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'erreserbak_data_tartea_check'
                ) THEN
                    ALTER TABLE erreserbak
                    ADD CONSTRAINT erreserbak_data_tartea_check
                    CHECK (amaiera_data_ordua > hasiera_data_ordua);
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'erreserbak_egikaritze_data_check'
                ) THEN
                    ALTER TABLE erreserbak
                    ADD CONSTRAINT erreserbak_egikaritze_data_check
                    CHECK (egikaritze_data_ordua IS NULL OR egikaritze_data_ordua >= hasiera_data_ordua);
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'erreserbak_amaitze_data_check'
                ) THEN
                    ALTER TABLE erreserbak
                    ADD CONSTRAINT erreserbak_amaitze_data_check
                    CHECK (amaitze_data_ordua IS NULL OR amaitze_data_ordua >= hasiera_data_ordua);
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'erreserbak_data_orden_check'
                ) THEN
                    ALTER TABLE erreserbak
                    ADD CONSTRAINT erreserbak_data_orden_check
                    CHECK (
                        amaitze_data_ordua IS NULL
                        OR egikaritze_data_ordua IS NULL
                        OR amaitze_data_ordua >= egikaritze_data_ordua
                    );
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'erreserbak_egoera_check'
                ) THEN
                    ALTER TABLE erreserbak
                    ADD CONSTRAINT erreserbak_egoera_check
                    CHECK (egoera IN ('aktiboa', 'ezeztatua', 'amaitua'));
                END IF;
            END $$;
        """))

        # Indize bakunak.
        connection.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS erabiltzaileak_login_email_uidx "
            "ON erabiltzaileak (lower(login_email))"
        ))
        connection.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS udalerriak_izena_uidx "
            "ON udalerriak (izena)"
        ))
        connection.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS powerbanks_karga_postua_id_uidx "
            "ON powerbanks (karga_postua_id)"
        ))
        connection.execute(text(
            "CREATE INDEX IF NOT EXISTS erreserbak_erabiltzailea_hasiera_idx "
            "ON erreserbak (erabiltzailea_id, hasiera_data_ordua)"
        ))
        connection.execute(text(
            "CREATE INDEX IF NOT EXISTS erreserbak_powerbank_hasiera_idx "
            "ON erreserbak (powerbank_id, hasiera_data_ordua)"
        ))

        # Erreserba aktiboen gainjarpenak datu-basean bertan galarazi.
        connection.execute(text(
            "ALTER TABLE erreserbak ALTER COLUMN egikaritze_data_ordua DROP NOT NULL"
        ))
        connection.execute(text(
            "ALTER TABLE erreserbak ALTER COLUMN amaitze_data_ordua DROP NOT NULL"
        ))
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS btree_gist"))
        connection.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'erreserbak_powerbank_gainjarpena_ez'
                ) THEN
                    ALTER TABLE erreserbak
                    ADD CONSTRAINT erreserbak_powerbank_gainjarpena_ez
                    EXCLUDE USING gist (
                        powerbank_id WITH =,
                        tsrange(hasiera_data_ordua, amaiera_data_ordua, '[)') WITH &&
                    )
                    WHERE (egoera = 'aktiboa');
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'erreserbak_erabiltzaile_gainjarpena_ez'
                ) THEN
                    ALTER TABLE erreserbak
                    ADD CONSTRAINT erreserbak_erabiltzaile_gainjarpena_ez
                    EXCLUDE USING gist (
                        erabiltzailea_id WITH =,
                        tsrange(hasiera_data_ordua, amaiera_data_ordua, '[)') WITH &&
                    )
                    WHERE (egoera = 'aktiboa');
                END IF;
            END $$;
        """))


def get_session():
    with SessionLocal() as session:
        yield session


