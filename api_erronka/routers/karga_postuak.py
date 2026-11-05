from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session
from database import get_session
from models.models import Erabiltzailea, Erreserba, KargaPostua, Kargagunea, Powerbank
from schemas.schemas import KargaPostuaResponse, KargaPostuaCreate, KargaPostuaUpdate
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

    station = session.get(Kargagunea, data.kargagunea_id)
    if station.udalerria is not None and not station.udalerria.aktiboa:
        raise HTTPException(
            status_code=409,
            detail="Udalerria desaktibatuta dago; ezin da karga-posturik sortu",
        )

    karga_postua = KargaPostua(
        egoera=data.egoera,
        tamaina=data.tamaina,
        kargagunea_id=data.kargagunea_id,
    )
    session.add(karga_postua)
    session.commit()
    session.refresh(karga_postua)

    return karga_postua


@router.patch("/{id}", response_model=KargaPostuaResponse, status_code=200)
def aldatu_karga_postua(
    session: SessionDep,
    data: KargaPostuaUpdate,
    id: int,
    current_user: Erabiltzailea = Depends(require_manager),
):
    karga_postua = session.get(KargaPostua, id)

    if not karga_postua:
        raise HTTPException(status_code=404, detail="Karga postua ez da aurkitzen")

    _check_station_permission(session, current_user, karga_postua.kargagunea_id)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(karga_postua, field, value)

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

    powerbank = session.scalar(
        select(Powerbank.id).where(Powerbank.karga_postua_id == id).limit(1)
    )
    if powerbank is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                "Karga postu honek powerbank-ak ditu. Mugitu edo ezabatu "
                "powerbank-ak lehenago."
            ),
        )

    erreserba = session.scalar(
        select(Erreserba.id)
        .where(
            or_(
                Erreserba.hasierako_karga_postua == id,
                Erreserba.bukaerako_karga_postua == id,
            )
        )
        .limit(1)
    )
    if erreserba is not None:
        raise HTTPException(
            status_code=409,
            detail="Karga postu honek erreserbak ditu: ezin da ezabatu.",
        )

    session.delete(karga_postua)
    session.commit()
    return karga_postua