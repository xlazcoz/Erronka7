from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from database import get_session
from models.models import Erabiltzailea, KargaPostua, Kargagunea
from schemas.schemas import KargaPostuaResponse, KargaPostuaCreate
from services.auth import can_manage_municipality, require_manager

router = APIRouter(prefix="/kargapostuak", tags=["Karga postuak"])

SessionDep = Annotated[Session, Depends(get_session)]


def _check_station_permission(
    session: Session, current_user: Erabiltzailea, kargagunea_id: int
) -> None:
    station = session.get(Kargagunea, kargagunea_id)
    if station is None:
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")
    if not can_manage_municipality(current_user, station.udalerria_id):
        raise HTTPException(status_code=403, detail="Ez duzu karga-postu hau kudeatzeko baimenik")

@router.get("", response_model=list[KargaPostuaResponse], status_code=200)
def get_karga_postuak(session: SessionDep):
    stmt = select(KargaPostua).order_by(KargaPostua.id)
    return session.scalars(stmt).all()

@router.post("", response_model=KargaPostuaResponse, status_code=201)
def sortu_karga_postua(
    session: SessionDep,
    data: KargaPostuaCreate,
    current_user: Erabiltzailea = Depends(require_manager),
):
    _check_station_permission(session, current_user, data.kargagunea_id)

    karga_postua = KargaPostua(
        egoera=data.egoera,
        tamaina=data.tamaina,
        kargagunea_id=data.kargagunea_id,
    )
    session.add(karga_postua)
    session.commit()
    session.refresh(karga_postua)

    return karga_postua

@router.delete("/{id}", response_model=KargaPostuaResponse, status_code=200)
def ezabatu_karga_postua(
    session: SessionDep,
    id: int,
    current_user: Erabiltzailea = Depends(require_manager),
):
    karga_postua = session.get(KargaPostua, id)

    if not karga_postua:
        raise HTTPException(status_code=404, detail="Karga postua ez da aurkitzen")

    _check_station_permission(session, current_user, karga_postua.kargagunea_id)

    session.delete(karga_postua)
    session.commit()
    return karga_postua