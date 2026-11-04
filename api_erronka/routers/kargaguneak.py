import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from database import get_session
from models.models import Erabiltzailea, Erreserba, KargaPostua, Kargagunea, Powerbank
from schemas.schemas import (
    KargaguneaCreate,
    KargaguneaIrudiaUpdate,
    KargaguneaResponse,
    KargaguneaUpdate,
    KargaPostuaResponse,
)
from services.auth import require_admin

router = APIRouter(prefix="/kargaguneak", tags=["Kargaguneak"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

SessionDep = Annotated[Session, Depends(get_session)]

def station_response(session: Session, station: Kargagunea) -> dict:
    available_count = 0
    if station.egoera == "erabilgarri":
        available_count = session.scalar(
            select(func.count(Powerbank.id))
            .join(KargaPostua, Powerbank.karga_postua_id == KargaPostua.id)
            .where(
                KargaPostua.kargagunea_id == station.id,
                KargaPostua.egoera == "kargatuta",
                ~Powerbank.erreserbak.any(Erreserba.egoera == "aktiboa"),
            )
        ) or 0
    return {
        "id": station.id,
        "izena": station.izena,
        "helbidea": station.helbidea,
        "irudia1": station.irudia1,
        "irudia2": station.irudia2,
        "irudia3": station.irudia3,
        "egoera": station.egoera,
        "libres": available_count,
        "karga_postuak": station.karga_postuak,
    }

@router.get("", response_model=list[KargaguneaResponse], status_code=200)
def get_kargaguneak(session: SessionDep):
    stmt = select(Kargagunea).order_by(Kargagunea.id)
    return [station_response(session, station) for station in session.scalars(stmt).all()]

@router.get("/{id}", response_model=KargaguneaResponse, status_code=200)
def get_kargaguneak_id(session: SessionDep, id: int):
    kargagunea = session.get(Kargagunea, id)
    if kargagunea is None:
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")
    return station_response(session, kargagunea)

@router.get("/{id}/erabilgarritasuna", response_model=list[KargaPostuaResponse], status_code=200)
def kargagune_erabilgarritasuna(
    session: SessionDep,
    id: int,
    hasiera_data_ordua: datetime,
    amaiera_data_ordua: datetime,
):
    kargagunea = session.get(Kargagunea, id)
    if kargagunea is None:
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")

    if amaiera_data_ordua <= hasiera_data_ordua:
        raise HTTPException(
            status_code=400,
            detail="Amaiera-data hasiera-data baino geroagokoa izan behar da",
        )

    if (kargagunea.egoera or "").lower() != "erabilgarri":
        return []

    stmt = (
        select(KargaPostua)
        .join(Powerbank, Powerbank.karga_postua_id == KargaPostua.id)
        .where(
            KargaPostua.kargagunea_id == id,
            KargaPostua.egoera == "kargatuta",
            ~select(Erreserba.id)
            .where(
                Erreserba.hasierako_karga_postua == KargaPostua.id,
                Erreserba.egoera == "aktiboa",
                Erreserba.hasiera_data_ordua < amaiera_data_ordua,
                Erreserba.amaiera_data_ordua > hasiera_data_ordua,
            )
            .exists(),
        )
        .distinct()
        .order_by(KargaPostua.id)
    )
    return session.scalars(stmt).all()


@router.post("", response_model=KargaguneaResponse, status_code=201)
def sortu_kargagunea(
    session: SessionDep,
    data: KargaguneaCreate,
    _admin: Erabiltzailea = Depends(require_admin),
):
    kargagunea = Kargagunea(
        izena=data.izena, 
        helbidea=data.helbidea, 
        irudia1=data.irudia1, 
        irudia2=data.irudia2,
        irudia3=data.irudia3, 
        egoera=data.egoera
    )
    session.add(kargagunea)
    session.commit()
    session.refresh(kargagunea)
    return kargagunea

@router.patch("/{id}", response_model=KargaguneaResponse, status_code=200)
def aldatu_kargagunea(
    session: SessionDep,
    data: KargaguneaUpdate,
    id: int,
    _admin: Erabiltzailea = Depends(require_admin),
):
    kargagunea = session.get(Kargagunea, id)
    if not kargagunea:
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")

    changes = data.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(kargagunea, field, value)

    session.commit()
    session.refresh(kargagunea)
    return kargagunea

@router.patch("/{id}/irudia", response_model=KargaguneaResponse, status_code=200)
def aldatu_irudia(
    session: SessionDep,
    data: KargaguneaIrudiaUpdate,
    id: int,
    _admin: Erabiltzailea = Depends(require_admin),
):
    kargagunea = session.get(Kargagunea, id)
    if not kargagunea:
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")

    changes = data.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(kargagunea, field, value)

    session.commit()
    session.refresh(kargagunea)
    return kargagunea

@router.post("/{id}/irudia/upload", status_code=200)
def igo_kargagunearen_irudia(
    session: SessionDep,
    request: Request,
    id: int,
    file: UploadFile = File(...),
    _admin: Erabiltzailea = Depends(require_admin),
):
    kargagunea = session.get(Kargagunea, id)
    if not kargagunea:
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Fitxategiak irudi bat izan behar du")

    suffix = Path(file.filename or "").suffix.lower() or ".img"
    filename = f"{uuid.uuid4().hex}{suffix}"
    destination = UPLOAD_DIR / filename
    with destination.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    url = f"{str(request.base_url).rstrip('/')}/uploads/{filename}"
    return {"irudia": url}


@router.delete("/{id}", response_model=KargaguneaResponse, status_code=200)
def ezabatu_kargagunea(
    session: SessionDep,
    id: int,
    _admin: Erabiltzailea = Depends(require_admin),
):
    kargagunea = session.get(Kargagunea, id)

    if not kargagunea:
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")

    if kargagunea.karga_postuak:
        raise HTTPException(
            status_code=409,
            detail=(
                "Kargagune honek karga postuak ditu. Ezin da ezabatu; "
                "jarri 'Zerbitzutik kanpo' egoeran desaktibatzeko."
            ),
        )

    session.delete(kargagunea)
    session.commit()
    return kargagunea