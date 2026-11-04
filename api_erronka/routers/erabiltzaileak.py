from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from database import get_session
from models.models import Erabiltzailea, Erreserba
from services.auth import get_current_user, hash_password, require_admin
from schemas.schemas import (
    ErabiltzaileaCreate, 
    ErabiltzaileaResponse, 
    ErabiltzaileaUpdate, 
    ErabiltzaileaRolaUpdate, 
    ErreserbakResponse
)

router = APIRouter(prefix="/erabiltzaileak", tags=["Erabiltzaileak"])

SessionDep = Annotated[Session, Depends(get_session)]


def egiaztatu_baimena(current_user: Erabiltzailea, id: int) -> None:
    if current_user.rola != "admin" and current_user.id != id:
        raise HTTPException(
            status_code=403,
            detail="Ezin duzu beste erabiltzaile baten datuetan sartu",
        )


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
    egiaztatu_baimena(current_user, id)
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
    egiaztatu_baimena(current_user, id)
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
    existing_user = session.scalar(
        select(Erabiltzailea).where(Erabiltzailea.login_email == data.login_email)
    )
    if existing_user is not None:
        raise HTTPException(status_code=409, detail="Emaila existitzen da")

    erabiltzailea = Erabiltzailea(
        izena=data.izena, 
        abizena=data.abizena, 
        login_email=data.login_email, 
        login_pasahitza=hash_password(data.login_pasahitza), 
        rola=data.rola
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
    current_user: Erabiltzailea = Depends(get_current_user),
):
    egiaztatu_baimena(current_user, id)

    erabiltzailea = session.get(Erabiltzailea, id)
    if not erabiltzailea:
        raise HTTPException(status_code=404, detail="Erabiltzailea ez da aurkitzen")

    changes = data.model_dump(exclude_unset=True)

    if current_user.rola != "admin" and "rola" in changes:
        raise HTTPException(
            status_code=403,
            detail="Ezin duzu zure rola aldatu",
        )

    new_email = changes.get("login_email")
    if new_email is not None:
        duplicate = session.scalar(
            select(Erabiltzailea).where(
                Erabiltzailea.login_email == new_email,
                Erabiltzailea.id != id,
            )
        )
        if duplicate is not None:
            raise HTTPException(status_code=409, detail="Emaila existitzen da")

    new_password = changes.get("login_pasahitza")
    if new_password is not None:
        if new_password:
            changes["login_pasahitza"] = hash_password(new_password)
        else:
            changes.pop("login_pasahitza")

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

    erabiltzailea.rola = data.rola

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

    erreserba = session.scalar(
        select(Erreserba.id).where(Erreserba.erabiltzailea_id == id).limit(1)
    )
    if erreserba is not None:
        raise HTTPException(
            status_code=409,
            detail="Erabiltzaile honek erreserbak ditu, ezin da ezabatu",
        )

    session.delete(erabiltzailea)
    session.commit()    
    return erabiltzailea