from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from database import get_session
from models.models import Erabiltzailea, KargaPostua, Kargagunea, Powerbank
from schemas.schemas import PowerbankCreate, PowerbankResponse, PowerbankUpdate
from services.auth import can_manage_municipality, require_manager

router = APIRouter(prefix="/powerbanks", tags=["Powerbanks"])

SessionDep = Annotated[Session, Depends(get_session)]


def _post_station(session: Session, post_id: int) -> Kargagunea | None:
    post = session.get(KargaPostua, post_id)
    return session.get(Kargagunea, post.kargagunea_id) if post is not None else None


def _check_post_permission(session: Session, current_user: Erabiltzailea, post_id: int) -> None:
    station = _post_station(session, post_id)
    if station is None:
        raise HTTPException(status_code=404, detail="Karga-postua ez da aurkitzen")
    if not can_manage_municipality(current_user, station.udalerria_id):
        raise HTTPException(status_code=403, detail="Ez duzu powerbank hau kudeatzeko baimenik")

@router.get("", response_model=list[PowerbankResponse], status_code=200)
def get_powerbanks(session: SessionDep):
    stmt = select(Powerbank).order_by(Powerbank.id)
    return session.scalars(stmt).all()

@router.post("", response_model=PowerbankResponse, status_code=201)
def sortu_powerbank(
    session: SessionDep,
    data: PowerbankCreate,
    current_user: Erabiltzailea = Depends(require_manager),
):
    _check_post_permission(session, current_user, data.karga_postua_id)

    powerbank = Powerbank(
        karga_maila=data.karga_maila,
        egoera=data.egoera,
        karga_postua_id=data.karga_postua_id
    )
    session.add(powerbank)
    session.commit()
    session.refresh(powerbank)
    return powerbank

# Corregida la barra en la ruta: "/{id}"
@router.patch("/{id}", response_model=PowerbankResponse, status_code=200)
def powerbank_tokia_aldatu(
    session: SessionDep,
    data: PowerbankUpdate,
    id: int,
    current_user: Erabiltzailea = Depends(require_manager),
):
    powerbank = session.get(Powerbank, id)
    if not powerbank:
        raise HTTPException(status_code=404, detail="Powerbank ez da aurkitzen")

    _check_post_permission(session, current_user, powerbank.karga_postua_id)
    if data.karga_postua_id is not None:
        _check_post_permission(session, current_user, data.karga_postua_id)

    changes = data.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(powerbank, field, value)

    session.commit()
    session.refresh(powerbank)
    return powerbank