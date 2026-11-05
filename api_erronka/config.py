"""Ingurune-konfigurazioa modu bakarrean kargatzeko modulua.

`.env` fitxategia badago, automatikoki kargatzen da. Aldagai guztiek
inguruneko balioak lehenesten dituzte, beraz Docker/CI-ekin ere erabil daiteke.
"""

from __future__ import annotations

import os
from pathlib import Path

try:  # python-dotenv fastapi[standard] paketearekin batera dator.
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - ingurune oso minimoetarako
    load_dotenv = None

BASE_DIR = Path(__file__).resolve().parent

if load_dotenv is not None:
    # Lehenetsi api_erronka/.env, gero proiektuaren erroko .env.
    load_dotenv(BASE_DIR / ".env")
    load_dotenv(BASE_DIR.parent / ".env")


def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
IS_PRODUCTION = APP_ENV in {"production", "prod"}

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://postgres:@localhost:5432/alokairu_sistema",
)

COOKIE_SECURE = env_bool("COOKIE_SECURE", default=IS_PRODUCTION)
DOCS_ENABLED = env_bool("DOCS_ENABLED", default=not IS_PRODUCTION)

MAX_IMAGE_UPLOAD_BYTES = env_int("MAX_IMAGE_UPLOAD_BYTES", 5 * 1024 * 1024)

LOGIN_MAX_ATTEMPTS = env_int("LOGIN_MAX_ATTEMPTS", 5)
LOGIN_WINDOW_SECONDS = env_int("LOGIN_WINDOW_SECONDS", 15 * 60)
LOGIN_BLOCK_SECONDS = env_int("LOGIN_BLOCK_SECONDS", 15 * 60)

# Saioaren iraupena zerbitzarian (7 egun lehenetsita).
SESSION_MAX_AGE_SECONDS = env_int("SESSION_MAX_AGE_SECONDS", 7 * 24 * 60 * 60)

DEFAULT_DEV_CORS_REGEX = (
    r"^http://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|"
    r"10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
    r"172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$"
)

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]

# Produkzioan ez da eremu lokalik onartzen automatikoki: jatorri esplizituak
# edo CORS_ORIGIN_REGEX ingurune-aldagaia behar dira.
CORS_ORIGIN_REGEX = os.getenv(
    "CORS_ORIGIN_REGEX",
    None if IS_PRODUCTION else DEFAULT_DEV_CORS_REGEX,
)
