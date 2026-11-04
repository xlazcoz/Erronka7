from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_session
from models.models import Erabiltzailea, Udalerria
from schemas.schemas import UdalerriaCreate, UdalerriaResponse, UdalerriaUpdate
from services.auth import require_admin

router = APIRouter(prefix="/udalerriak", tags=["Udalerriak"])

SessionDep = Annotated[Session, Depends(get_session)]


@router.get("", response_model=list[UdalerriaResponse], status_code=200)
def get_udalerriak(session: SessionDep):
    return session.scalars(select(Udalerria).order_by(Udalerria.izena)).all()


@router.post("", response_model=UdalerriaResponse, status_code=201)
def sortu_udalerria(
    session: SessionDep,
    data: UdalerriaCreate,
    _admin: Erabiltzailea = Depends(require_admin),
):
    udalerria = Udalerria(izena=data.izena.strip(), aktiboa=data.aktiboa)
    session.add(udalerria)
    session.commit()
    session.refresh(udalerria)
    return udalerria


@router.patch("/{id}", response_model=UdalerriaResponse, status_code=200)
def aldatu_udalerria(
    session: SessionDep,
    data: UdalerriaUpdate,
    id: int,
    _admin: Erabiltzailea = Depends(require_admin),
):
    udalerria = session.get(Udalerria, id)
    if udalerria is None:
        raise HTTPException(status_code=404, detail="Udalerria ez da aurkitzen")

    changes = data.model_dump(exclude_unset=True)
    if "izena" in changes and changes["izena"]:
        changes["izena"] = changes["izena"].strip()

    for field, value in changes.items():
        setattr(udalerria, field, value)

    session.commit()
    session.refresh(udalerria)
    return udalerria


@router.delete("/{id}", status_code=200)
def ezabatu_udalerria(
    session: SessionDep,
    id: int,
    _admin: Erabiltzailea = Depends(require_admin),
):
    udalerria = session.get(Udalerria, id)
    if udalerria is None:
        raise HTTPException(status_code=404, detail="Udalerria ez da aurkitzen")

    if udalerria.kargaguneak:
        raise HTTPException(
            status_code=409,
            detail="Udalerriak kargaguneak ditu; desaktibatu edo ezabatu lehenago",
        )

    session.delete(udalerria)
    session.commit()
    return {"message": "Udalerria ezabatu da"}
