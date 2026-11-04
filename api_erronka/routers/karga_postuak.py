from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_session
from models.models import Erabiltzailea, KargaPostua, Kargagunea, Powerbank
from schemas.schemas import KargaPostuaResponse, KargaPostuaCreate, KargaPostuaUpdate
from services.auth import is_municipal_admin, is_superadmin, require_admin

router = APIRouter(prefix="/kargapostuak", tags=["Karga postuak"])

SessionDep = Annotated[Session, Depends(get_session)]


def egiaztatu_karga_postu_baimena(
    current_user: Erabiltzailea,
    karga_postua: KargaPostua,
) -> None:
    if is_superadmin(current_user):
        return

    if (
        is_municipal_admin(current_user)
        and karga_postua.kargagunea.udalerria_id == current_user.udalerria_id
    ):
        return

    raise HTTPException(
        status_code=403,
        detail="Beste udalerri bateko karga postuak ezin dituzu kudeatu",
    )


def egiaztatu_kargagunea_baimena(
    current_user: Erabiltzailea,
    kargagunea: Kargagunea,
) -> None:
    if is_superadmin(current_user):
        return

    if (
        is_municipal_admin(current_user)
        and kargagunea.udalerria_id == current_user.udalerria_id
    ):
        return

    raise HTTPException(
        status_code=403,
        detail="Beste udalerri bateko karga postuak ezin dituzu kudeatu",
    )


@router.get("", response_model=list[KargaPostuaResponse], status_code=200)
def get_karga_postuak(
    session: SessionDep,
    current_user: Erabiltzailea = Depends(require_admin),
):
    stmt = select(KargaPostua).order_by(KargaPostua.id)

    if is_municipal_admin(current_user):
        stmt = (
            stmt.join(Kargagunea, Kargagunea.id == KargaPostua.kargagunea_id)
            .where(Kargagunea.udalerria_id == current_user.udalerria_id)
        )

    return session.scalars(stmt).all()


@router.post("", response_model=KargaPostuaResponse, status_code=201)
def sortu_karga_postua(
    session: SessionDep,
    data: KargaPostuaCreate,
    current_user: Erabiltzailea = Depends(require_admin),
):
    kargagunea = session.get(Kargagunea, data.kargagunea_id)
    if kargagunea is None:
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")

    egiaztatu_kargagunea_baimena(current_user, kargagunea)

    karga_postua = KargaPostua(egoera=data.egoera, kargagunea_id=data.kargagunea_id)
    session.add(karga_postua)
    session.commit()
    session.refresh(karga_postua)

    return karga_postua


@router.patch("/{id}", response_model=KargaPostuaResponse, status_code=200)
def aldatu_karga_postua(
    session: SessionDep,
    data: KargaPostuaUpdate,
    id: int,
    current_user: Erabiltzailea = Depends(require_admin),
):
    karga_postua = session.get(KargaPostua, id)

    if not karga_postua:
        raise HTTPException(status_code=404, detail="Karga postua ez da aurkitzen")

    egiaztatu_karga_postu_baimena(current_user, karga_postua)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(karga_postua, field, value)

    session.commit()
    session.refresh(karga_postua)
    return karga_postua


@router.delete("/{id}", response_model=KargaPostuaResponse, status_code=200)
def ezabatu_karga_postua(
    session: SessionDep,
    id: int,
    current_user: Erabiltzailea = Depends(require_admin),
):
    karga_postua = session.get(KargaPostua, id)

    if not karga_postua:
        raise HTTPException(status_code=404, detail="Karga postua ez da aurkitzen")

    egiaztatu_karga_postu_baimena(current_user, karga_postua)

    powerbank = session.scalar(
        select(Powerbank.id).where(Powerbank.karga_postua_id == id).limit(1)
    )
    if powerbank is not None:
        raise HTTPException(
            status_code=409,
            detail="Karga postu honek powerbank-ak ditu, ezin da ezabatu",
        )

    session.delete(karga_postua)
    session.commit()
    return karga_postua
