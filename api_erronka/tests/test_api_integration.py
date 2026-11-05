"""APIaren integrazio-testak PostgreSQL datu-base baten aurka.

Exekutatzeko, ezarri `TEST_DATABASE_URL` ingurune-aldagaia. Adibidez:

    docker compose -f docker-compose.test.yml up -d
    $env:TEST_DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5433/alokairu_test"
    uv run python -m unittest tests.test_api_integration -v

`TEST_DATABASE_URL` ez badago, test hauek automatikoki saltatzen dira.
"""

import os
import unittest
from datetime import timedelta

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")

if TEST_DATABASE_URL:
    # `main` inportatu aurretik ezarri behar da.
    os.environ["DATABASE_URL"] = TEST_DATABASE_URL

    from fastapi.testclient import TestClient
    from sqlalchemy import select, text

    import main
    from database import SessionLocal, bootstrap_database, engine
    from models.models import (
        Base,
        Erabiltzailea,
        Kargagunea,
        KargaPostua,
        Powerbank,
        Udalerria,
    )
    from services.auth import hash_password
    from services.erreserbak import now_local
    from services.rate_limit import ip_rate_limiter, login_rate_limiter


if not TEST_DATABASE_URL:

    @unittest.skip("TEST_DATABASE_URL ez da ezarri")
    class ApiIntegrationTests(unittest.TestCase):
        pass

else:

    class ApiIntegrationTests(unittest.TestCase):
        @classmethod
        def setUpClass(cls):
            Base.metadata.drop_all(engine)
            # Baseline berria aplikatzeko, Alembic-en marka ere ezabatu.
            with engine.begin() as connection:
                connection.execute(text("DROP TABLE IF EXISTS alembic_version"))
            bootstrap_database()

            with SessionLocal.begin() as session:
                # `ensure_schema()` jada sortu ditzake udalerri demoak.
                udalerria = session.scalar(
                    select(Udalerria).where(Udalerria.izena == "Donostia")
                )
                if udalerria is None:
                    udalerria = Udalerria(izena="Donostia", aktiboa=True)
                    session.add(udalerria)
                    session.flush()

                station = Kargagunea(
                    izena="Test Kargagunea",
                    helbidea="Test Kalea, 1",
                    irudia1="assets/stations/station-01.webp",
                    irudia2="assets/stations/station-02.webp",
                    irudia3="assets/stations/station-03.webp",
                    egoera="erabilgarri",
                    udalerria_id=udalerria.id,
                    latitud=43.3078,
                    longitud=-1.9566,
                )
                session.add(station)
                session.flush()

                slot = KargaPostua(
                    egoera="kargatuta",
                    tamaina="estandar",
                    kargagunea_id=station.id,
                )
                session.add(slot)
                session.flush()

                powerbank = Powerbank(
                    karga_maila=100,
                    egoera="erabilgarri",
                    karga_postua_id=slot.id,
                )
                session.add(powerbank)

                session.add_all(
                    [
                        Erabiltzailea(
                            izena="Admin",
                            abizena="Test",
                            login_email="admin@test.eus",
                            login_pasahitza=hash_password("Test1234!"),
                            rola="admin",
                            aktiboa=True,
                        ),
                        Erabiltzailea(
                            izena="User",
                            abizena="Test",
                            login_email="user@test.eus",
                            login_pasahitza=hash_password("Test1234!"),
                            rola="user",
                            aktiboa=True,
                        ),
                    ]
                )

                cls.station_id = station.id

        @classmethod
        def tearDownClass(cls):
            Base.metadata.drop_all(engine)
            engine.dispose()

        def setUp(self):
            login_rate_limiter.clear()
            ip_rate_limiter.clear()
            self.client = TestClient(main.app)

        def tearDown(self):
            self.client.close()

        def login(self, email: str, password: str = "Test1234!"):
            return self.client.post(
                "/login",
                json={"login_email": email, "login_pasahitza": password},
            )

        def test_health_and_security_headers(self):
            response = self.client.get("/health")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json(), {"status": "ok"})
            self.assertEqual(response.headers["x-content-type-options"], "nosniff")
            self.assertEqual(response.headers["x-frame-options"], "DENY")
            self.assertIn("referrer-policy", response.headers)

        def test_login_and_me(self):
            response = self.login("user@test.eus")
            self.assertEqual(response.status_code, 200)

            me = self.client.get("/login/me")
            self.assertEqual(me.status_code, 200)
            self.assertEqual(me.json()["login_email"], "user@test.eus")

        def test_wrong_password_is_rejected(self):
            response = self.login("user@test.eus", "incorrecta")
            self.assertEqual(response.status_code, 401)

        def test_reservations_require_authentication(self):
            response = self.client.get("/erreserbak")
            self.assertEqual(response.status_code, 401)

        def test_logout_invalidates_session(self):
            self.assertEqual(self.login("user@test.eus").status_code, 200)
            self.assertEqual(self.client.post("/login/logout").status_code, 200)
            self.assertEqual(self.client.get("/login/me").status_code, 401)

        def test_create_reservation(self):
            self.assertEqual(self.login("user@test.eus").status_code, 200)

            now = now_local()
            start = now + timedelta(minutes=5)
            end = start + timedelta(hours=1)
            if start.date() != now.date():
                self.skipTest("Erreserba gaueko 00:00 inguruan exekutatzen ari da")

            response = self.client.post(
                "/erreserbak",
                json={
                    "kargagunea_id": self.station_id,
                    "hasiera_data_ordua": start.isoformat(),
                    "amaiera_data_ordua": end.isoformat(),
                },
            )

            self.assertEqual(response.status_code, 201, response.text)
            self.assertEqual(response.json()["egoera"], "aktiboa")

            listing = self.client.get("/erreserbak")
            self.assertEqual(listing.status_code, 200)
            self.assertEqual(len(listing.json()), 1)

        def test_malicious_upload_is_rejected(self):
            self.assertEqual(self.login("admin@test.eus").status_code, 200)

            response = self.client.post(
                f"/kargaguneak/{self.station_id}/irudia/upload",
                files={
                    "file": (
                        "evil.html",
                        b"<html><script>alert(1)</script></html>",
                        "image/png",
                    )
                },
            )

            self.assertEqual(response.status_code, 400)

        def test_login_rate_limit(self):
            statuses = [
                self.login("rate-limit@test.eus", "incorrecta").status_code
                for _ in range(6)
            ]
            self.assertEqual(statuses[:5], [401] * 5)
            self.assertEqual(statuses[5], 429)


if __name__ == "__main__":
    unittest.main()
