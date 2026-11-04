from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from database import get_session
from models.models import Erabiltzailea, Kargagunea, Udalerria
from schemas.schemas import UdalerriaCreate, UdalerriaResponse, UdalerriaUpdate
from services.auth import (
    get_optional_current_user,
    is_municipal_admin,
    is_superadmin,
    require_superadmin,
)

router = APIRouter(prefix="/udalerriak", tags=["Udalerriak"])

SessionDep = Annotated[Session, Depends(get_session)]


def udalerri_response(session: Session, udalerria: Udalerria) -> dict:
    kargagune_kopurua = session.scalar(
        select(func.count(Kargagunea.id)).where(Kargagunea.udalerria_id == udalerria.id)
    ) or 0

    return {
        "id": udalerria.id,
        "izena": udalerria.izena,
        "aktiboa": udalerria.aktiboa,
        "kargagune_kopurua": kargagune_kopurua,
    }


def udalerria_balidatu(session: Session, udalerria_id: int) -> Udalerria:
    udalerria = session.get(Udalerria, udalerria_id)
    if udalerria is None:
        raise HTTPException(status_code=404, detail="Udalerria ez da aurkitzen")
    return udalerria


@router.get("", response_model=list[UdalerriaResponse], status_code=200)
def get_udalerriak(
    session: SessionDep,
    current_user: Optional[Erabiltzailea] = Depends(get_optional_current_user),
):
    stmt = select(Udalerria).order_by(Udalerria.id)

    if current_user and is_superadmin(current_user):
        pass
    elif current_user and is_municipal_admin(current_user):
        stmt = stmt.where(
            (Udalerria.aktiboa.is_(True))
            | (Udalerria.id == current_user.udalerria_id)
        )
    else:
        stmt = stmt.where(Udalerria.aktiboa.is_(True))

    udalerriak = session.scalars(stmt).all()
    return [udalerri_response(session, udalerria) for udalerria in udalerriak]


@router.get("/{id}", response_model=UdalerriaResponse, status_code=200)
def get_udalerria_by_id(session: SessionDep, id: int):
    udalerria = udalerria_balidatu(session, id)
    return udalerri_response(session, udalerria)


@router.post("", response_model=UdalerriaResponse, status_code=201)
def sortu_udalerria(
    session: SessionDep,
    data: UdalerriaCreate,
    _superadmin: Erabiltzailea = Depends(require_superadmin),
):
    existing = session.scalar(
        select(Udalerria).where(func.lower(Udalerria.izena) == data.izena.lower())
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail="Udalerri hori existitzen da")

    udalerria = Udalerria(izena=data.izena, aktiboa=data.aktiboa)
    session.add(udalerria)
    session.commit()
    session.refresh(udalerria)
    return udalerri_response(session, udalerria)


@router.patch("/{id}", response_model=UdalerriaResponse, status_code=200)
def aldatu_udalerria(
    session: SessionDep,
    data: UdalerriaUpdate,
    id: int,
    _superadmin: Erabiltzailea = Depends(require_superadmin),
):
    udalerria = udalerria_balidatu(session, id)

    changes = data.model_dump(exclude_unset=True)

    new_name = changes.get("izena")
    if new_name is not None:
        duplicate = session.scalar(
            select(Udalerria).where(
                func.lower(Udalerria.izena) == new_name.lower(),
                Udalerria.id != id,
            )
        )
        if duplicate is not None:
            raise HTTPException(status_code=409, detail="Udalerri hori existitzen da")

    for field, value in changes.items():
        setattr(udalerria, field, value)

    session.commit()
    session.refresh(udalerria)
    return udalerri_response(session, udalerria)
