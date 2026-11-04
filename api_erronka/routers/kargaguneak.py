from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from database import get_session
from models.models import Erabiltzailea, Erreserba, KargaPostua, Kargagunea, Powerbank, Udalerria
from schemas.schemas import KargaguneaCreate, KargaguneaResponse, KargaguneaUpdate, KargaguneaIrudiaUpdate
from services.auth import can_manage_municipality, require_manager
from services.erreserbak import normalize_datetime, now_local

router = APIRouter(prefix="/kargaguneak", tags=["Kargaguneak"])

SessionDep = Annotated[Session, Depends(get_session)]


def free_powerbanks_query(station_id: int, start: datetime, end: datetime):
    overlapping = (
        select(Erreserba.id)
        .where(
            Erreserba.powerbank_id == Powerbank.id,
            Erreserba.egoera == "aktiboa",
            Erreserba.hasiera_data_ordua < end,
            Erreserba.amaiera_data_ordua > start,
        )
        .exists()
    )
    return (
        select(func.count(Powerbank.id))
        .join(KargaPostua, Powerbank.karga_postua_id == KargaPostua.id)
        .where(
            KargaPostua.kargagunea_id == station_id,
            KargaPostua.egoera == "kargatuta",
            Powerbank.egoera == "erabilgarri",
            ~overlapping,
        )
    )


def station_response(session: Session, station: Kargagunea) -> dict:
    available_count = 0
    if station.egoera.lower() == "erabilgarri":
        now = now_local()
        available_count = session.scalar(free_powerbanks_query(station.id, now, now)) or 0
    return {
        "id": station.id,
        "izena": station.izena,
        "helbidea": station.helbidea,
        "irudia1": station.irudia1,
        "irudia2": station.irudia2,
        "irudia3": station.irudia3,
        "egoera": station.egoera,
        "udalerria_id": station.udalerria_id,
        "udalerria_izena": station.udalerria.izena if station.udalerria is not None else None,
        "latitud": station.latitud,
        "longitud": station.longitud,
        "libres": available_count,
        "karga_postuak": station.karga_postuak,
    }

@router.get("", response_model=list[KargaguneaResponse], status_code=200)
def get_kargaguneak(session: SessionDep, udalerria_id: int | None = None):
    stmt = select(Kargagunea).order_by(Kargagunea.id)
    if udalerria_id is not None:
        stmt = stmt.where(Kargagunea.udalerria_id == udalerria_id)
    return [station_response(session, station) for station in session.scalars(stmt).all()]

@router.get("/{id}", response_model=KargaguneaResponse, status_code=200)
def get_kargaguneak_id(session: SessionDep, id: int):
    kargagunea = session.get(Kargagunea, id)
    if kargagunea is None:
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")
    return station_response(session, kargagunea)

@router.get("/{id}/erreserbagarritasuna", status_code=200)
def kargagunearen_erreserbagarritasuna(
    session: SessionDep,
    id: int,
    hasiera: datetime = Query(...),
    amaiera: datetime = Query(...),
):
    kargagunea = session.get(Kargagunea, id)
    if kargagunea is None:
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")

    hasiera = normalize_datetime(hasiera)
    amaiera = normalize_datetime(amaiera)
    if hasiera is None or amaiera is None or amaiera <= hasiera:
        raise HTTPException(status_code=400, detail="Ordutegi-tarteak ez du balio")
    if amaiera - hasiera > timedelta(hours=6):
        raise HTTPException(status_code=400, detail="Erreserbak gehienez 6 ordu iraun dezake")

    if kargagunea.egoera.lower() != "erabilgarri":
        return {"libres": 0, "erabilgarri": False}

    libres = session.scalar(free_powerbanks_query(id, hasiera, amaiera)) or 0
    return {"libres": libres, "erabilgarri": libres > 0}

@router.post("", response_model=KargaguneaResponse, status_code=201)
def sortu_kargagunea(
    session: SessionDep,
    data: KargaguneaCreate,
    current_user: Erabiltzailea = Depends(require_manager),
):
    udalerria_id = data.udalerria_id
    if current_user.rola == "udalerri_admin":
        udalerria_id = current_user.udalerria_id
        if udalerria_id is None:
            raise HTTPException(status_code=403, detail="Ez duzu udalerri bat esleituta")

    if udalerria_id is not None and session.get(Udalerria, udalerria_id) is None:
        raise HTTPException(status_code=404, detail="Udalerria ez da aurkitzen")

    kargagunea = Kargagunea(
        izena=data.izena, 
        helbidea=data.helbidea, 
        irudia1=data.irudia1, 
        irudia2=data.irudia2,
        irudia3=data.irudia3, 
        egoera=data.egoera,
        udalerria_id=udalerria_id,
        latitud=data.latitud,
        longitud=data.longitud,
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
    current_user: Erabiltzailea = Depends(require_manager),
):
    kargagunea = session.get(Kargagunea, id)
    if not kargagunea:
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")

    if not can_manage_municipality(current_user, kargagunea.udalerria_id):
        raise HTTPException(status_code=403, detail="Ez duzu kargagune hau aldatzeko baimenik")

    changes = data.model_dump(exclude_unset=True)
    if current_user.rola == "udalerri_admin":
        changes["udalerria_id"] = current_user.udalerria_id

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
    current_user: Erabiltzailea = Depends(require_manager),
):
    kargagunea = session.get(Kargagunea, id)
    if not kargagunea:
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")

    if not can_manage_municipality(current_user, kargagunea.udalerria_id):
        raise HTTPException(status_code=403, detail="Ez duzu kargagune hau aldatzeko baimenik")

    changes = data.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(kargagunea, field, value)

    session.commit()
    session.refresh(kargagunea)
    return kargagunea

@router.delete("/{id}", response_model=KargaguneaResponse, status_code=200)
def ezabatu_kargagunea(
    session: SessionDep,
    id: int,
    current_user: Erabiltzailea = Depends(require_manager),
):
    kargagunea = session.get(Kargagunea, id)

    if not kargagunea:
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")

    if not can_manage_municipality(current_user, kargagunea.udalerria_id):
        raise HTTPException(status_code=403, detail="Ez duzu kargagune hau ezabatzeko baimenik")

    # Datuen osotasuna: erreserbak edo postuak baditu, ez da ezabatu behar.
    if kargagunea.karga_postuak:
        raise HTTPException(
            status_code=409,
            detail="Kargaguneak karga-postuak ditu; desaktibatu edo ezabatu lehenago",
        )

    session.delete(kargagunea)
    session.commit()
    return kargagunea