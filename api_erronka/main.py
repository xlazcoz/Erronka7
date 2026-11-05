from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from config import (
    CORS_ORIGIN_REGEX,
    CORS_ORIGINS,
    DOCS_ENABLED,
    IS_PRODUCTION,
)
from database import bootstrap_database, engine
from routers import (
    erabiltzaileak,
    erreserbak,
    karga_postuak,
    kargaguneak,
    login,
    powerbanks,
    qr,
    udalerriak,
)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Aplikazioa abiaraztean datu-basea migratzen du."""
    bootstrap_database()
    yield


app = FastAPI(
    title="Powerbank Alokairu API",
    lifespan=lifespan,
    description=(
        "Powerbank alokairu sistemaren APIa: erabiltzaileak, kargaguneak, "
        "powerbankak, erreserbak eta QR bidezko taquilla-fluxua."
    ),
    version="1.0.0",
    docs_url="/docs" if DOCS_ENABLED else None,
    redoc_url="/redoc" if DOCS_ENABLED else None,
    openapi_url="/openapi.json" if DOCS_ENABLED else None,
)

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.exception_handler(IntegrityError)
async def integrity_error_handler(_request: Request, _exc: IntegrityError):
    """Datu-basearen murrizketa batek huts egiten duenean 409 itzuli."""
    return JSONResponse(
        status_code=409,
        content={"detail": "Datuak ez dira baliozkoak edo lehendik existitzen dira"},
    )


@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Oinarrizko segurtasun-cabeceras gehitzen ditu erantzun guztiei."""
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault(
        "Permissions-Policy",
        "geolocation=(self), camera=(self), microphone=(), payment=()",
    )
    if IS_PRODUCTION:
        response.headers.setdefault(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains",
        )
    return response


app.include_router(erabiltzaileak.router)
app.include_router(kargaguneak.router)
app.include_router(powerbanks.router)
app.include_router(erreserbak.router)
app.include_router(karga_postuak.router)
app.include_router(login.router)
app.include_router(udalerriak.router)
app.include_router(qr.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    # Garapenean sare lokaleko IPak onartzen dira; produkzioan ez.
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/", tags=["Sistema"])
def main():
    return {"mezua": "Ongi etorri powerbank alokairu sistemara"}


@app.get("/health", tags=["Sistema"])
def health():
    """Karga-balantzatzaileek eta Dockerrek erabiltzeko osasun-egiaztapena."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception:  # pragma: no cover - datu-basea erortzean
        raise HTTPException(
            status_code=503, detail="Datu-basea ez dago erabilgarri"
        ) from None
    return {"status": "ok"}
