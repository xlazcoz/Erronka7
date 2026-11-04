import os

from fastapi import FastAPI, Request
from models.models import Base
from database import engine, ensure_schema
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from routers import (
    erabiltzaileak,
    kargaguneak,
    powerbanks,
    erreserbak,
    karga_postuak,
    login,
    udalerriak,
    qr,
)

Base.metadata.create_all(engine)
ensure_schema()

app = FastAPI()


@app.exception_handler(IntegrityError)
async def integrity_error_handler(_request: Request, _exc: IntegrityError):
    """Datu-basearen murrizketa batek huts egiten duenean 409 itzuli."""
    return JSONResponse(
        status_code=409,
        content={"detail": "Datuak ez dira baliozkoak edo lehendik existitzen dira"},
    )


app.include_router(erabiltzaileak.router)
app.include_router(kargaguneak.router)
app.include_router(powerbanks.router)
app.include_router(erreserbak.router)
app.include_router(karga_postuak.router)
app.include_router(login.router)
app.include_router(udalerriak.router)
app.include_router(qr.router)

extra_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://localhost:4200",
        "http://127.0.0.1:4200",
        *extra_origins,
    ],
    # Permite probar desde el móvil en la red local (cualquier IP privada).
    allow_origin_regex=os.getenv(
        "CORS_ORIGIN_REGEX",
        r"^http://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|"
        r"10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
        r"172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$",
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def main():
    return {"mezua" : "Ongi etorri powerbank alokairu sistemara"}
