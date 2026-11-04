from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from models.models import Base
from database import engine
from fastapi.middleware.cors import CORSMiddleware
from routers import erabiltzaileak, kargaguneak, powerbanks, erreserbak, karga_postuak, login

Base.metadata.create_all(engine)

with engine.begin() as connection:
    columns = [column["name"] for column in inspect(engine).get_columns("erabiltzaileak")]
    if "aktiboa" not in columns:
        connection.execute(
            text("ALTER TABLE erabiltzaileak ADD COLUMN aktiboa BOOLEAN NOT NULL DEFAULT TRUE")
        )

app = FastAPI()
app.include_router(erabiltzaileak.router)
app.include_router(kargaguneak.router)
app.include_router(powerbanks.router)
app.include_router(erreserbak.router)
app.include_router(karga_postuak.router)
app.include_router(login.router)

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500", "http://localhost:5500", "http://localhost:4200", "http://127.0.0.1:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def main():
    return {"mezua" : "Ongi etorri powerbank alokairu sistemara"}
