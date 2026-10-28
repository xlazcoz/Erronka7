from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from database import get_session
from models import Erabiltzailea
from schemas import ErabiltzaileaCreate, ErabiltzaileaResponse, ErabiltzaileaUpdate

router = APIRouter(prefix="/erabiltzaileak", tags=["Erabiltzaileak"])

SessionDep = Annotated[Session, Depends(get_session)]

@router.get("", response_model=list[ErabiltzaileaResponse])
def get_erabiltzaileak(session: SessionDep):
    stmt = select(Erabiltzailea)
    return session.scalars(stmt).all()

@router.get("/{id}", response_model=ErabiltzaileaResponse)
def get_erabiltzailea_id(session: SessionDep, id: int):
    erabiltzailea = session.get(Erabiltzailea, id)
    if erabiltzailea is None:
        raise HTTPException(status_code=404, detail="Erabiltzailea ez da aurkitzen")
    return erabiltzailea

@router.post("", response_model=ErabiltzaileaResponse)
def sortu_erabiltzailea(session: SessionDep, data: ErabiltzaileaCreate):
    erabiltzailea = Erabiltzailea(izena=data.izena, abizena=data.abizena, login_erabiltzailea=data.login_erabiltzailea, 
                                  login_pasahitza=data.login_pasahitza, rola=data.rola, erreserben_historikoa=data.erreserben_historikoa)
    session.add(erabiltzailea)
    session.commit()
    session.refresh(erabiltzailea)

    return erabiltzailea

@router.patch("/{id}", response_model=ErabiltzaileaResponse)
def partzialki_aldatu_erabiltzailea(session: SessionDep, data: ErabiltzaileaUpdate):
    pass