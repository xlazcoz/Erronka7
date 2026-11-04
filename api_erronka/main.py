from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from models.models import Base
from database import engine
from fastapi.middleware.cors import CORSMiddleware
from routers import erabiltzaileak, kargaguneak, powerbanks, erreserbak, karga_postuak, login, udalerriak


def migrate_database() -> None:
    Base.metadata.create_all(engine)

    with engine.begin() as connection:
        tables = inspect(connection).get_table_names()

        if "erabiltzaileak" in tables:
            columns = [column["name"] for column in inspect(connection).get_columns("erabiltzaileak")]
            if "aktiboa" not in columns:
                connection.execute(
                    text("ALTER TABLE erabiltzaileak ADD COLUMN aktiboa BOOLEAN NOT NULL DEFAULT TRUE")
                )
            if "udalerria_id" not in columns:
                connection.execute(
                    text(
                        "ALTER TABLE erabiltzaileak "
                        "ADD COLUMN udalerria_id INTEGER REFERENCES udalerriak(id)"
                    )
                )

        if "kargaguneak" in tables:
            columns = [column["name"] for column in inspect(connection).get_columns("kargaguneak")]
            if "udalerria_id" not in columns:
                connection.execute(
                    text(
                        "ALTER TABLE kargaguneak "
                        "ADD COLUMN udalerria_id INTEGER REFERENCES udalerriak(id)"
                    )
                )
            if "latitude" not in columns:
                connection.execute(
                    text("ALTER TABLE kargaguneak ADD COLUMN latitude DOUBLE PRECISION")
                )
            if "longitude" not in columns:
                connection.execute(
                    text("ALTER TABLE kargaguneak ADD COLUMN longitude DOUBLE PRECISION")
                )

        default_udalerria_id = connection.execute(
            text("SELECT id FROM udalerriak ORDER BY id LIMIT 1")
        ).scalar()

        if default_udalerria_id is None:
            connection.execute(
                text(
                    "INSERT INTO udalerriak (izena, aktiboa) "
                    "VALUES (:izena, TRUE)"
                ),
                {"izena": "Donostia"},
            )
            default_udalerria_id = connection.execute(
                text("SELECT id FROM udalerriak ORDER BY id LIMIT 1")
            ).scalar()

        connection.execute(
            text(
                "UPDATE kargaguneak SET udalerria_id = :udalerria_id "
                "WHERE udalerria_id IS NULL"
            ),
            {"udalerria_id": default_udalerria_id},
        )
        connection.execute(
            text(
                "UPDATE erabiltzaileak SET udalerria_id = :udalerria_id "
                "WHERE rola = 'admin' AND udalerria_id IS NULL"
            ),
            {"udalerria_id": default_udalerria_id},
        )

        connection.execute(
            text("ALTER TABLE kargaguneak ALTER COLUMN udalerria_id SET NOT NULL")
        )


migrate_database()

app = FastAPI()
app.include_router(erabiltzaileak.router)
app.include_router(kargaguneak.router)
app.include_router(powerbanks.router)
app.include_router(erreserbak.router)
app.include_router(karga_postuak.router)
app.include_router(login.router)
app.include_router(udalerriak.router)

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://localhost:4200",
        "http://127.0.0.1:4200",
        "null",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def main():
    return {"mezua" : "Ongi etorri powerbank alokairu sistemara"}
