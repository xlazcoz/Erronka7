from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from database import get_session
from models.models import Erabiltzailea, Erreserba, Udalerria
from services.auth import (
    get_current_user,
    hash_password,
    is_superadmin,
    require_superadmin,
)
from schemas.schemas import (
    ErabiltzaileaCreate, 
    ErabiltzaileaResponse, 
    ErabiltzaileaUpdate, 
    ErabiltzaileaRolaUpdate, 
    ErreserbakResponse
)

router = APIRouter(prefix="/erabiltzaileak", tags=["Erabiltzaileak"])

SessionDep = Annotated[Session, Depends(get_session)]

ROLAK = {"user", "admin", "superadmin"}


def egiaztatu_baimena(current_user: Erabiltzailea, id: int) -> None:
    if not is_superadmin(current_user) and current_user.id != id:
        raise HTTPException(
            status_code=403,
            detail="Beste erabiltzaile baten datuetan ezin duzu sartu",
        )


def balidatu_rola_udalerria(
    session: Session,
    rola: str,
    udalerria_id: int | None,
) -> int | None:
    if rola not in ROLAK:
        raise HTTPException(
            status_code=422,
            detail="Rolak hauetako bat izan behar du: user, admin, superadmin",
        )

    if rola == "admin":
        if udalerria_id is None:
            raise HTTPException(
                status_code=422,
                detail="Administratzaile udalerri bati lotuta egon behar da",
            )
        udalerri = session.get(Udalerria, udalerria_id)
        if udalerri is None:
            raise HTTPException(status_code=404, detail="Udalerria ez da aurkitzen")
        return udalerria_id

    return None


@router.get("", response_model=list[ErabiltzaileaResponse], status_code=200)
def get_erabiltzaileak(
    session: SessionDep,
    _superadmin: Erabiltzailea = Depends(require_superadmin),
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
    _superadmin: Erabiltzailea = Depends(require_superadmin),
):
    existing_user = session.scalar(
        select(Erabiltzailea).where(Erabiltzailea.login_email == data.login_email)
    )
    if existing_user is not None:
        raise HTTPException(status_code=409, detail="Emaila existitzen da")

    udalerria_id = balidatu_rola_udalerria(session, data.rola, data.udalerria_id)

    erabiltzailea = Erabiltzailea(
        izena=data.izena, 
        abizena=data.abizena, 
        login_email=data.login_email, 
        login_pasahitza=hash_password(data.login_pasahitza), 
        rola=data.rola,
        aktiboa=data.aktiboa,
        udalerria_id=udalerria_id,
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

    if not is_superadmin(current_user) and (
        "rola" in changes or "aktiboa" in changes or "udalerria_id" in changes
    ):
        raise HTTPException(
            status_code=403,
            detail="Ezin duzu zure rola, udalerria edo egoera aldatu",
        )

    if current_user.id == id and changes.get("aktiboa") is False:
        raise HTTPException(
            status_code=403,
            detail="Ezin duzu zeure burua desaktibatu",
        )

    if current_user.id == id:
        new_rola = changes.get("rola", erabiltzailea.rola)
        if erabiltzailea.rola == "superadmin" and new_rola != "superadmin":
            raise HTTPException(
                status_code=403,
                detail="Ezin duzu zeure administratzaile orokor rola kendu",
            )

    if is_superadmin(current_user) and ("rola" in changes or "udalerria_id" in changes):
        new_rola = changes.get("rola", erabiltzailea.rola)
        new_udalerria = changes.get("udalerria_id", erabiltzailea.udalerria_id)
        changes["udalerria_id"] = balidatu_rola_udalerria(
            session, new_rola, new_udalerria
        )
        changes["rola"] = new_rola

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
    current_user: Erabiltzailea = Depends(require_superadmin),
):
    erabiltzailea = session.get(Erabiltzailea, id)
    if not erabiltzailea:
        raise HTTPException(status_code=404, detail="Erabiltzailea ez da aurkitzen")

    if current_user.id == id and erabiltzailea.rola == "superadmin" and data.rola != "superadmin":
        raise HTTPException(
            status_code=403,
            detail="Ezin duzu zeure administratzaile orokor rola kendu",
        )

    udalerria_id = balidatu_rola_udalerria(
        session, data.rola, erabiltzailea.udalerria_id
    )

    erabiltzailea.rola = data.rola
    erabiltzailea.udalerria_id = udalerria_id

    session.commit()
    session.refresh(erabiltzailea)
    return erabiltzailea

@router.delete("/{id}", response_model=ErabiltzaileaResponse, status_code=200)
def ezabatu_erabiltzailea(
    session: SessionDep,
    id: int,
    _superadmin: Erabiltzailea = Depends(require_superadmin),
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
