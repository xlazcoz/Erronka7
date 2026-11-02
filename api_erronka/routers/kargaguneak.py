from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from database import get_session
from models.models import Erreserba, KargaPostua, Kargagunea, Powerbank
from schemas.schemas import KargaguneaCreate, KargaguneaResponse, KargaguneaUpdate, KargaguneaIrudiaUpdate

router = APIRouter(prefix="/kargaguneak", tags=["Kargaguneak"])

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

@router.post("", response_model=KargaguneaResponse, status_code=201)
def sortu_kargagunea(session: SessionDep, data: KargaguneaCreate):
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
def aldatu_kargagunea(session: SessionDep, data: KargaguneaUpdate, id: int):
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
def aldatu_irudia(session: SessionDep, data: KargaguneaIrudiaUpdate, id: int):
    kargagunea = session.get(Kargagunea, id)
    if not kargagunea:
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")

    if data.irudia:
        kargagunea.irudia1 = data.irudia

    session.commit()
    session.refresh(kargagunea)
    return kargagunea

@router.delete("/{id}", response_model=KargaguneaResponse, status_code=200)
def ezabatu_kargagunea(session: SessionDep, id: int):
    kargagunea = session.get(Kargagunea, id)

    if not kargagunea:
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")

    session.delete(kargagunea)
    session.commit()
    return kargagunea