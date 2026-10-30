from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from database import get_session
from models import Erabiltzailea
from schemas import ErabiltzaileaCreate, ErabiltzaileaResponse, ErabiltzaileaUpdate, ErabiltzaileaRolaUpdate, ErabiltzaileaErreserbakResponse

router = APIRouter(prefix="/erabiltzaileak", tags=["Erabiltzaileak"])

SessionDep = Annotated[Session, Depends(get_session)]

@router.get("", response_model=list[ErabiltzaileaResponse], status_code=200)
def get_erabiltzaileak(session: SessionDep):
    stmt = select(Erabiltzailea).order_by(Erabiltzailea.id)
    return session.scalars(stmt).all()

@router.get("/{id}", response_model=ErabiltzaileaResponse, status_code=200)
def get_erabiltzailea_id(session: SessionDep, id: int):
    erabiltzailea = session.get(Erabiltzailea, id)
    if erabiltzailea is None:
        raise HTTPException(status_code=404, detail="Erabiltzailea ez da aurkitzen")
    return erabiltzailea

@router.get("/{id}/erreserben_historikoa", response_model=ErabiltzaileaErreserbakResponse, status_code=200)
def erreserbak_kontsultatu(session: SessionDep, id: int):
    erabiltzailea = session.get(Erabiltzailea, id)
    
    if erabiltzailea is None:
        raise HTTPException(status_code=404, detail="Erabiltzailea ez da aurkitzen")
    return erabiltzailea

@router.post("", response_model=ErabiltzaileaResponse, status_code=201)
def sortu_erabiltzailea(session: SessionDep, data: ErabiltzaileaCreate):
    erabiltzailea = Erabiltzailea(izena=data.izena, abizena=data.abizena, login_email=data.login_email, 
                                  login_pasahitza=data.login_pasahitza, rola=data.rola, erreserben_historikoa=data.erreserben_historikoa)
    session.add(erabiltzailea)
    session.commit()
    session.refresh(erabiltzailea)

    return erabiltzailea

@router.patch("/{id}", response_model=ErabiltzaileaResponse, status_code=200)
def aldatu_erabiltzailea(session: SessionDep, data: ErabiltzaileaUpdate, id: int):
    erabiltzailea = session.get(Erabiltzailea, id)
    changes = data.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(erabiltzailea, field, value)

    session.commit()
    session.refresh(erabiltzailea)

    return erabiltzailea

@router.patch("/{id}/rola", response_model=ErabiltzaileaResponse, status_code=200)
def aldatu_rolak(session: SessionDep, data: ErabiltzaileaRolaUpdate, id: int):
    erabiltzailea = session.get(Erabiltzailea, id)
    erabiltzailea.rola = data.rola

    session.commit()
    session.refresh(erabiltzailea)
    return erabiltzailea

@router.delete("/{id}", response_model=ErabiltzaileaResponse, status_code=200)
def ezabatu_erabiltzailea(session: SessionDep, id: int):
    erabiltzailea = session.get(Erabiltzailea, id)

    if not erabiltzailea:
        raise HTTPException(status_code=404, detail="Erabiltzailea ez da aurkitzen")
    
    session.delete(erabiltzailea)
    session.commit()    
    return erabiltzailea
