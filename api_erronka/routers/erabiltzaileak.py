from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_session
from models.models import Erabiltzailea, Udalerria
from schemas.schemas import (
    ErabiltzaileaCreate,
    ErabiltzaileaResponse,
    ErabiltzaileaUpdate,
    ErabiltzaileaRolaUpdate,
    ErreserbakResponse,
)
from services.auth import get_current_user, hash_password, require_admin

router = APIRouter(prefix="/erabiltzaileak", tags=["Erabiltzaileak"])

SessionDep = Annotated[Session, Depends(get_session)]


def _validate_municipal_role(session: Session, rola: str, udalerria_id: int | None) -> None:
    if rola == "udalerri_admin":
        if udalerria_id is None:
            raise HTTPException(
                status_code=400,
                detail="Udalerri-administratzaileak udalerri bat izan behar du",
            )
        if session.get(Udalerria, udalerria_id) is None:
            raise HTTPException(status_code=404, detail="Udalerria ez da aurkitzen")


@router.get("", response_model=list[ErabiltzaileaResponse], status_code=200)
def get_erabiltzaileak(
    session: SessionDep,
    _admin: Erabiltzailea = Depends(require_admin),
):
    stmt = select(Erabiltzailea).order_by(Erabiltzailea.id)
    return session.scalars(stmt).all()


@router.get("/{id}", response_model=ErabiltzaileaResponse, status_code=200)
def get_erabiltzailea_id(
    session: SessionDep,
    id: int,
    current_user: Erabiltzailea = Depends(get_current_user),
):
    if current_user.rola != "admin" and current_user.id != id:
        raise HTTPException(status_code=403, detail="Ez duzu erabiltzaile hau ikusteko baimenik")

    erabiltzailea = session.get(Erabiltzailea, id)
    if erabiltzailea is None:
        raise HTTPException(status_code=404, detail="Erabiltzailea ez da aurkitzen")
    return erabiltzailea


@router.get("/{id}/erreserbak", response_model=list[ErreserbakResponse], status_code=200)
def erreserbak_kontsultatu(
    session: SessionDep,
    id: int,
    current_user: Erabiltzailea = Depends(get_current_user),
):
    if current_user.rola != "admin" and current_user.id != id:
        raise HTTPException(status_code=403, detail="Ez duzu erreserba hauek ikusteko baimenik")

    erabiltzailea = session.get(Erabiltzailea, id)
    if erabiltzailea is None:
        raise HTTPException(status_code=404, detail="Erabiltzailea ez da aurkitzen")
    return erabiltzailea.erreserbak


@router.post("", response_model=ErabiltzaileaResponse, status_code=201)
def sortu_erabiltzailea(
    session: SessionDep,
    data: ErabiltzaileaCreate,
    _admin: Erabiltzailea = Depends(require_admin),
):
    _validate_municipal_role(session, data.rola, data.udalerria_id)

    erabiltzailea = Erabiltzailea(
        izena=data.izena,
        abizena=data.abizena,
        login_email=data.login_email.strip().lower(),
        login_pasahitza=hash_password(data.login_pasahitza),
        rola=data.rola,
        udalerria_id=data.udalerria_id,
    )
    session.add(erabiltzailea)
    session.commit()
    session.refresh(erabiltzailea)

    return erabiltzailea


@router.patch("/{id}", response_model=ErabiltzaileaResponse, status_code=200)
def aldatu_erabiltzailea(
    session: SessionDep,
    data: ErabiltzaileaUpdate,
    id: int,
    _admin: Erabiltzailea = Depends(require_admin),
):
    erabiltzailea = session.get(Erabiltzailea, id)
    if not erabiltzailea:
        raise HTTPException(status_code=404, detail="Erabiltzailea ez da aurkitzen")

    changes = data.model_dump(exclude_unset=True)
    if "login_pasahitza" in changes:
        if changes["login_pasahitza"]:
            changes["login_pasahitza"] = hash_password(changes["login_pasahitza"])
        else:
            changes.pop("login_pasahitza")
    if "login_email" in changes and changes["login_email"]:
        changes["login_email"] = changes["login_email"].strip().lower()

    _validate_municipal_role(
        session,
        changes.get("rola", erabiltzailea.rola),
        changes.get("udalerria_id", erabiltzailea.udalerria_id),
    )

    for field, value in changes.items():
        setattr(erabiltzailea, field, value)

    session.commit()
    session.refresh(erabiltzailea)

    return erabiltzailea


@router.patch("/{id}/rola", response_model=ErabiltzaileaResponse, status_code=200)
def aldatu_rolak(
    session: SessionDep,
    data: ErabiltzaileaRolaUpdate,
    id: int,
    _admin: Erabiltzailea = Depends(require_admin),
):
    erabiltzailea = session.get(Erabiltzailea, id)
    if not erabiltzailea:
        raise HTTPException(status_code=404, detail="Erabiltzailea ez da aurkitzen")

    _validate_municipal_role(session, data.rola, data.udalerria_id)

    erabiltzailea.rola = data.rola
    erabiltzailea.udalerria_id = data.udalerria_id

    session.commit()
    session.refresh(erabiltzailea)
    return erabiltzailea


@router.delete("/{id}", response_model=ErabiltzaileaResponse, status_code=200)
def ezabatu_erabiltzailea(
    session: SessionDep,
    id: int,
    _admin: Erabiltzailea = Depends(require_admin),
):
    erabiltzailea = session.get(Erabiltzailea, id)

    if not erabiltzailea:
        raise HTTPException(status_code=404, detail="Erabiltzailea ez da aurkitzen")

    if erabiltzailea.erreserbak:
        raise HTTPException(
            status_code=409,
            detail="Erabiltzaileak erreserbak ditu; ezin da ezabatu",
        )

    session.delete(erabiltzailea)
    session.commit()
    return erabiltzailea
