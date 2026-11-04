from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_session
from models.models import Erabiltzailea, Erreserba, KargaPostua, Kargagunea, Powerbank
from schemas.schemas import PowerbankCreate, PowerbankResponse, PowerbankUpdate
from services.auth import is_municipal_admin, is_superadmin, require_admin

router = APIRouter(prefix="/powerbanks", tags=["Powerbanks"])

SessionDep = Annotated[Session, Depends(get_session)]


def egiaztatu_espazio_baimena(current_user: Erabiltzailea, karga_postua: KargaPostua) -> None:
    if is_superadmin(current_user):
        return

    if (
        is_municipal_admin(current_user)
        and karga_postua.kargagunea.udalerria_id == current_user.udalerria_id
    ):
        return

    raise HTTPException(
        status_code=403,
        detail="Beste udalerri bateko powerbank-ak ezin dituzu kudeatu",
    )


@router.get("", response_model=list[PowerbankResponse], status_code=200)
def get_powerbanks(
    session: SessionDep,
    current_user: Erabiltzailea = Depends(require_admin),
):
    stmt = select(Powerbank).order_by(Powerbank.id)

    if is_municipal_admin(current_user):
        stmt = (
            stmt.join(KargaPostua, KargaPostua.id == Powerbank.karga_postua_id)
            .join(Kargagunea, Kargagunea.id == KargaPostua.kargagunea_id)
            .where(Kargagunea.udalerria_id == current_user.udalerria_id)
        )

    return session.scalars(stmt).all()


@router.post("", response_model=PowerbankResponse, status_code=201)
def sortu_powerbank(
    session: SessionDep,
    data: PowerbankCreate,
    current_user: Erabiltzailea = Depends(require_admin),
):
    karga_postua = session.get(KargaPostua, data.karga_postua_id)
    if karga_postua is None:
        raise HTTPException(status_code=404, detail="Karga postua ez da aurkitzen")

    egiaztatu_espazio_baimena(current_user, karga_postua)

    powerbank = Powerbank(
        karga_maila=data.karga_maila,
        karga_postua_id=data.karga_postua_id
    )
    session.add(powerbank)
    session.commit()
    session.refresh(powerbank)
    return powerbank


@router.patch("/{id}", response_model=PowerbankResponse, status_code=200)
def powerbank_tokia_aldatu(
    session: SessionDep,
    data: PowerbankUpdate,
    id: int,
    current_user: Erabiltzailea = Depends(require_admin),
):
    powerbank = session.get(Powerbank, id)
    if not powerbank:
        raise HTTPException(status_code=404, detail="Powerbank ez da aurkitzen")

    current_slot = session.get(KargaPostua, powerbank.karga_postua_id)
    if current_slot is not None:
        egiaztatu_espazio_baimena(current_user, current_slot)

    changes = data.model_dump(exclude_unset=True)

    new_slot_id = changes.get("karga_postua_id")
    if new_slot_id is not None:
        new_slot = session.get(KargaPostua, new_slot_id)
        if new_slot is None:
            raise HTTPException(status_code=404, detail="Karga postua ez da aurkitzen")
        egiaztatu_espazio_baimena(current_user, new_slot)

    for field, value in changes.items():
        setattr(powerbank, field, value)

    session.commit()
    session.refresh(powerbank)
    return powerbank


@router.delete("/{id}", response_model=PowerbankResponse, status_code=200)
def ezabatu_powerbank(
    session: SessionDep,
    id: int,
    current_user: Erabiltzailea = Depends(require_admin),
):
    powerbank = session.get(Powerbank, id)

    if not powerbank:
        raise HTTPException(status_code=404, detail="Powerbank ez da aurkitzen")

    current_slot = session.get(KargaPostua, powerbank.karga_postua_id)
    if current_slot is not None:
        egiaztatu_espazio_baimena(current_user, current_slot)

    erreserba = session.scalar(
        select(Erreserba.id).where(Erreserba.powerbank_id == id).limit(1)
    )
    if erreserba is not None:
        raise HTTPException(
            status_code=409,
            detail="Powerbank honek erreserbak ditu, ezin da ezabatu",
        )

    session.delete(powerbank)
    session.commit()
    return powerbank
